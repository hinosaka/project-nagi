// アプリケーション層：曜日別分析（データ分析画面の「曜日別分析」タブ）のユースケース。
// google.script.runの制約により、クライアント公開分はトップレベル関数として定義する
// 期間の算出（日次／週次／月次／期間指定）はdomain/PeriodRangeCalculator.gsを共用する。
// 集計ロジック自体はdomain/DayOfWeekAggregator.gsに集約し、このファイルはSales/SalesDetailの
// 読み込みとそこへの委譲のみを行う

function getDayAnalysisData(periodType, referenceDateStr, startDateStr, endDateStr) {
  var range = PeriodRangeCalculator.resolve(periodType, referenceDateStr, startDateStr, endDateStr);
  var salesInRange = SalesRepository.findAll().filter(function (s) {
    var d = new Date(s.SalesDate);
    return d >= range.start && d <= range.end;
  });

  var dayStats = DayOfWeekAggregator.aggregate(salesInRange, SalesDetailRepository.findAll());

  return { periodLabel: range.label, dayStats: dayStats };
}
