// アプリケーション層：曜日・天候・座席分析（SCR-010）のユースケース。
// google.script.runの制約により、クライアント公開分はトップレベル関数として定義する
// 期間の算出（日次／週次／月次）はDashboardService.gsのcalcPeriodRange_を共用する

var DAY_ORDER_ = ['月', '火', '水', '木', '金', '土', '日'];

function getDayWeatherSeatAnalysisData(periodType, referenceDateStr) {
  var range = calcPeriodRange_(periodType, new Date(referenceDateStr));

  var salesInRange = SalesRepository.findAll().filter(function (s) {
    var d = new Date(s.SalesDate);
    return d >= range.start && d <= range.end;
  });

  var dayStats = buildDayStats_(salesInRange);
  var weatherStats = buildWeatherStats_(salesInRange);
  var seatStats = buildSeatStats_(salesInRange, range);

  return {
    periodLabel: range.label,
    dayStats: dayStats,
    weatherStats: weatherStats,
    seatStats: seatStats
  };
}

function buildDayStats_(salesInRange) {
  var totals = {};
  DAY_ORDER_.forEach(function (day) {
    totals[day] = { amount: 0, visitCount: 0, partySize: 0 };
  });

  salesInRange.forEach(function (s) {
    var day = DayOfWeekRule.fromDate(s.SalesDate);
    totals[day].amount += Number(s.TotalAmount) || 0;
    totals[day].visitCount += 1;
    totals[day].partySize += Number(s.PartySize) || 0;
  });

  return DAY_ORDER_.map(function (day) {
    var t = totals[day];
    return {
      day: day,
      amount: t.amount,
      visitCount: t.visitCount,
      partySize: t.partySize,
      perPersonAmount: t.partySize > 0 ? Math.round(t.amount / t.partySize) : 0
    };
  });
}

function buildWeatherStats_(salesInRange) {
  var totals = {};
  var order = [];

  salesInRange.forEach(function (s) {
    var businessDay = BusinessDayRepository.findByDate(s.SalesDate);
    var weather = (businessDay && businessDay.Weather) ? businessDay.Weather : '未記録';
    if (!totals[weather]) {
      totals[weather] = { amount: 0, visitCount: 0 };
      order.push(weather);
    }
    totals[weather].amount += Number(s.TotalAmount) || 0;
    totals[weather].visitCount += 1;
  });

  return order
    .map(function (weather) {
      return { weather: weather, amount: totals[weather].amount, visitCount: totals[weather].visitCount };
    })
    .sort(function (a, b) { return b.amount - a.amount; });
}

function buildSeatStats_(salesInRange, range) {
  var seats = SeatRepository.findAll();
  var seatTypeById = {};
  var activeSeatCountByType = {};
  seats.forEach(function (seat) {
    seatTypeById[seat.SeatId] = seat.SeatType;
    if (seat.IsActive) {
      activeSeatCountByType[seat.SeatType] = (activeSeatCountByType[seat.SeatType] || 0) + 1;
    }
  });

  var msPerDay = 24 * 60 * 60 * 1000;
  var startDateOnly = new Date(range.start.getFullYear(), range.start.getMonth(), range.start.getDate());
  var endDateOnly = new Date(range.end.getFullYear(), range.end.getMonth(), range.end.getDate());
  var daysInPeriod = Math.round((endDateOnly - startDateOnly) / msPerDay) + 1;

  var visitCountByType = {};
  salesInRange.forEach(function (s) {
    if (!s.SeatId) {
      return;
    }
    var seatType = seatTypeById[s.SeatId];
    if (!seatType) {
      return;
    }
    visitCountByType[seatType] = (visitCountByType[seatType] || 0) + 1;
  });

  return Object.keys(activeSeatCountByType).map(function (seatType) {
    var visitCount = visitCountByType[seatType] || 0;
    var capacitySlots = activeSeatCountByType[seatType] * daysInPeriod;
    return {
      seatType: seatType,
      visitCount: visitCount,
      utilizationRate: capacitySlots > 0 ? Math.round((visitCount / capacitySlots) * 100) : 0
    };
  });
}
