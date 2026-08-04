// データアクセス層：SubCategoryシート（商品中分類マスタ）の読み書き。
// SortOrderは大分類ごとの表示順（商品一覧のグループ表示順）を保持する
var SubCategoryRepository = {
  HEADERS: ['SubCategoryId', 'CategoryId', 'SubCategoryName', 'SortOrder'],
  CACHE_KEY_: 'repo:SubCategory:findAll',

  findAll: function () {
    var cached = RepositoryCache.get(this.CACHE_KEY_);
    if (cached) {
      return cached;
    }
    var sheet = SpreadsheetConfig.getSheet('SubCategory');
    var values = sheet.getDataRange().getValues();
    var rows = SheetUtil.rowsToObjects(values);
    RepositoryCache.put(this.CACHE_KEY_, rows);
    return rows;
  },

  save: function (subCategory) {
    var sheet = SpreadsheetConfig.getSheet('SubCategory');
    SheetUtil.upsertByRow(sheet, this.HEADERS, 'SubCategoryId', subCategory.SubCategoryId, subCategory);
    RepositoryCache.invalidate(this.CACHE_KEY_);
  },

  deleteById: function (subCategoryId) {
    var sheet = SpreadsheetConfig.getSheet('SubCategory');
    SheetUtil.deleteRowsByColumnValue(sheet, 'SubCategoryId', subCategoryId);
    RepositoryCache.invalidate(this.CACHE_KEY_);
  }
};
