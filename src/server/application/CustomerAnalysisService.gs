// アプリケーション層：顧客分析（SCR-009）のユースケース。
// google.script.runの制約により、クライアント公開分はトップレベル関数として定義する
// 期間の算出（日次／週次／月次）はDashboardService.gsのcalcPeriodRange_を共用する
//
// 新規／リピートの判定は、DATABASE.md 5章の方針に従い Customer.VisitCount（現在時点の累計）
// をそのまま使わず、Sales.CustomerId × Sales.SalesDateから顧客ごとの来店順を都度並べ直して算出する

function getCustomerAnalysisData(periodType, referenceDateStr) {
  var range = calcPeriodRange_(periodType, new Date(referenceDateStr));
  var allSales = SalesRepository.findAll();

  var visitRankBySalesId = buildVisitRankBySalesId_(allSales);

  var salesInRange = allSales.filter(function (s) {
    var d = new Date(s.SalesDate);
    return d >= range.start && d <= range.end;
  });

  var newCount = 0;
  var repeatCount = 0;
  var noCustomerCount = 0;
  var newAmount = 0;
  var repeatAmount = 0;

  salesInRange.forEach(function (s) {
    if (!s.CustomerId) {
      noCustomerCount++;
      return;
    }
    var amount = Number(s.TotalAmount) || 0;
    if (visitRankBySalesId[s.SalesId] === 1) {
      newCount++;
      newAmount += amount;
    } else {
      repeatCount++;
      repeatAmount += amount;
    }
  });

  var linkedTotal = newCount + repeatCount;

  return {
    periodLabel: range.label,
    newCount: newCount,
    repeatCount: repeatCount,
    noCustomerCount: noCustomerCount,
    linkedTotal: linkedTotal,
    regularRate: linkedTotal > 0 ? Math.round((repeatCount / linkedTotal) * 100) : null,
    newAmount: newAmount,
    repeatAmount: repeatAmount
  };
}

// 顧客ごとに全期間のSalesを来店日（同日はSalesIdの辞書順）で並べ、SalesIdごとの来店順（1始まり）を返す
function buildVisitRankBySalesId_(allSales) {
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
