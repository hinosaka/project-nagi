// アプリケーション層：天候別分析（データ分析画面の「天候別分析」タブ）のユースケース。
// google.script.runの制約により、クライアント公開分はトップレベル関数として定義する
// 期間の算出（日次／週次／月次／期間指定）はDashboardService.gsのresolvePeriodRange_を共用する
//
// 天候はBusinessDay.Weatherの事後入力のみで、当日・翌日の予報を持つ手段がないため、この分析は
// 過去の傾向把握（例：雨の日は温かい料理が伸びる）を目的とし、当日の仕入れ予測には使わない前提とする

function getWeatherAnalysisData(periodType, referenceDateStr, startDateStr, endDateStr) {
  var range = resolvePeriodRange_(periodType, referenceDateStr, startDateStr, endDateStr);
  var salesInRange = SalesRepository.findAll().filter(function (s) {
    var d = new Date(s.SalesDate);
    return d >= range.start && d <= range.end;
  });

  var totals = {};
  var order = [];
  var weatherBySalesId = {};
  salesInRange.forEach(function (s) {
    var businessDay = BusinessDayRepository.findByDate(s.SalesDate);
    var weather = (businessDay && businessDay.Weather) ? businessDay.Weather : '未記録';
    weatherBySalesId[s.SalesId] = weather;
    if (!totals[weather]) {
      totals[weather] = { drinkAmount: 0, foodAmount: 0, orderQty: 0, partySize: 0, visitCount: 0 };
      order.push(weather);
    }
    totals[weather].partySize += Number(s.PartySize) || 0;
    totals[weather].visitCount += 1;
  });

  var productQtyByWeather = {};
  SalesDetailRepository.findAll().forEach(function (d) {
    var weather = weatherBySalesId[d.SalesId];
    if (!weather) {
      return;
    }
    var subtotal = Number(d.Subtotal) || 0;
    var quantity = Number(d.Quantity) || 0;
    if (d.CategoryLarge === 'フード') {
      totals[weather].foodAmount += subtotal;
    } else if (d.CategoryLarge === 'ドリンク') {
      totals[weather].drinkAmount += subtotal;
    }
    totals[weather].orderQty += quantity;

    if (d.MenuName) {
      if (!productQtyByWeather[weather]) {
        productQtyByWeather[weather] = {};
      }
      productQtyByWeather[weather][d.MenuName] = (productQtyByWeather[weather][d.MenuName] || 0) + quantity;
    }
  });

  var totalAmount = order.reduce(function (sum, weather) {
    return sum + totals[weather].drinkAmount + totals[weather].foodAmount;
  }, 0);

  var weatherStats = order.map(function (weather) {
    var t = totals[weather];
    var amount = t.drinkAmount + t.foodAmount;
    var qtyMap = productQtyByWeather[weather] || {};
    var top = Object.keys(qtyMap)
      .map(function (name) { return { name: name, qty: qtyMap[name] }; })
      .sort(function (a, b) { return b.qty - a.qty; })
      .slice(0, 5);

    return {
      weather: weather,
      drinkAmount: t.drinkAmount,
      foodAmount: t.foodAmount,
      sharePercent: totalAmount > 0 ? Math.round((amount / totalAmount) * 1000) / 10 : 0,
      orderQty: t.orderQty,
      avgOrderQty: t.visitCount > 0 ? Math.round((t.orderQty / t.visitCount) * 10) / 10 : 0,
      partySize: t.partySize,
      visitCount: t.visitCount,
      perPersonAmount: t.partySize > 0 ? Math.round(amount / t.partySize) : 0,
      top: top
    };
  }).sort(function (a, b) { return (b.drinkAmount + b.foodAmount) - (a.drinkAmount + a.foodAmount); });

  return { periodLabel: range.label, weatherStats: weatherStats };
}
