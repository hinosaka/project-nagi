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
  },

  // 顧客ごとに全期間のSalesを来店日（同日はSalesIdの辞書順）で並べ、SalesIdごとの来店順（1始まり）を返す。
  // DATABASE.md 5章の方針に従い、Customer.VisitCount（現在時点の累計）をそのまま使わず、
  // 集計対象の期間に関わらず全期間から来店順を算出する（ダッシュボード・客層分析で共用）
  rankBySalesId: function (allSales) {
    var byCustomer = {};
    allSales.forEach(function (s) {
      if (!s.CustomerId) {
        return;
      }
      if (!byCustomer[s.CustomerId]) {
        byCustomer[s.CustomerId] = [];
      }
      byCustomer[s.CustomerId].push(s);
    });

    var visitRankBySalesId = {};
    Object.keys(byCustomer).forEach(function (customerId) {
      byCustomer[customerId]
        .sort(function (a, b) {
          var da = new Date(a.SalesDate).getTime();
          var db = new Date(b.SalesDate).getTime();
          if (da !== db) {
            return da - db;
          }
          return String(a.SalesId).localeCompare(String(b.SalesId));
        })
        .forEach(function (s, index) {
          visitRankBySalesId[s.SalesId] = index + 1;
        });
    });
    return visitRankBySalesId;
  }
};
