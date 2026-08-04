// アプリケーション層：商品統計（SCR-008）のユースケース。
// google.script.runの制約により、クライアント公開分はトップレベル関数として定義する
//
// 期間別（日次／週次／期間指定）・月別・年別の3種類の粒度に対応する。
// 日次／週次／月次／期間指定の範囲算出はdomain/PeriodRangeCalculator.gsを共用し、
// 年別のみこのファイル内で算出する。集計ロジック自体はdomain/ProductAnalysisAggregator.gsに
// 集約し、このファイルはSales/SalesDetailの読み込みとそこへの委譲のみを行う

function getProductAnalysisData(periodType, referenceDateStr, startDateStr, endDateStr) {
  var range = resolveProductAnalysisRange_(periodType, referenceDateStr, startDateStr, endDateStr);

  var salesInRange = SalesRepository.findAll().filter(function (s) {
    var d = new Date(s.SalesDate);
    return d >= range.start && d <= range.end;
  });
  var salesIdSet = {};
  salesInRange.forEach(function (s) { salesIdSet[s.SalesId] = true; });

  var agg = ProductAnalysisAggregator.aggregate(salesIdSet, SalesDetailRepository.findAll());

  var foldedProducts = ProductAnalysisAggregator.foldTop5(agg.products, null, '品');
  var foldedCategories = ProductAnalysisAggregator.foldTop5(agg.categories, 'その他', '分類');

  return {
    periodLabel: range.label,
    productPie: foldedProducts.map(function (r) { return { name: r.name, amount: r.amount }; }),
    categoryPie: foldedCategories.map(function (r) { return { name: r.name, amount: r.amount }; }),
    // 表は円グラフ（上位5件＋その他）とは独立させ、1件でも注文があった全商品／全カテゴリを表示する
    productTable: ProductAnalysisAggregator.toTableRows(agg.products, agg.totalAmount),
    categoryTable: ProductAnalysisAggregator.toTableRows(agg.categories, agg.totalAmount)
  };
}

// ----- 期間の算出 -----

function resolveProductAnalysisRange_(periodType, referenceDateStr, startDateStr, endDateStr) {
  if (periodType === 'year') {
    var refDate = new Date(referenceDateStr);
    var yearStart = new Date(refDate.getFullYear(), 0, 1);
    var yearEnd = new Date(refDate.getFullYear(), 11, 31);
    yearEnd.setHours(23, 59, 59, 999);
    return { start: yearStart, end: yearEnd, label: refDate.getFullYear() + '年' };
  }
  // day／week／month／customはdomain/PeriodRangeCalculator.gsを共用
  return PeriodRangeCalculator.resolve(periodType, referenceDateStr, startDateStr, endDateStr);
}
