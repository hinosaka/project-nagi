// データアクセス層：SubCategoryシート（商品中分類マスタ）の読み書き。
// SortOrderは大分類ごとの表示順（商品一覧のグループ表示順）を保持する
var SubCategoryRepository = {
  HEADERS: ['SubCategoryId', 'CategoryId', 'SubCategoryName', 'SortOrder'],

  findAll: function () {
    var sheet = SpreadsheetConfig.getSheet('SubCategory');
    var values = sheet.getDataRange().getValues();
    return SheetUtil.rowsToObjects(values);
  },

  save: function (subCategory) {
    var sheet = SpreadsheetConfig.getSheet('SubCategory');
    var row = SheetUtil.objectToRow(this.HEADERS, subCategory);
    var rowIndex = SheetUtil.findRowIndexById(sheet, 'SubCategoryId', subCategory.SubCategoryId);

    if (rowIndex === -1) {
      sheet.appendRow(row);
    } else {
      sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
    }
  },

  deleteById: function (subCategoryId) {
    var sheet = SpreadsheetConfig.getSheet('SubCategory');
    SheetUtil.deleteRowsByColumnValue(sheet, 'SubCategoryId', subCategoryId);
  }
};
