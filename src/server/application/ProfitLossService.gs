// アプリケーション層：月次損益（P/L）のユースケース。
// google.script.runの制約により、クライアント公開分はトップレベル関数として定義する
//
// 新しい集計ロジックは持たず、既存の売上集計（SalesStatsService.getSalesStatsData）と
// 経費集計（ExpenseService.getExpenseYearlyData）をそのまま呼び出し、ExpenseCategory.IsCostOfGoods
// で「原価」と「経費」に仕分けて損益の形に組み立てるだけの薄い合成層とする

function getProfitLossData(year) {
  var salesStats = getSalesStatsData('month', String(year));
  var expenseYearly = getExpenseYearlyData(Number(year));

  var costCategoryIds = {};
  ExpenseCategoryRepository.findAll().forEach(function (c) {
    if (c.IsCostOfGoods) { costCategoryIds[c.ExpenseCategoryId] = true; }
  });

  var salesByMonth = {};
  salesStats.items.forEach(function (item) {
    salesByMonth[item.key] = item.amount;
  });

  var months = expenseYearly.months.map(function (m) {
    var cogs = 0;
    var opex = 0;
    Object.keys(m.byCategory).forEach(function (categoryId) {
      var actual = m.byCategory[categoryId].actualAmount;
      if (costCategoryIds[categoryId]) {
        cogs += actual;
      } else {
        opex += actual;
      }
    });
    var sales = salesByMonth[m.month] || 0;
    var grossProfit = sales - cogs;
    return {
      month: m.month,
      label: m.label,
      sales: sales,
      cogs: cogs,
      grossProfit: grossProfit,
      opex: opex,
      operatingProfit: grossProfit - opex
    };
  });

  var totals = months.reduce(function (sum, m) {
    sum.sales += m.sales;
    sum.cogs += m.cogs;
    sum.grossProfit += m.grossProfit;
    sum.opex += m.opex;
    sum.operatingProfit += m.operatingProfit;
    return sum;
  }, { sales: 0, cogs: 0, grossProfit: 0, opex: 0, operatingProfit: 0 });

  return { year: Number(year), months: months, totals: totals };
}
