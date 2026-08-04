// ドメイン層：曜日別分析（データ分析画面の「曜日別分析」タブ）の集計ロジック（Spreadsheet非依存）
var DAY_ORDER_ = ['月', '火', '水', '木', '金', '土', '日'];

var DayOfWeekAggregator = {
  aggregate: function (salesInRange, allDetails) {
    var totals = {};
    DAY_ORDER_.forEach(function (day) {
      totals[day] = { drinkAmount: 0, foodAmount: 0, orderQty: 0, partySize: 0, visitCount: 0 };
    });

    var dayBySalesId = {};
    salesInRange.forEach(function (s) {
      var day = DayOfWeekRule.fromDate(s.SalesDate);
      dayBySalesId[s.SalesId] = day;
      totals[day].partySize += Number(s.PartySize) || 0;
      totals[day].visitCount += 1;
    });

    allDetails.forEach(function (d) {
      var day = dayBySalesId[d.SalesId];
      if (!day) {
        return;
      }
      var subtotal = Number(d.Subtotal) || 0;
      if (d.CategoryLarge === 'フード') {
        totals[day].foodAmount += subtotal;
      } else if (d.CategoryLarge === 'ドリンク') {
        totals[day].drinkAmount += subtotal;
      }
      totals[day].orderQty += Number(d.Quantity) || 0;
    });

    var totalAmount = DAY_ORDER_.reduce(function (sum, day) {
      return sum + totals[day].drinkAmount + totals[day].foodAmount;
    }, 0);

    return DAY_ORDER_.map(function (day) {
      var t = totals[day];
      var amount = t.drinkAmount + t.foodAmount;
      return {
        day: day,
        drinkAmount: t.drinkAmount,
        foodAmount: t.foodAmount,
        sharePercent: totalAmount > 0 ? Math.round((amount / totalAmount) * 1000) / 10 : 0,
        orderQty: t.orderQty,
        avgOrderQty: t.visitCount > 0 ? Math.round((t.orderQty / t.visitCount) * 10) / 10 : 0,
        partySize: t.partySize,
        visitCount: t.visitCount,
        perPersonAmount: t.partySize > 0 ? Math.round(amount / t.partySize) : 0
      };
    });
  }
};
