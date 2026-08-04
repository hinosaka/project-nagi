// ドメイン層：ダッシュボード（SCR-006）の期間算出・集計ロジック（Spreadsheet非依存）。
// アプリケーション層（DashboardService.gs）はSales/SalesDetail/Seatの読み込みと
// このオブジェクトへの委譲のみを行う
var DashboardAggregator = {
  KPI_LABELS: {
    totalAmount: '売上高',
    perPersonAmount: '客単価',
    totalPartySize: '合計客数',
    visitCount: '合計組数',
    turnoverRate: '客席回転率'
  },

  // ----- 期間の算出 -----

  // referenceDateStrはクライアント側で各タブの粒度に応じてすでに実際の対象日へシフト済みの値を渡す
  // （本日／昨日：対象日そのもの、過去7日間：対象日を末日とする7日間、当月：対象日が属する月）
  periodRange: function (periodType, referenceDateStr, startDateStr, endDateStr) {
    var refDate = referenceDateStr ? new Date(referenceDateStr) : new Date();
    refDate.setHours(0, 0, 0, 0);
    var start;
    var end;

    if (periodType === 'last7') {
      end = new Date(refDate);
      start = new Date(refDate);
      start.setDate(start.getDate() - 6);
    } else if (periodType === 'month') {
      start = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
      end = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);
    } else if (periodType === 'custom') {
      start = new Date(startDateStr);
      end = new Date(endDateStr);
    } else {
      start = new Date(refDate);
      end = new Date(refDate);
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    var msPerDay = 24 * 60 * 60 * 1000;
    var startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    var endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    var dayCount = Math.round((endDateOnly - startDateOnly) / msPerDay) + 1;

    return { start: start, end: end, dayCount: dayCount };
  },

  // 単日（本日・昨日）：前日と比較。複数日（過去7日間・当月）：直前の同じ長さの期間と比較
  // （過去7日間なら実質「前週比」、当月なら実質「前月比」になる）
  comparePeriodRange: function (range) {
    var start;
    var end;

    if (range.dayCount === 1) {
      start = new Date(range.start);
      start.setDate(start.getDate() - 1);
      end = new Date(start);
    } else {
      end = new Date(range.start);
      end.setDate(end.getDate() - 1);
      start = new Date(end);
      start.setDate(start.getDate() - (range.dayCount - 1));
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start: start, end: end };
  },

  // 単日・当月選択時はその月の全日数、過去7日間はその7日間、期間指定はその期間を含む過去28日間をグラフ範囲にする
  graphRange: function (periodType, range) {
    if (range.dayCount === 1 || periodType === 'month') {
      var monthStart = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
      var monthEnd = new Date(range.start.getFullYear(), range.start.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
      return { start: monthStart, end: monthEnd };
    }
    if (periodType === 'custom') {
      var contextStart = new Date(range.end);
      contextStart.setDate(contextStart.getDate() - 27);
      contextStart.setHours(0, 0, 0, 0);
      return { start: contextStart, end: range.end };
    }
    return range;
  },

  fullDate_: function (d) {
    var mm = ('0' + (d.getMonth() + 1)).slice(-2);
    var dd = ('0' + d.getDate()).slice(-2);
    return d.getFullYear() + '年' + mm + '月' + dd + '日';
  },

  // 集計対象日の表示。単日は日付＋曜日（例：2026年07月31日(金)）、当月は年月、それ以外は範囲表示
  periodLabel: function (periodType, range) {
    if (range.dayCount === 1) {
      return this.fullDate_(range.start) + '(' + DayOfWeekRule.fromDate(range.start) + ')';
    }
    if (periodType === 'month') {
      return range.start.getFullYear() + '年' + ('0' + (range.start.getMonth() + 1)).slice(-2) + '月';
    }
    return this.fullDate_(range.start) + ' 〜 ' + this.fullDate_(range.end);
  },

  // ----- 集計 -----

  summarizePeriod: function (allSales, allDetails, range, activeSeatCount) {
    var salesIdSet = {};
    var totalAmount = 0;
    var totalPartySize = 0;

    var salesInRange = allSales.filter(function (s) {
      var d = new Date(s.SalesDate);
      return d >= range.start && d <= range.end;
    });
    salesInRange.forEach(function (s) {
      totalAmount += Number(s.TotalAmount) || 0;
      totalPartySize += Number(s.PartySize) || 0;
      salesIdSet[s.SalesId] = true;
    });

    var foodAmount = 0;
    var drinkAmount = 0;
    allDetails.forEach(function (d) {
      if (!salesIdSet[d.SalesId]) {
        return;
      }
      var subtotal = Number(d.Subtotal) || 0;
      if (d.CategoryLarge === 'フード') {
        foodAmount += subtotal;
      } else if (d.CategoryLarge === 'ドリンク') {
        drinkAmount += subtotal;
      }
    });

    var visitCount = salesInRange.length;
    return {
      totalAmount: totalAmount,
      foodAmount: foodAmount,
      drinkAmount: drinkAmount,
      perPersonAmount: totalPartySize > 0 ? Math.round(totalAmount / totalPartySize) : 0,
      totalPartySize: totalPartySize,
      visitCount: visitCount,
      turnoverRate: activeSeatCount > 0 ? Math.round((visitCount / activeSeatCount) * 100) / 100 : 0,
      salesIdSet: salesIdSet
    };
  },

  // 会計組数のうち新規／リピートの内訳。新規／リピートの判定はVisitStatsCalculator.rankBySalesId
  // （全期間の来店順を都度算出する方式）を共用する
  newRepeatCounts: function (allSales, range) {
    var visitRankBySalesId = VisitStatsCalculator.rankBySalesId(allSales);
    var newCount = 0;
    var repeatCount = 0;
    allSales.forEach(function (s) {
      var d = new Date(s.SalesDate);
      if (d < range.start || d > range.end || !s.CustomerId) {
        return;
      }
      if (visitRankBySalesId[s.SalesId] === 1) {
        newCount++;
      } else {
        repeatCount++;
      }
    });
    return { newCount: newCount, repeatCount: repeatCount };
  },

  pctDiff_: function (current, base) {
    if (!base) {
      return null;
    }
    return Math.round(((current - base) / base) * 1000) / 10;
  },

  diffAmount_: function (current, base) {
    return Math.round((current - base) * 100) / 100;
  },

  kpiDiffs: function (current, compare) {
    var self = this;
    var kpis = {};
    Object.keys(this.KPI_LABELS).forEach(function (key) {
      kpis[key] = {
        value: current[key],
        diffAmount: self.diffAmount_(current[key], compare[key]),
        diffPercent: self.pctDiff_(current[key], compare[key])
      };
    });
    kpis.foodAmount = { value: current.foodAmount, diffAmount: this.diffAmount_(current.foodAmount, compare.foodAmount), diffPercent: this.pctDiff_(current.foodAmount, compare.foodAmount) };
    kpis.drinkAmount = { value: current.drinkAmount, diffAmount: this.diffAmount_(current.drinkAmount, compare.drinkAmount), diffPercent: this.pctDiff_(current.drinkAmount, compare.drinkAmount) };
    return kpis;
  },

  // 期間指定（custom）は比較対象が定まらないため、値のみを返し差分は常に「-」表示にする
  kpiValuesOnly: function (current) {
    var kpis = {};
    Object.keys(this.KPI_LABELS).forEach(function (key) {
      kpis[key] = { value: current[key], diffAmount: null, diffPercent: null };
    });
    kpis.foodAmount = { value: current.foodAmount, diffAmount: null, diffPercent: null };
    kpis.drinkAmount = { value: current.drinkAmount, diffAmount: null, diffPercent: null };
    return kpis;
  },

  graphData: function (allSales, graphRange) {
    var amountByDate = {};
    allSales.forEach(function (s) {
      var d = new Date(s.SalesDate);
      if (d < graphRange.start || d > graphRange.end) {
        return;
      }
      var key = DateUtil.formatYmd(d);
      amountByDate[key] = (amountByDate[key] || 0) + (Number(s.TotalAmount) || 0);
    });

    var days = [];
    var cursor = new Date(graphRange.start.getFullYear(), graphRange.start.getMonth(), graphRange.start.getDate());
    var endDateOnly = new Date(graphRange.end.getFullYear(), graphRange.end.getMonth(), graphRange.end.getDate());
    while (cursor <= endDateOnly) {
      var key = DateUtil.formatYmd(cursor);
      days.push({ date: key, day: cursor.getDate(), amount: amountByDate[key] || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    return days;
  },

  top10: function (allDetails, salesIdSet) {
    var totals = {};
    var order = [];
    allDetails.forEach(function (d) {
      if (!salesIdSet[d.SalesId] || !d.MenuName) {
        return;
      }
      if (totals[d.MenuName] === undefined) {
        totals[d.MenuName] = 0;
        order.push(d.MenuName);
      }
      totals[d.MenuName] += Number(d.Quantity) || 0;
    });

    return order
      .map(function (name) { return { MenuName: name, quantity: totals[name] }; })
      .sort(function (a, b) { return b.quantity - a.quantity; })
      .slice(0, 10)
      .map(function (item, i) { return { rank: i + 1, MenuName: item.MenuName, quantity: item.quantity }; });
  },

  // 上位5件＋「その他」（6件を超える場合）に畳む。CategoryMediumが空欄の明細は元々「その他」に集計される
  foldToOther_: function (map) {
    var list = Object.keys(map).map(function (name) { return { name: name, amount: map[name] }; });
    list.sort(function (a, b) { return b.amount - a.amount; });

    var explicitOtherAmount = 0;
    var named = list.filter(function (it) {
      if (it.name === 'その他') {
        explicitOtherAmount += it.amount;
        return false;
      }
      return true;
    });

    var visible = named.slice(0, 5);
    var overflowAmount = named.slice(5).reduce(function (sum, it) { return sum + it.amount; }, 0) + explicitOtherAmount;
    if (overflowAmount > 0) {
      visible = visible.concat([{ name: 'その他', amount: overflowAmount }]);
    }
    return visible;
  },

  categoryBreakdown: function (allDetails, salesIdSet) {
    var large = { 'フード': 0, 'ドリンク': 0 };
    var mediumByLarge = { 'フード': {}, 'ドリンク': {} };

    allDetails.forEach(function (d) {
      if (!salesIdSet[d.SalesId]) {
        return;
      }
      var cat = d.CategoryLarge;
      if (cat !== 'フード' && cat !== 'ドリンク') {
        return;
      }
      var subtotal = Number(d.Subtotal) || 0;
      large[cat] += subtotal;
      var medium = d.CategoryMedium || 'その他';
      mediumByLarge[cat][medium] = (mediumByLarge[cat][medium] || 0) + subtotal;
    });

    return {
      large: [
        { name: 'ドリンク', amount: large['ドリンク'] },
        { name: 'フード', amount: large['フード'] }
      ],
      drink: this.foldToOther_(mediumByLarge['ドリンク']),
      food: this.foldToOther_(mediumByLarge['フード'])
    };
  }
};
