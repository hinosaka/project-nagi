// ドメイン層：客層分析（データ分析画面の「客層分析」タブ）の集計ロジック（Spreadsheet非依存）
var CustomerSegmentAggregator = {
  // セグメント別の売上・売上構成比・注文数・注文数構成比・平均注文数・客数（人数）・客単価を集計する共通処理。
  // 新規/リピート・座席タイプ・人数別（一人客/グループ客）のいずれもこの形で算出する
  segmentBreakdown: function (salesInRange, allDetails, segments) {
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
  },

  // 座席タイプ別の内訳＋稼働率（有効座席数×期間日数に対する利用件数の割合）
  seatTypeBreakdown: function (salesInRange, allDetails, range, seats) {
    var self = this;
    var seatTypeById = {};
    var activeSeatCountByType = {};
    seats.forEach(function (seat) {
      seatTypeById[seat.SeatId] = seat.SeatType;
      if (seat.IsActive) {
        activeSeatCountByType[seat.SeatType] = (activeSeatCountByType[seat.SeatType] || 0) + 1;
      }
    });

    // 座席が未割当（SeatId空欄）、または対応する座席種別に有効な座席が1つもない会計は
    // どの座席タイプにも属さず集計から漏れてしまう（客層分析の他表と客数の合計が合わなくなる）ため、
    // 「未設定」セグメントとしてまとめて集計対象に含める
    var seatTypes = Object.keys(activeSeatCountByType);
    var segments = seatTypes.map(function (type) {
      return { key: type, label: type, match: function (s) { return seatTypeById[s.SeatId] === type; } };
    });
    segments.push({
      key: 'unassigned',
      label: '未設定',
      match: function (s) { return !activeSeatCountByType[seatTypeById[s.SeatId]]; }
    });
    var rows = self.segmentBreakdown(salesInRange, allDetails, segments);

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
};
