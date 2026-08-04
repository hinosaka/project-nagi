// アプリケーション層：予算管理（SCR-007）のユースケース。
// google.script.runの制約により、クライアント公開分はトップレベル関数として定義する

function getBudgetData(targetMonth) {
  var target = SalesTargetRepository.findByMonth(targetMonth);
  var targetAmount = target ? Number(target.TargetAmount) || 0 : 0;
  var note = target ? (target.Note || '') : '';

  var actualAmount = SalesRepository.findAll()
    .filter(function (s) { return DateUtil.formatYm(s.SalesDate) === targetMonth; })
    .reduce(function (sum, s) { return sum + (Number(s.TotalAmount) || 0); }, 0);

  var achievementRate = targetAmount > 0 ? Math.round((actualAmount / targetAmount) * 100) : null;

  return {
    targetMonth: targetMonth,
    targetAmount: targetAmount,
    note: note,
    hasTarget: !!target,
    actualAmount: actualAmount,
    achievementRate: achievementRate
  };
}

// 予算管理（新設画面）：対象年の12ヶ月分の目標・実績・達成率を1回の呼び出しでまとめて返す
// （月ごとにgetBudgetDataを呼ぶとSales/SalesTarget全件読み込みが12回発生してしまうため）
function getBudgetDataForYear(year) {
  var targetByMonth = {};
  SalesTargetRepository.findAll().forEach(function (t) {
    targetByMonth[t.TargetMonth] = t;
  });

  var amountByMonth = {};
  SalesRepository.findAll().forEach(function (s) {
    var ym = DateUtil.formatYm(s.SalesDate);
    amountByMonth[ym] = (amountByMonth[ym] || 0) + (Number(s.TotalAmount) || 0);
  });

  var months = [];
  for (var m = 1; m <= 12; m++) {
    var key = year + '-' + ('0' + m).slice(-2);
    var target = targetByMonth[key];
    var targetAmount = target ? Number(target.TargetAmount) || 0 : 0;
    var actualAmount = amountByMonth[key] || 0;
    months.push({
      targetMonth: key,
      targetAmount: targetAmount,
      note: target ? (target.Note || '') : '',
      actualAmount: actualAmount,
      achievementRate: targetAmount > 0 ? Math.round((actualAmount / targetAmount) * 100) : null
    });
  }
  return months;
}

function saveBudgetTarget(input) {
  if (!input || !input.targetMonth) {
    throw new Error('対象年月は必須です');
  }
  var targetAmount = Number(input.targetAmount);
  if (!(targetAmount >= 0)) {
    throw new Error('目標売上には0以上の数値を入力してください');
  }

  SalesTargetRepository.save({
    SalesTargetId: 'TGT-' + input.targetMonth.replace('-', ''),
    TargetMonth: input.targetMonth,
    TargetAmount: targetAmount,
    Note: input.note || ''
  });

  return getBudgetData(input.targetMonth);
}

// 予算管理（編集モード）：対象年の12ヶ月分をまとめて保存する。months: [{targetMonth, targetAmount, note}, ...]
function saveBudgetTargetsForYear(year, months) {
  months.forEach(function (m) {
    var targetAmount = Number(m.targetAmount);
    if (!(targetAmount >= 0)) {
      throw new Error(m.targetMonth + 'の目標売上には0以上の数値を入力してください');
    }
    SalesTargetRepository.save({
      SalesTargetId: 'TGT-' + m.targetMonth.replace('-', ''),
      TargetMonth: m.targetMonth,
      TargetAmount: targetAmount,
      Note: m.note || ''
    });
  });
  return getBudgetDataForYear(year);
}

var JAPAN_HOLIDAY_CALENDAR_ID_ = 'ja.japanese#holiday@group.v.calendar.google.com';

// 日別予算設定（予算管理）：対象月の月目標と、日ごとの明示的な目標（設定されていれば）を返す。
// 明示的な設定がない日はtargetAmountをnullで返す（クライアント側で「均等割付」前の空欄表示に使う）
function getDailyTargetsForMonth(yearMonth) {
  var parts = yearMonth.split('-');
  var year = Number(parts[0]);
  var month = Number(parts[1]);
  var daysInMonth = new Date(year, month, 0).getDate();

  var monthTarget = SalesTargetRepository.findByMonth(yearMonth);
  var monthTargetAmount = monthTarget ? Number(monthTarget.TargetAmount) || 0 : 0;

  var explicitByDate = {};
  DailyTargetRepository.findByMonth(yearMonth).forEach(function (t) {
    explicitByDate[t.TargetDate] = Number(t.TargetAmount) || 0;
  });

  var holidaySet = loadJapaneseHolidaySet_(year, month, daysInMonth);

  var days = [];
  for (var d = 1; d <= daysInMonth; d++) {
    var dateKey = yearMonth + '-' + ('0' + d).slice(-2);
    days.push({
      date: dateKey,
      day: d,
      targetAmount: explicitByDate.hasOwnProperty(dateKey) ? explicitByDate[dateKey] : null,
      isHoliday: !!holidaySet[dateKey]
    });
  }

  return { yearMonth: yearMonth, monthTargetAmount: monthTargetAmount, hasMonthTarget: !!monthTarget, daysInMonth: daysInMonth, days: days };
}

// 日本の祝日（Googleが公開している祝日カレンダー）から対象月の祝日一覧を取得する。
// カレンダーへのアクセス権限が未許可の場合は祝日情報なしで続行する（機能自体は壊さない）。
// CalendarApp.getEvents()は外部カレンダーへの都度アクセスで遅く（日別予算設定の読み込み遅延の主因）、
// かつ祝日は事実上変化しないデータのため、月単位でRepositoryCacheに長時間（6時間＝CacheServiceの上限）キャッシュする
function loadJapaneseHolidaySet_(year, month, daysInMonth) {
  var cacheKey = 'holidaySet:' + year + '-' + ('0' + month).slice(-2);
  var cached = RepositoryCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  var set = {};
  try {
    var start = new Date(year, month - 1, 1);
    var end = new Date(year, month - 1, daysInMonth, 23, 59, 59);
    CalendarApp.getCalendarById(JAPAN_HOLIDAY_CALENDAR_ID_).getEvents(start, end).forEach(function (ev) {
      set[DateUtil.formatYmd(ev.getStartTime())] = true;
    });
  } catch (e) {
    // 権限未許可・カレンダー取得失敗時は祝日なし扱いにする
  }
  RepositoryCache.put(cacheKey, set, 21600);
  return set;
}

// days: [{date, targetAmount}, ...]（targetAmountがnull/未入力の日は保存対象から除外し、
// 既存の明示的設定があれば削除する＝月目標按分へのフォールバックに戻す）
function saveDailyTargetsForMonth(yearMonth, days) {
  var rows = [];
  days.forEach(function (d) {
    if (d.targetAmount === null || d.targetAmount === '' || d.targetAmount === undefined) {
      return;
    }
    var amount = Number(d.targetAmount);
    if (!(amount >= 0)) {
      throw new Error(d.date + 'の目標売上には0以上の数値を入力してください');
    }
    rows.push({ DailyTargetId: 'DT-' + d.date.replace(/-/g, ''), TargetDate: d.date, TargetAmount: amount });
  });
  DailyTargetRepository.replaceMonth(yearMonth, rows);
  return getDailyTargetsForMonth(yearMonth);
}
