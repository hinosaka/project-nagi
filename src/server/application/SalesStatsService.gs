// アプリケーション層：売上統計（SCR-007, SCR-011を統合）のユースケース。
// google.script.runの制約により、クライアント公開分はトップレベル関数として定義する
//
// 期間の骨組み・集計ロジック自体はSpreadsheetに依存しないためdomain/SalesStatsAggregator.gsに
// 集約し、このファイルはSales/SalesDetail/SalesTarget/DailyTargetの読み込みとそこへの委譲のみを行う。
// 期間ラベルや「本日まで」等の表示文言はUI層（sales-stats.html）側で組み立てる

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
    items = SalesStatsAggregator.buildMonthItems(periodKey, targetByMonth);
    keyFn = function (d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2); };
  } else if (unit === 'year') {
    items = SalesStatsAggregator.buildYearItems(targetByMonth);
    keyFn = function (d) { return String(d.getFullYear()); };
  } else {
    var explicitByDate = {};
    DailyTargetRepository.findByMonth(periodKey).forEach(function (t) {
      explicitByDate[t.TargetDate] = Number(t.TargetAmount) || 0;
    });
    items = SalesStatsAggregator.buildDayItems(periodKey, targetByMonth, explicitByDate);
    keyFn = function (d) { return DateUtil.formatYmd(d); };
  }

  SalesStatsAggregator.populate(items, allSales, detailsBySalesId, keyFn);

  return { unit: unit, periodKey: periodKey, items: items, totals: SalesStatsAggregator.sumItems(items) };
}
