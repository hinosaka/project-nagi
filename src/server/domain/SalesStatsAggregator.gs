// ドメイン層：売上統計（SCR-007, SCR-011）の期間骨組み・集計ロジック（Spreadsheet非依存）。
// 日別／月別／年別の3粒度を共通の形（itemsの配列＋totals）で返す。予算（目標売上）は
// SalesTargetに月単位でのみ登録できるため、日別はその月の目標÷月内日数、年別はその年の
// 月目標の合計を予算として扱う（未登録の月は0として扱い、hasBudgetで区別する）
var SalesStatsAggregator = {
  TAX_DIVISOR: 11, // 消費税率10%・税込表示のため、内消費税＝売上÷11（イートインのみで税率区分なし）
  YEAR_RANGE: 10, // 年別タブで遡る年数

  // 日ごとの目標は、日別予算設定（予算管理）で明示的に設定されていればそれを優先し、
  // 未設定の日は月目標を日数按分した金額にフォールバックする。
  // explicitByDate: {"yyyy-MM-dd": 金額} のMap（DailyTargetの読み込みは呼び出し側で行い、ここには渡すだけにする）
  buildDayItems: function (periodKey, targetByMonth, explicitByDate) {
    var parts = periodKey.split('-');
    var year = Number(parts[0]);
    var month = Number(parts[1]);
    var daysInMonth = new Date(year, month, 0).getDate();
    var monthTarget = targetByMonth[periodKey] || 0;
    var monthHasBudget = monthTarget > 0;
    var fallbackDayTarget = monthHasBudget ? monthTarget / daysInMonth : 0;

    var items = [];
    for (var day = 1; day <= daysInMonth; day++) {
      var dateKey = DateUtil.formatYmd(new Date(year, month - 1, day));
      var hasExplicit = explicitByDate.hasOwnProperty(dateKey);
      items.push({
        key: dateKey,
        label: month + '/' + day,
        start: new Date(year, month - 1, day, 0, 0, 0, 0),
        end: new Date(year, month - 1, day, 23, 59, 59, 999),
        budget: hasExplicit ? explicitByDate[dateKey] : fallbackDayTarget,
        hasBudget: hasExplicit || monthHasBudget
      });
    }
    return items;
  },

  buildMonthItems: function (periodKey, targetByMonth) {
    var year = Number(periodKey);
    var items = [];
    for (var month = 1; month <= 12; month++) {
      var key = year + '-' + ('0' + month).slice(-2);
      var target = targetByMonth[key] || 0;
      items.push({
        key: key,
        label: month + '月',
        start: new Date(year, month - 1, 1, 0, 0, 0, 0),
        end: new Date(year, month, 0, 23, 59, 59, 999),
        budget: target,
        hasBudget: target > 0
      });
    }
    return items;
  },

  buildYearItems: function (targetByMonth) {
    var currentYear = new Date().getFullYear();
    var items = [];
    for (var i = this.YEAR_RANGE - 1; i >= 0; i--) {
      var year = currentYear - i;
      var yearTarget = 0;
      var hasBudget = false;
      for (var month = 1; month <= 12; month++) {
        var key = year + '-' + ('0' + month).slice(-2);
        if (targetByMonth[key]) {
          yearTarget += targetByMonth[key];
          hasBudget = true;
        }
      }
      items.push({
        key: String(year),
        label: year + '年',
        start: new Date(year, 0, 1, 0, 0, 0, 0),
        end: new Date(year, 11, 31, 23, 59, 59, 999),
        budget: yearTarget,
        hasBudget: hasBudget
      });
    }
    return items;
  },

  // items（buildDayItems/buildMonthItems/buildYearItemsの戻り値）にSales/SalesDetailの実績を集計する。
  // keyFnは粒度ごとに異なる日付→itemキーの変換（呼び出し側で選択する）
  populate: function (items, allSales, detailsBySalesId, keyFn) {
    var itemByKey = {};
    items.forEach(function (item) {
      item.amount = 0;
      item.count = 0;
      item.partySize = 0;
      item.foodAmount = 0;
      item.drinkAmount = 0;
      itemByKey[item.key] = item;
    });

    var self = this;
    allSales.forEach(function (s) {
      var item = itemByKey[keyFn(new Date(s.SalesDate))];
      if (!item) {
        return; // 対象期間外（年別タブの表示範囲より前の実績など）
      }
      item.amount += Number(s.TotalAmount) || 0;
      item.count += 1;
      item.partySize += Number(s.PartySize) || 0;
      (detailsBySalesId[s.SalesId] || []).forEach(function (d) {
        var subtotal = Number(d.Subtotal) || 0;
        if (d.CategoryLarge === 'フード') {
          item.foodAmount += subtotal;
        } else if (d.CategoryLarge === 'ドリンク') {
          item.drinkAmount += subtotal;
        }
      });
    });

    items.forEach(function (item) {
      item.tax = Math.round(item.amount / self.TAX_DIVISOR);
      item.avgAmount = item.count > 0 ? Math.round(item.amount / item.count) : 0;
      delete item.start;
      delete item.end;
    });
    return items;
  },

  sumItems: function (items) {
    var totals = { amount: 0, tax: 0, count: 0, partySize: 0, foodAmount: 0, drinkAmount: 0, budget: 0, hasBudget: false };
    items.forEach(function (item) {
      totals.amount += item.amount;
      totals.tax += item.tax;
      totals.count += item.count;
      totals.partySize += item.partySize;
      totals.foodAmount += item.foodAmount;
      totals.drinkAmount += item.drinkAmount;
      if (item.hasBudget) {
        totals.budget += item.budget;
        totals.hasBudget = true;
      }
    });
    totals.avgAmount = totals.count > 0 ? Math.round(totals.amount / totals.count) : 0;
    return totals;
  }
};
