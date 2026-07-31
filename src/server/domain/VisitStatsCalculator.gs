// ドメイン層：顧客の来店回数・初回／最終来店日の算出（Sales実データから都度再計算する）
var VisitStatsCalculator = {
  calc: function (salesList) {
    if (salesList.length === 0) {
      return { VisitCount: 0, FirstVisitDate: null, LastVisitDate: null };
    }
    var firstVisitDate = new Date(salesList[0].SalesDate);
    var lastVisitDate = new Date(salesList[0].SalesDate);
    salesList.forEach(function (s) {
      var d = new Date(s.SalesDate);
      if (d < firstVisitDate) { firstVisitDate = d; }
      if (d > lastVisitDate) { lastVisitDate = d; }
    });

    return { VisitCount: salesList.length, FirstVisitDate: firstVisitDate, LastVisitDate: lastVisitDate };
  }
};
