// アプリケーション層：売上統計（SCR-007, SCR-011を統合）のユースケース。
// google.script.runの制約により、クライアント公開分はトップレベル関数として定義する
//
// 日別／月別／年別の3粒度を共通の形（itemsの配列＋totals）で返す。予算（目標売上）は
// SalesTargetに月単位でのみ登録できるため、日別はその月の目標÷月内日数、年別はその年の
// 月目標の合計を予算として扱う（未登録の月は0として扱い、hasBudgetで区別する）。
// 期間ラベルや「本日まで」等の表示文言はUI層（sales-stats.html）側で組み立てる

var SALES_STATS_TAX_DIVISOR_ = 11; // 消費税率10%・税込表示のため、内消費税＝売上÷11（イートインのみで税率区分なし）
var SALES_STATS_YEAR_RANGE_ = 10; // 年別タブで遡る年数

function getSalesStatsData(unit, periodKey) {
  var allSales = SalesRepository.findAll();
  var allDetails = SalesDetailRepository.findAll();
  var detailsBySalesId = {};
  allDetails.forEach(function (d) {
    if (!detailsBySalesId[d.SalesId]) {
      detailsBySalesId[d.SalesId] = [];
    }
    detailsBySalesId[d.SalesId].push(d);
  });

  var targetByMonth = {};
  SalesTargetRepository.findAll().forEach(function (t) {
    targetByMonth[t.TargetMonth] = Number(t.TargetAmount) || 0;
  });

  var items;
  var keyFn;
  if (unit === 'month') {
    items = buildSalesStatsMonthItems_(periodKey, targetByMonth);
    keyFn = function (d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2); };
  } else if (unit === 'year') {
    items = buildSalesStatsYearItems_(targetByMonth);
    keyFn = function (d) { return String(d.getFullYear()); };
  } else {
    items = buildSalesStatsDayItems_(periodKey, targetByMonth);
    keyFn = function (d) { return DateUtil.formatYmd(d); };
  }

  var itemByKey = {};
  items.forEach(function (item) {
    item.amount = 0;
    item.count = 0;
    item.foodAmount = 0;
    item.drinkAmount = 0;
    itemByKey[item.key] = item;
  });

  allSales.forEach(function (s) {
    var item = itemByKey[keyFn(new Date(s.SalesDate))];
    if (!item) {
      return; // 対象期間外（年別タブの表示範囲より前の実績など）
    }
    item.amount += Number(s.TotalAmount) || 0;
    item.count += 1;
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
    item.tax = Math.round(item.amount / SALES_STATS_TAX_DIVISOR_);
    item.avgAmount = item.count > 0 ? Math.round(item.amount / item.count) : 0;
    delete item.start;
    delete item.end;
  });

  return { unit: unit, periodKey: periodKey, items: items, totals: sumSalesStatsItems_(items) };
}

// ----- 各粒度のアイテムの骨組み（key・label・集計対象期間・予算）を作る -----

function buildSalesStatsDayItems_(periodKey, targetByMonth) {
  var parts = periodKey.split('-');
  var year = Number(parts[0]);
  var month = Number(parts[1]);
  var daysInMonth = new Date(year, month, 0).getDate();
  var monthTarget = targetByMonth[periodKey] || 0;
  var hasBudget = monthTarget > 0;
  var dayTarget = hasBudget ? monthTarget / daysInMonth : 0;

  var items = [];
  for (var day = 1; day <= daysInMonth; day++) {
    items.push({
      key: DateUtil.formatYmd(new Date(year, month - 1, day)),
      label: month + '/' + day,
      start: new Date(year, month - 1, day, 0, 0, 0, 0),
      end: new Date(year, month - 1, day, 23, 59, 59, 999),
      budget: dayTarget,
      hasBudget: hasBudget
    });
  }
  return items;
}

function buildSalesStatsMonthItems_(periodKey, targetByMonth) {
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
}

function buildSalesStatsYearItems_(targetByMonth) {
  var currentYear = new Date().getFullYear();
  var items = [];
  for (var i = SALES_STATS_YEAR_RANGE_ - 1; i >= 0; i--) {
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
}

// ----- 合計行 -----

function sumSalesStatsItems_(items) {
  var totals = { amount: 0, tax: 0, count: 0, foodAmount: 0, drinkAmount: 0, budget: 0, hasBudget: false };
  items.forEach(function (item) {
    totals.amount += item.amount;
    totals.tax += item.tax;
    totals.count += item.count;
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
