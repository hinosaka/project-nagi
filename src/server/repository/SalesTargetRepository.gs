// データアクセス層：SalesTargetシートの読み書き。1ヶ月1行（TargetMonthが一意）
var SalesTargetRepository = {
  HEADERS: ['SalesTargetId', 'TargetMonth', 'TargetAmount', 'Note'],

  findAll: function () {
    var sheet = SpreadsheetConfig.getSheet('SalesTarget');
    var values = sheet.getDataRange().getValues();
    return SheetUtil.rowsToObjects(values);
  },

  findByMonth: function (targetMonth) {
    return this.findAll().filter(function (t) {
      return t.TargetMonth === targetMonth;
    })[0];
  },

  save: function (target) {
    var sheet = SpreadsheetConfig.getSheet('SalesTarget');
    var row = SheetUtil.objectToRow(this.HEADERS, target);
    var rowIndex = SheetUtil.findRowIndexById(sheet, 'SalesTargetId', target.SalesTargetId);

    if (rowIndex === -1) {
      sheet.appendRow(row);
    } else {
      sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
    }
  }
};
