// アプリケーション層：会計処理（SCR-002）清算タブのユースケース。
// google.script.runの制約により、クライアント公開分はトップレベル関数として定義する

function getCashRegisterData(salesDateStr) {
  var salesDate = new Date(salesDateStr);

  var salesForDate = SalesRepository.findByDate(salesDate);
  var totalAmount = salesForDate.reduce(function (sum, s) { return sum + (Number(s.TotalAmount) || 0); }, 0);
  var visitCount = salesForDate.length;

  var businessDay = BusinessDayRepository.findByDate(salesDate);
  var startingCash = businessDay && businessDay.StartingCash !== '' && businessDay.StartingCash !== undefined
    ? Number(businessDay.StartingCash) || 0
    : 0;

  var cashSalesAmount = totalAmount; // 支払いは現金固定のため合計金額と同値
  var expectedCashBalance = startingCash + cashSalesAmount;

  var history = buildRecentCloseHistory_();

  return {
    totalAmount: totalAmount,
    visitCount: visitCount,
    startingCash: startingCash,
    cashSalesAmount: cashSalesAmount,
    expectedCashBalance: expectedCashBalance,
    history: history
  };
}

// 管理履歴は選択中の日付に関わらず、直近30日間（実施日時ベース）の全件を新しい順に返す。
// 全件保持するとシートが際限なく増えるため、表示範囲をあらかじめ絞ってデータ量を抑える
function buildRecentCloseHistory_() {
  var cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  cutoff.setHours(0, 0, 0, 0);

  return RegisterCloseLogRepository.findAll()
    .filter(function (r) { return new Date(r.ClosedAt) >= cutoff; })
    .sort(function (a, b) { return new Date(b.ClosedAt) - new Date(a.ClosedAt); })
    .map(function (r) {
      return {
        salesDateDisplay: DateUtil.formatDisplay(r.SalesDate),
        startingCash: Number(r.StartingCash) || 0,
        cashSalesAmount: Number(r.CashSalesAmount) || 0,
        expectedCashBalance: Number(r.ExpectedCashBalance) || 0,
        closedAtDisplay: DateUtil.formatDateTime(r.ClosedAt)
      };
    });
}

function saveStartingCash(salesDateStr, amount) {
  var salesDate = new Date(salesDateStr);
  var existing = BusinessDayRepository.findByDate(salesDate);

  BusinessDayRepository.save({
    BusinessDayId: 'BD-' + DateUtil.formatYmd(salesDate).replace(/-/g, ''),
    SalesDate: salesDate,
    DayOfWeek: existing ? existing.DayOfWeek : DayOfWeekRule.fromDate(salesDate),
    Weather: existing ? existing.Weather : '',
    StartingCash: Number(amount) || 0
  });

  return getCashRegisterData(salesDateStr);
}

function closeRegister(salesDateStr) {
  var salesDate = new Date(salesDateStr);
  var data = getCashRegisterData(salesDateStr);

  // ID採番〜保存までを排他化する（SalesService.saveSalesEntryと同じ理由。LockUtil.gs参照）
  LockUtil.withLock(function () {
    var existingIds = RegisterCloseLogRepository.findAll().map(function (r) { return r.RegisterCloseLogId; });
    var registerCloseLogId = DailyIdRule.generateNext('RC', salesDate, existingIds);

    RegisterCloseLogRepository.append({
      RegisterCloseLogId: registerCloseLogId,
      SalesDate: salesDate,
      StartingCash: data.startingCash,
      CashSalesAmount: data.cashSalesAmount,
      ExpectedCashBalance: data.expectedCashBalance,
      ClosedAt: new Date()
    });
  });

  return getCashRegisterData(salesDateStr);
}
