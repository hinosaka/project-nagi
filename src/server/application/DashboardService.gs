// アプリケーション層：ダッシュボード（SCR-006）のユースケース。
// google.script.runの制約により、クライアント公開分はトップレベル関数として定義する
//
// 期間は本日／昨日／過去7日間／当月／期間指定（custom）の5種類。
// 差分基準（前日比／前週同曜日比／前月同日比）は単日のときのみ適用し、複数日の期間は常に
// 「直前の同じ長さの期間」と比較する（ユーザーとの合意事項。UI.md 4.5参照）

var DASHBOARD_KPI_LABELS_ = {
  totalAmount: '売上高',
  perPersonAmount: '客単価',
  totalPartySize: '合計客数',
  visitCount: '合計組数',
  turnoverRate: '客席回転率'
};

function getDashboardData(periodType, referenceDateStr, startDateStr, endDateStr, compareBasis) {
  var allSales = SalesRepository.findAll();
  var allDetails = SalesDetailRepository.findAll();
  var activeSeatCount = SeatRepository.findAll().filter(function (s) { return s.IsActive; }).length;

  var range = calcDashboardPeriodRange_(periodType, referenceDateStr, startDateStr, endDateStr);
  var compareRange = calcDashboardComparePeriodRange_(range, compareBasis);

  var current = summarizeDashboardPeriod_(allSales, allDetails, range, activeSeatCount);
  var compare = summarizeDashboardPeriod_(allSales, allDetails, compareRange, activeSeatCount);
  var kpis = buildDashboardKpiDiffs_(current, compare);
  kpis.visitCount.breakdown = calcDashboardNewRepeatCounts_(allSales, range);

  var graphRange = buildDashboardGraphRange_(periodType, range);
  var ranking = buildDashboardTop10_(allDetails, current.salesIdSet);

  var historicalTip = current.visitCount === 0 && range.dayCount === 1
    ? buildDashboardHistoricalTip_(allSales, allDetails, range)
    : null;

  // 一言アドバイス：事実の抽出（集計・比較）はここで行い、文章化はDashboardAdviceEngine（ドメイン層）に委ねる
  var productTrend = ranking.length > 0 ? calcDashboardProductTrend_(allDetails, current.salesIdSet, compare.salesIdSet) : null;
  var weekdayPattern = (range.dayCount === 1 && ranking.length > 0)
    ? calcDashboardWeekdayPattern_(allSales, DayOfWeekRule.fromDate(range.start))
    : null;
  var advice = DashboardAdviceEngine.generate({
    kpis: kpis,
    ranking: ranking,
    newRepeat: kpis.visitCount.breakdown,
    productTrend: productTrend,
    weekdayPattern: weekdayPattern,
    historicalTip: historicalTip
  });

  return {
    periodLabel: buildDashboardPeriodLabel_(periodType, range),
    isSingleDay: range.dayCount === 1,
    kpis: kpis,
    graph: buildDashboardGraphData_(allSales, graphRange),
    ranking: ranking,
    category: buildDashboardCategoryBreakdown_(allDetails, current.salesIdSet),
    advice: advice
  };
}

// ----- 一言アドバイス用の事実抽出 -----

// 商品ごとの現在期間／比較期間の販売数量を比べ、最も変化率の大きい商品を1件返す（閾値未満はnull）
function calcDashboardProductTrend_(allDetails, currentSalesIdSet, compareSalesIdSet) {
  var currentQty = {};
  var compareQty = {};
  allDetails.forEach(function (d) {
    if (!d.MenuName) {
      return;
    }
    if (currentSalesIdSet[d.SalesId]) {
      currentQty[d.MenuName] = (currentQty[d.MenuName] || 0) + (Number(d.Quantity) || 0);
    }
    if (compareSalesIdSet[d.SalesId]) {
      compareQty[d.MenuName] = (compareQty[d.MenuName] || 0) + (Number(d.Quantity) || 0);
    }
  });

  var candidates = Object.keys(currentQty).map(function (name) {
    var current = currentQty[name];
    var base = compareQty[name] || 0;
    var diffPercent = base > 0 ? Math.round(((current - base) / base) * 100) : null;
    return { name: name, current: current, diffPercent: diffPercent };
  }).filter(function (c) {
    return c.diffPercent !== null &&
      c.current >= DASHBOARD_ADVICE_THRESHOLDS_.productMinQuantity &&
      Math.abs(c.diffPercent) >= DASHBOARD_ADVICE_THRESHOLDS_.productDiffPercent;
  });

  candidates.sort(function (a, b) { return Math.abs(b.diffPercent) - Math.abs(a.diffPercent); });
  return candidates[0] || null;
}

// 対象曜日の客単価が、全曜日平均と比べて際立って高い／低いかを判定する（単日選択時のみ使用）
function calcDashboardWeekdayPattern_(allSales, targetWeekday) {
  var targetAmount = 0;
  var targetPartySize = 0;
  var overallAmount = 0;
  var overallPartySize = 0;

  allSales.forEach(function (s) {
    var amount = Number(s.TotalAmount) || 0;
    var partySize = Number(s.PartySize) || 0;
    overallAmount += amount;
    overallPartySize += partySize;
    if (DayOfWeekRule.fromDate(s.SalesDate) === targetWeekday) {
      targetAmount += amount;
      targetPartySize += partySize;
    }
  });

  if (targetPartySize <= 0 || overallPartySize <= 0) {
    return null;
  }
  var targetPerPerson = targetAmount / targetPartySize;
  var overallPerPerson = overallAmount / overallPartySize;
  var diffPercent = Math.round(((targetPerPerson - overallPerPerson) / overallPerPerson) * 100);
  if (Math.abs(diffPercent) < DASHBOARD_ADVICE_THRESHOLDS_.weekdayDiffPercent) {
    return null;
  }
  return { weekday: targetWeekday, diffPercent: diffPercent };
}

// 会計組数のうち新規／リピートの内訳。新規／リピートの判定はCustomerAnalysisService.gsの
// buildVisitRankBySalesId_（全期間の来店順を都度算出する方式）を共用する
function calcDashboardNewRepeatCounts_(allSales, range) {
  var visitRankBySalesId = buildVisitRankBySalesId_(allSales);
  var newCount = 0;
  var repeatCount = 0;
  allSales.forEach(function (s) {
    var d = new Date(s.SalesDate);
    if (d < range.start || d > range.end || !s.CustomerId) {
      return;
    }
    if (visitRankBySalesId[s.SalesId] === 1) {
      newCount++;
    } else {
      repeatCount++;
    }
  });
  return { newCount: newCount, repeatCount: repeatCount };
}

// 当該期間に会計データが無い場合（単日選択時のみ）、直近の同じ曜日（最大8回分）の実績から
// 一言アドバイスを組み立てる。本日の来店・仕込みの見込みを立てる参考情報として提示する
function buildDashboardHistoricalTip_(allSales, allDetails, range) {
  var targetDayOfWeek = DayOfWeekRule.fromDate(range.start);

  var dateKeySet = {};
  allSales.forEach(function (s) {
    var d = new Date(s.SalesDate);
    if (d >= range.start) {
      return;
    }
    if (DayOfWeekRule.fromDate(d) === targetDayOfWeek) {
      dateKeySet[DateUtil.formatYmd(d)] = true;
    }
  });
  var recentDateKeys = Object.keys(dateKeySet).sort().reverse().slice(0, 8);
  if (recentDateKeys.length === 0) {
    return null;
  }
  var recentDateKeySet = {};
  recentDateKeys.forEach(function (k) { recentDateKeySet[k] = true; });

  var relevantSales = allSales.filter(function (s) {
    return recentDateKeySet[DateUtil.formatYmd(s.SalesDate)];
  });
  var relevantSalesIdSet = {};
  var totalAmount = 0;
  var totalPartySize = 0;
  relevantSales.forEach(function (s) {
    relevantSalesIdSet[s.SalesId] = true;
    totalAmount += Number(s.TotalAmount) || 0;
    totalPartySize += Number(s.PartySize) || 0;
  });

  var dayCount = recentDateKeys.length;
  var avgAmount = Math.round(totalAmount / dayCount);
  var avgPartySize = Math.round(totalPartySize / dayCount);
  var avgVisitCount = Math.round((relevantSales.length / dayCount) * 10) / 10;

  var qtyByMenu = {};
  allDetails.forEach(function (d) {
    if (!relevantSalesIdSet[d.SalesId] || !d.MenuName) {
      return;
    }
    qtyByMenu[d.MenuName] = (qtyByMenu[d.MenuName] || 0) + (Number(d.Quantity) || 0);
  });
  var topMenuName = null;
  var topQty = 0;
  Object.keys(qtyByMenu).forEach(function (name) {
    if (qtyByMenu[name] > topQty) {
      topQty = qtyByMenu[name];
      topMenuName = name;
    }
  });

  var text = '過去' + dayCount + '回の' + targetDayOfWeek + '曜日は、平均' + avgVisitCount + '組・' + avgPartySize + '人の来店で、売上は平均¥' + avgAmount.toLocaleString() + 'でした。';
  if (topMenuName) {
    text += '人気商品は「' + topMenuName + '」でした。仕込みの参考にしてください。';
  }
  return { text: text, sentiment: 'neutral' };
}

// ----- 期間の算出 -----

// referenceDateStrはクライアント側で各タブの粒度に応じてすでに実際の対象日へシフト済みの値を渡す
// （本日／昨日：対象日そのもの、過去7日間：対象日を末日とする7日間、当月：対象日が属する月）
function calcDashboardPeriodRange_(periodType, referenceDateStr, startDateStr, endDateStr) {
  var refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();
  refDate.setHours(0, 0, 0, 0);
  var start;
  var end;

  if (periodType === 'last7') {
    end = new Date(refDate);
    start = new Date(refDate);
    start.setDate(start.getDate() - 6);
  } else if (periodType === 'month') {
    start = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
    end = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);
  } else if (periodType === 'custom') {
    start = new Date(startDateStr);
    end = new Date(endDateStr);
  } else {
    start = new Date(refDate);
    end = new Date(refDate);
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  var msPerDay = 24 * 60 * 60 * 1000;
  var startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  var endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  var dayCount = Math.round((endDateOnly - startDateOnly) / msPerDay) + 1;

  return { start: start, end: end, dayCount: dayCount };
}

// 単日のときのみcompareBasisに従ってシフトする。複数日のときは常に「直前の同じ長さの期間」と比較する
function calcDashboardComparePeriodRange_(range, compareBasis) {
  var start;
  var end;

  if (range.dayCount === 1) {
    if (compareBasis === 'prevMonth') {
      start = new Date(range.start.getFullYear(), range.start.getMonth() - 1, range.start.getDate());
    } else {
      var shiftDays = compareBasis === 'prevWeek' ? 7 : 1;
      start = new Date(range.start);
      start.setDate(start.getDate() - shiftDays);
    }
    end = new Date(start);
  } else {
    end = new Date(range.start);
    end.setDate(end.getDate() - 1);
    start = new Date(end);
    start.setDate(start.getDate() - (range.dayCount - 1));
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start: start, end: end };
}

// 単日・当月選択時はその月の全日数、過去7日間はその7日間、期間指定はその期間を含む過去28日間をグラフ範囲にする
function buildDashboardGraphRange_(periodType, range) {
  if (range.dayCount === 1 || periodType === 'month') {
    var monthStart = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
    var monthEnd = new Date(range.start.getFullYear(), range.start.getMonth() + 1, 0);
    monthEnd.setHours(23, 59, 59, 999);
    return { start: monthStart, end: monthEnd };
  }
  if (periodType === 'custom') {
    var contextStart = new Date(range.end);
    contextStart.setDate(contextStart.getDate() - 27);
    contextStart.setHours(0, 0, 0, 0);
    return { start: contextStart, end: range.end };
  }
  return range;
}

function dashboardFullDate_(d) {
  var mm = ('0' + (d.getMonth() + 1)).slice(-2);
  var dd = ('0' + d.getDate()).slice(-2);
  return d.getFullYear() + '年' + mm + '月' + dd + '日';
}

// 集計対象日の表示。単日は日付＋曜日（例：2026年07月31日　金）、当月は年月、それ以外は範囲表示
function buildDashboardPeriodLabel_(periodType, range) {
  if (range.dayCount === 1) {
    return dashboardFullDate_(range.start) + '　' + DayOfWeekRule.fromDate(range.start);
  }
  if (periodType === 'month') {
    return range.start.getFullYear() + '年' + ('0' + (range.start.getMonth() + 1)).slice(-2) + '月';
  }
  return dashboardFullDate_(range.start) + ' 〜 ' + dashboardFullDate_(range.end);
}

// ----- 集計 -----

function summarizeDashboardPeriod_(allSales, allDetails, range, activeSeatCount) {
  var salesIdSet = {};
  var totalAmount = 0;
  var totalPartySize = 0;

  var salesInRange = allSales.filter(function (s) {
    var d = new Date(s.SalesDate);
    return d >= range.start && d <= range.end;
  });
  salesInRange.forEach(function (s) {
    totalAmount += Number(s.TotalAmount) || 0;
    totalPartySize += Number(s.PartySize) || 0;
    salesIdSet[s.SalesId] = true;
  });

  var foodAmount = 0;
  var drinkAmount = 0;
  allDetails.forEach(function (d) {
    if (!salesIdSet[d.SalesId]) {
      return;
    }
    var subtotal = Number(d.Subtotal) || 0;
    if (d.CategoryLarge === 'フード') {
      foodAmount += subtotal;
    } else if (d.CategoryLarge === 'ドリンク') {
      drinkAmount += subtotal;
    }
  });

  var visitCount = salesInRange.length;
  return {
    totalAmount: totalAmount,
    foodAmount: foodAmount,
    drinkAmount: drinkAmount,
    perPersonAmount: totalPartySize > 0 ? Math.round(totalAmount / totalPartySize) : 0,
    totalPartySize: totalPartySize,
    visitCount: visitCount,
    turnoverRate: activeSeatCount > 0 ? Math.round((visitCount / activeSeatCount) * 100) / 100 : 0,
    salesIdSet: salesIdSet
  };
}

function dashboardPctDiff_(current, base) {
  if (!base) {
    return null;
  }
  return Math.round(((current - base) / base) * 1000) / 10;
}

function dashboardDiffAmount_(current, base) {
  return Math.round((current - base) * 100) / 100;
}

function buildDashboardKpiDiffs_(current, compare) {
  var kpis = {};
  Object.keys(DASHBOARD_KPI_LABELS_).forEach(function (key) {
    kpis[key] = {
      value: current[key],
      diffAmount: dashboardDiffAmount_(current[key], compare[key]),
      diffPercent: dashboardPctDiff_(current[key], compare[key])
    };
  });
  kpis.foodAmount = { value: current.foodAmount, diffAmount: dashboardDiffAmount_(current.foodAmount, compare.foodAmount), diffPercent: dashboardPctDiff_(current.foodAmount, compare.foodAmount) };
  kpis.drinkAmount = { value: current.drinkAmount, diffAmount: dashboardDiffAmount_(current.drinkAmount, compare.drinkAmount), diffPercent: dashboardPctDiff_(current.drinkAmount, compare.drinkAmount) };
  return kpis;
}

function buildDashboardGraphData_(allSales, graphRange) {
  var amountByDate = {};
  allSales.forEach(function (s) {
    var d = new Date(s.SalesDate);
    if (d < graphRange.start || d > graphRange.end) {
      return;
    }
    var key = DateUtil.formatYmd(d);
    amountByDate[key] = (amountByDate[key] || 0) + (Number(s.TotalAmount) || 0);
  });

  var days = [];
  var cursor = new Date(graphRange.start.getFullYear(), graphRange.start.getMonth(), graphRange.start.getDate());
  var endDateOnly = new Date(graphRange.end.getFullYear(), graphRange.end.getMonth(), graphRange.end.getDate());
  while (cursor <= endDateOnly) {
    var key = DateUtil.formatYmd(cursor);
    days.push({ date: key, day: cursor.getDate(), amount: amountByDate[key] || 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

function buildDashboardTop10_(allDetails, salesIdSet) {
  var totals = {};
  var order = [];
  allDetails.forEach(function (d) {
    if (!salesIdSet[d.SalesId] || !d.MenuName) {
      return;
    }
    if (totals[d.MenuName] === undefined) {
      totals[d.MenuName] = 0;
      order.push(d.MenuName);
    }
    totals[d.MenuName] += Number(d.Quantity) || 0;
  });

  return order
    .map(function (name) { return { MenuName: name, quantity: totals[name] }; })
    .sort(function (a, b) { return b.quantity - a.quantity; })
    .slice(0, 10)
    .map(function (item, i) { return { rank: i + 1, MenuName: item.MenuName, quantity: item.quantity }; });
}

// 上位5件＋「その他」（6件を超える場合）に畳む。CategoryMediumが空欄の明細は元々「その他」に集計される
function dashboardFoldToOther_(map) {
  var list = Object.keys(map).map(function (name) { return { name: name, amount: map[name] }; });
  list.sort(function (a, b) { return b.amount - a.amount; });

  var explicitOtherAmount = 0;
  var named = list.filter(function (it) {
    if (it.name === 'その他') {
      explicitOtherAmount += it.amount;
      return false;
    }
    return true;
  });

  var visible = named.slice(0, 5);
  var overflowAmount = named.slice(5).reduce(function (sum, it) { return sum + it.amount; }, 0) + explicitOtherAmount;
  if (overflowAmount > 0) {
    visible = visible.concat([{ name: 'その他', amount: overflowAmount }]);
  }
  return visible;
}

function buildDashboardCategoryBreakdown_(allDetails, salesIdSet) {
  var large = { 'フード': 0, 'ドリンク': 0 };
  var mediumByLarge = { 'フード': {}, 'ドリンク': {} };

  allDetails.forEach(function (d) {
    if (!salesIdSet[d.SalesId]) {
      return;
    }
    var cat = d.CategoryLarge;
    if (cat !== 'フード' && cat !== 'ドリンク') {
      return;
    }
    var subtotal = Number(d.Subtotal) || 0;
    large[cat] += subtotal;
    var medium = d.CategoryMedium || 'その他';
    mediumByLarge[cat][medium] = (mediumByLarge[cat][medium] || 0) + subtotal;
  });

  return {
    large: [
      { name: 'ドリンク', amount: large['ドリンク'] },
      { name: 'フード', amount: large['フード'] }
    ],
    drink: dashboardFoldToOther_(mediumByLarge['ドリンク']),
    food: dashboardFoldToOther_(mediumByLarge['フード'])
  };
}

// 差分の絶対値が最大のKPIと、TOP10の1位商品を組み合わせた一言アドバイス（初版。実機確認後に調整前提）
// 週次は月曜始まり（日本の業務慣行に合わせる）。月次は暦月（1日〜末日）
// 他画面（商品分析・顧客分析・曜日天候座席分析）と共用する日次／週次／月次の期間算出
function calcPeriodRange_(periodType, refDate) {
  var start;
  var end;
  var label;

  if (periodType === 'week') {
    var day = refDate.getDay();
    var diffToMonday = (day === 0 ? -6 : 1 - day);
    start = new Date(refDate);
    start.setDate(refDate.getDate() + diffToMonday);
    end = new Date(start);
    end.setDate(start.getDate() + 6);
    label = DateUtil.formatDisplay(start) + ' 〜 ' + DateUtil.formatDisplay(end);
  } else if (periodType === 'month') {
    start = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
    end = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);
    label = refDate.getFullYear() + '年' + (refDate.getMonth() + 1) + '月';
  } else {
    start = new Date(refDate);
    end = new Date(refDate);
    label = DateUtil.formatDisplay(refDate);
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start: start, end: end, label: label };
}

// 日次／週次／月次はcalcPeriodRange_を共用し、期間指定（custom）のみここで算出する
// （商品統計・データ分析で共通。年別など画面固有の粒度は各画面側で個別に算出する）
function resolvePeriodRange_(periodType, referenceDateStr, startDateStr, endDateStr) {
  if (periodType === 'custom') {
    var start = new Date(startDateStr);
    var end = new Date(endDateStr);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start: start, end: end, label: DateUtil.formatDisplay(start) + ' 〜 ' + DateUtil.formatDisplay(end) };
  }
  return calcPeriodRange_(periodType, new Date(referenceDateStr));
}
