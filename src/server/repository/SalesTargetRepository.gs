// データアクセス層：SalesTargetシートの読み書き。1ヶ月1行（TargetMonthが一意）
var SalesTargetRepository = {
  HEADERS: ['SalesTargetId', 'TargetMonth', 'TargetAmount', 'Note'],

  // TargetMonthはGoogleスプレッドシートが自動的に日付型に変換して保存することがあるため、
  // 読み込み時に"yyyy-MM"形式の文字列へ正規化する（SheetUtil.normalizeDateKey参照）
  findAll: function () {
    var sheet = SpreadsheetConfig.getSheet('SalesTarget');
    var values = sheet.getDataRange().getValues();
    return SheetUtil.rowsToObjects(values).map(function (t) {
      t.TargetMonth = SheetUtil.normalizeDateKey(t.TargetMonth, 'yyyy-MM');
      return t;
    });
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
