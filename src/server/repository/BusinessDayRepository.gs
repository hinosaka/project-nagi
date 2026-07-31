// データアクセス層：BusinessDayシートの読み書き
var BusinessDayRepository = {
  HEADERS: ['BusinessDayId', 'SalesDate', 'DayOfWeek', 'Weather', 'StartingCash'],

  findAll: function () {
    var sheet = SpreadsheetConfig.getSheet('BusinessDay');
    var values = sheet.getDataRange().getValues();
    return SheetUtil.rowsToObjects(values);
  },

  findByDate: function (salesDate) {
    return this.findAll().filter(function (b) {
      return DateUtil.isSameDate(b.SalesDate, salesDate);
    })[0];
  },

  save: function (businessDay) {
    var sheet = SpreadsheetConfig.getSheet('BusinessDay');
    var row = SheetUtil.objectToRow(this.HEADERS, businessDay);
    var rowIndex = SheetUtil.findRowIndexById(sheet, 'BusinessDayId', businessDay.BusinessDayId);

    if (rowIndex === -1) {
      sheet.appendRow(row);
    } else {
      sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
    }
  }
};
