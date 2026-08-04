// アプリケーション層：ABC分析（データ分析画面の「ABC分析」タブ）のユースケース。
// google.script.runの制約により、クライアント公開分はトップレベル関数として定義する
// 期間の算出（日次／週次／月次／期間指定）はdomain/PeriodRangeCalculator.gsを共用する。
// 分類ロジック自体はdomain/AbcClassifier.gsに集約し、このファイルはSales/SalesDetail/Categoryの
// 読み込みとそこへの委譲のみを行う

function getAbcAnalysisData(periodType, referenceDateStr, startDateStr, endDateStr, axis, categoryFilter) {
  var range = PeriodRangeCalculator.resolve(periodType, referenceDateStr, startDateStr, endDateStr);
  var salesInRange = SalesRepository.findAll().filter(function (s) {
    var d = new Date(s.SalesDate);
    return d >= range.start && d <= range.end;
  });
  var salesIdSet = {};
  salesInRange.forEach(function (s) { salesIdSet[s.SalesId] = true; });

  var withRank = AbcClassifier.classify(salesIdSet, SalesDetailRepository.findAll(), axis, categoryFilter);

  return {
    periodLabel: range.label,
    categories: CategoryRepository.findAll().map(function (c) { return c.CategoryName; }),
    rows: withRank
  };
}
