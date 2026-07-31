// データアクセス層：RegisterCloseLogシートの読み書き（レジクローズ実施履歴。追記のみ、上書きしない）
var RegisterCloseLogRepository = {
  HEADERS: ['RegisterCloseLogId', 'SalesDate', 'StartingCash', 'CashSalesAmount', 'ExpectedCashBalance', 'ClosedAt'],

  findAll: function () {
    var sheet = SpreadsheetConfig.getSheet('RegisterCloseLog');
    var values = sheet.getDataRange().getValues();
    return SheetUtil.rowsToObjects(values);
  },

  findByDate: function (salesDate) {
    return this.findAll().filter(function (r) {
      return DateUtil.isSameDate(r.SalesDate, salesDate);
    });
  },

  append: function (registerCloseLog) {
    var sheet = SpreadsheetConfig.getSheet('RegisterCloseLog');
    var row = SheetUtil.objectToRow(this.HEADERS, registerCloseLog);
    sheet.appendRow(row);
  }
};
