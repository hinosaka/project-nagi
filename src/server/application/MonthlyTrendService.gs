// アプリケーション層：月次推移・比較（SCR-011）のユースケース。
// google.script.runの制約により、クライアント公開分はトップレベル関数として定義する
// formatYearMonth_はBudgetService.gsで定義したものを共用する

function getMonthlyTrendData(targetMonth) {
  var amountByMonth = {};
  SalesRepository.findAll().forEach(function (s) {
    var ym = formatYearMonth_(s.SalesDate);
    amountByMonth[ym] = (amountByMonth[ym] || 0) + (Number(s.TotalAmount) || 0);
  });

  var targetAmount = amountByMonth[targetMonth] || 0;
  var prevMonth = shiftYearMonth_(targetMonth, -1);
  var prevAmount = amountByMonth[prevMonth] || 0;
  var lastYearMonth = shiftYearMonth_(targetMonth, -12);
  var lastYearAmount = amountByMonth[lastYearMonth] || 0;

  var trend = [];
  for (var i = 11; i >= 0; i--) {
    var ym = shiftYearMonth_(targetMonth, -i);
    trend.push({ month: ym, amount: amountByMonth[ym] || 0 });
  }

  return {
    targetMonth: targetMonth,
    targetAmount: targetAmount,
    prevMonth: prevMonth,
    prevAmount: prevAmount,
    momRate: prevAmount > 0 ? Math.round(((targetAmount - prevAmount) / prevAmount) * 1000) / 10 : null,
    lastYearMonth: lastYearMonth,
    lastYearAmount: lastYearAmount,
    yoyRate: lastYearAmount > 0 ? Math.round(((targetAmount - lastYearAmount) / lastYearAmount) * 1000) / 10 : null,
    trend: trend
  };
}

function shiftYearMonth_(yearMonth, diffMonths) {
  var parts = yearMonth.split('-');
  var d = new Date(Number(parts[0]), Number(parts[1]) - 1 + diffMonths, 1);
  var mm = ('0' + (d.getMonth() + 1)).slice(-2);
  return d.getFullYear() + '-' + mm;
}
