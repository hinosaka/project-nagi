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
    SheetUtil.upsertByRow(sheet, this.HEADERS, 'SubCategoryId', subCategory.SubCategoryId, subCategory);
  },

  deleteById: function (subCategoryId) {
    var sheet = SpreadsheetConfig.getSheet('SubCategory');
    SheetUtil.deleteRowsByColumnValue(sheet, 'SubCategoryId', subCategoryId);
  }
};
