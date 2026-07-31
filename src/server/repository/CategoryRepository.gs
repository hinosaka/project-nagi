// データアクセス層：Categoryシート（商品大分類マスタ）の読み書き
var CategoryRepository = {
  HEADERS: ['CategoryId', 'CategoryName'],

  findAll: function () {
    var sheet = SpreadsheetConfig.getSheet('Category');
    var values = sheet.getDataRange().getValues();
    return SheetUtil.rowsToObjects(values);
  },

  save: function (category) {
    var sheet = SpreadsheetConfig.getSheet('Category');
    var row = SheetUtil.objectToRow(this.HEADERS, category);
    var rowIndex = SheetUtil.findRowIndexById(sheet, 'CategoryId', category.CategoryId);

    if (rowIndex === -1) {
      sheet.appendRow(row);
    } else {
      sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
    }
  }
};
