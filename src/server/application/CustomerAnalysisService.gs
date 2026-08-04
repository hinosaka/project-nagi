// アプリケーション層：客層分析（データ分析画面の「客層分析」タブ）のユースケース。
// google.script.runの制約により、クライアント公開分はトップレベル関数として定義する
// 期間の算出（日次／週次／月次／期間指定）はdomain/PeriodRangeCalculator.gsを共用する。
// 集計ロジック自体はdomain/CustomerSegmentAggregator.gsに集約し、このファイルはSales/SalesDetail/
// Seatの読み込みとそこへの委譲のみを行う
//
// 新規／リピートの判定は、DATABASE.md 5章の方針に従い Customer.VisitCount（現在時点の累計）
// をそのまま使わず、Sales.CustomerId × Sales.SalesDateから顧客ごとの来店順を都度並べ直して算出する

function getSegmentAnalysisData(periodType, referenceDateStr, startDateStr, endDateStr) {
  var range = PeriodRangeCalculator.resolve(periodType, referenceDateStr, startDateStr, endDateStr);
  var allSales = SalesRepository.findAll();
  var allDetails = SalesDetailRepository.findAll();
  var salesInRange = allSales.filter(function (s) {
    var d = new Date(s.SalesDate);
    return d >= range.start && d <= range.end;
  });

  // 顧客が紐づいていない会計（CustomerId空欄）はどちらにも属さず集計から漏れてしまう
  // （客層分析の他表と客数の合計が合わなくなる）ため、「未設定」セグメントとして集計対象に含める
  var visitRankBySalesId = VisitStatsCalculator.rankBySalesId(allSales);
  var newRepeat = CustomerSegmentAggregator.segmentBreakdown(salesInRange, allDetails, [
    { key: 'new', label: '新規', match: function (s) { return !!s.CustomerId && visitRankBySalesId[s.SalesId] === 1; } },
    { key: 'repeat', label: 'リピート', match: function (s) { return !!s.CustomerId && visitRankBySalesId[s.SalesId] !== 1; } },
    { key: 'unassigned', label: '未設定', match: function (s) { return !s.CustomerId; } }
  ]);

  var seatType = CustomerSegmentAggregator.seatTypeBreakdown(salesInRange, allDetails, range, SeatRepository.findAll());

  var partySize = CustomerSegmentAggregator.segmentBreakdown(salesInRange, allDetails, [
    { key: 'solo', label: '一人客', match: function (s) { return Number(s.PartySize) === 1; } },
    { key: 'group', label: 'グループ客', match: function (s) { return Number(s.PartySize) >= 2; } }
  ]);

  return {
    periodLabel: range.label,
    newRepeat: newRepeat,
    seatType: seatType,
    partySize: partySize
  };
}
