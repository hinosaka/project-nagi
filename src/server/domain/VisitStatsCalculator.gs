// ドメイン層：顧客の来店回数・最終来店日の算出（Sales実データから都度再計算する）
var VisitStatsCalculator = {
  calc: function (salesList) {
    if (salesList.length === 0) {
      return { VisitCount: 0, LastVisitDate: null };
    }
    var lastVisitDate = salesList.reduce(function (max, s) {
      var d = new Date(s.SalesDate);
      return d > max ? d : max;
    }, new Date(salesList[0].SalesDate));

    return { VisitCount: salesList.length, LastVisitDate: lastVisitDate };
  }
};
