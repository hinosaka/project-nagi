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
    SheetUtil.upsertByRow(sheet, this.HEADERS, 'CategoryId', category.CategoryId, category);
  }
};
