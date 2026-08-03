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
    SheetUtil.upsertByRow(sheet, this.HEADERS, 'BusinessDayId', businessDay.BusinessDayId, businessDay);
  }
};
