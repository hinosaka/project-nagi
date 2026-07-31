// アプリケーション層：客層分析（データ分析画面の「客層分析」タブ）のユースケース。
// google.script.runの制約により、クライアント公開分はトップレベル関数として定義する
// 期間の算出（日次／週次／月次／期間指定）はDashboardService.gsのresolvePeriodRange_を共用する
//
// 新規／リピートの判定は、DATABASE.md 5章の方針に従い Customer.VisitCount（現在時点の累計）
// をそのまま使わず、Sales.CustomerId × Sales.SalesDateから顧客ごとの来店順を都度並べ直して算出する

function getSegmentAnalysisData(periodType, referenceDateStr, startDateStr, endDateStr) {
  var range = resolvePeriodRange_(periodType, referenceDateStr, startDateStr, endDateStr);
  var allSales = SalesRepository.findAll();
  var allDetails = SalesDetailRepository.findAll();
  var salesInRange = allSales.filter(function (s) {
    var d = new Date(s.SalesDate);
    return d >= range.start && d <= range.end;
  });

  var visitRankBySalesId = buildVisitRankBySalesId_(allSales);
  var newRepeat = buildSegmentBreakdown_(salesInRange, allDetails, [
    { key: 'new', label: '新規', match: function (s) { return !!s.CustomerId && visitRankBySalesId[s.SalesId] === 1; } },
    { key: 'repeat', label: 'リピート', match: function (s) { return !!s.CustomerId && visitRankBySalesId[s.SalesId] !== 1; } }
  ]);

  var seatType = buildSeatTypeBreakdown_(salesInRange, allDetails, range);

  var partySize = buildSegmentBreakdown_(salesInRange, allDetails, [
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

// 座席タイプ別の内訳＋稼働率（有効座席数×期間日数に対する利用件数の割合）
function buildSeatTypeBreakdown_(salesInRange, allDetails, range) {
  var seats = SeatRepository.findAll();
  var seatTypeById = {};
  var activeSeatCountByType = {};
  seats.forEach(function (seat) {
    seatTypeById[seat.SeatId] = seat.SeatType;
    if (seat.IsActive) {
      activeSeatCountByType[seat.SeatType] = (activeSeatCountByType[seat.SeatType] || 0) + 1;
    }
  });

  var seatTypes = Object.keys(activeSeatCountByType);
  var rows = buildSegmentBreakdown_(salesInRange, allDetails, seatTypes.map(function (type) {
    return { key: type, label: type, match: function (s) { return seatTypeById[s.SeatId] === type; } };
  }));

  var msPerDay = 24 * 60 * 60 * 1000;
  var startDateOnly = new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate());
  var endDateOnly = new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate());
  var daysInPeriod = Math.round((endDateOnly - startDateOnly) / msPerDay) + 1;

  rows.forEach(function (row) {
    var capacitySlots = (activeSeatCountByType[row.key] || 0) * daysInPeriod;
    row.utilizationRate = capacitySlots > 0 ? Math.round((row.visitCount / capacitySlots) * 100) : 0;
  });
  return rows;
}

// セグメント別の売上・売上構成比・注文数・注文数構成比・平均注文数・客数（人数）・客単価を集計する共通処理。
// 新規/リピート・座席タイプ・人数別（一人客/グループ客）のいずれもこの形で算出する
function buildSegmentBreakdown_(salesInRange, allDetails, segments) {
  var totals = {};
  segments.forEach(function (seg) {
    totals[seg.key] = { amount: 0, orderQty: 0, partySize: 0, visitCount: 0 };
  });

  var segmentKeyBySalesId = {};
  salesInRange.forEach(function (s) {
    var seg = segments.filter(function (x) { return x.match(s); })[0];
    if (!seg) {
      return;
    }
    segmentKeyBySalesId[s.SalesId] = seg.key;
    totals[seg.key].amount += Number(s.TotalAmount) || 0;
    totals[seg.key].partySize += Number(s.PartySize) || 0;
    totals[seg.key].visitCount += 1;
  });

  allDetails.forEach(function (d) {
    var key = segmentKeyBySalesId[d.SalesId];
    if (!key) {
      return;
    }
    totals[key].orderQty += Number(d.Quantity) || 0;
  });

  var totalAmount = segments.reduce(function (sum, seg) { return sum + totals[seg.key].amount; }, 0);
  var totalOrderQty = segments.reduce(function (sum, seg) { return sum + totals[seg.key].orderQty; }, 0);
  var totalVisitCount = segments.reduce(function (sum, seg) { return sum + totals[seg.key].visitCount; }, 0);

  return segments.map(function (seg) {
    var t = totals[seg.key];
    return {
      key: seg.key,
      label: seg.label,
      amount: t.amount,
      amountSharePercent: totalAmount > 0 ? Math.round((t.amount / totalAmount) * 1000) / 10 : 0,
      orderQty: t.orderQty,
      orderQtySharePercent: totalOrderQty > 0 ? Math.round((t.orderQty / totalOrderQty) * 1000) / 10 : 0,
      avgOrderQty: t.visitCount > 0 ? Math.round((t.orderQty / t.visitCount) * 10) / 10 : 0,
      partySize: t.partySize,
      perPersonAmount: t.partySize > 0 ? Math.round(t.amount / t.partySize) : 0,
      visitCount: t.visitCount,
      visitCountSharePercent: totalVisitCount > 0 ? Math.round((t.visitCount / totalVisitCount) * 1000) / 10 : 0
    };
  });
}

// 顧客ごとに全期間のSalesを来店日（同日はSalesIdの辞書順）で並べ、SalesIdごとの来店順（1始まり）を返す。
// ダッシュボード（SCR-006）の新規/リピート内訳でも共用する
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
