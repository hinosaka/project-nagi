// アプリケーション層：ダッシュボード（SCR-006）のユースケース。
// google.script.runの制約により、クライアント公開分はトップレベル関数として定義する
//
// 期間は本日／昨日／過去7日間／当月／期間指定（custom）の5種類。
// 比較対象は期間タブごとに固定（本日・昨日：前日比、過去7日間：前週比、当月：前月比）で
// 選択式ではない。期間指定（custom）は比較対象が定まらないため比較を行わない
// （ユーザーとの合意事項。UI.md 4.5参照）。
// 期間算出・集計ロジック自体はSpreadsheetに依存しないため domain/DashboardAggregator.gs に集約し、
// このファイルはSales/SalesDetail/Seatの読み込みとそこへの委譲のみを行う

function getDashboardData(periodType, referenceDateStr, startDateStr, endDateStr) {
  var allSales = SalesRepository.findAll();
  var allDetails = SalesDetailRepository.findAll();
  var activeSeatCount = SeatRepository.findAll().filter(function (s) { return s.IsActive; }).length;

  var range = DashboardAggregator.periodRange(periodType, referenceDateStr, startDateStr, endDateStr);
  var current = DashboardAggregator.summarizePeriod(allSales, allDetails, range, activeSeatCount);

  var kpis;
  if (periodType === 'custom') {
    kpis = DashboardAggregator.kpiValuesOnly(current);
  } else {
    var compareRange = DashboardAggregator.comparePeriodRange(range);
    var compare = DashboardAggregator.summarizePeriod(allSales, allDetails, compareRange, activeSeatCount);
    kpis = DashboardAggregator.kpiDiffs(current, compare);
  }
  kpis.visitCount.breakdown = DashboardAggregator.newRepeatCounts(allSales, range);

  var graphRange = DashboardAggregator.graphRange(periodType, range);
  var ranking = DashboardAggregator.top10(allDetails, current.salesIdSet);

  return {
    periodLabel: DashboardAggregator.periodLabel(periodType, range),
    kpis: kpis,
    graph: DashboardAggregator.graphData(allSales, graphRange),
    ranking: ranking,
    category: DashboardAggregator.categoryBreakdown(allDetails, current.salesIdSet)
  };
}
