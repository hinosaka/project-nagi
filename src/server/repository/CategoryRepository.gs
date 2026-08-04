// データアクセス層：Categoryシート（商品大分類マスタ）の読み書き
var CategoryRepository = {
  HEADERS: ['CategoryId', 'CategoryName'],
  CACHE_KEY_: 'repo:Category:findAll',

  findAll: function () {
    var cached = RepositoryCache.get(this.CACHE_KEY_);
    if (cached) {
      return cached;
    }
    var sheet = SpreadsheetConfig.getSheet('Category');
    var values = sheet.getDataRange().getValues();
    var rows = SheetUtil.rowsToObjects(values);
    RepositoryCache.put(this.CACHE_KEY_, rows);
    return rows;
  },

  save: function (category) {
    var sheet = SpreadsheetConfig.getSheet('Category');
    SheetUtil.upsertByRow(sheet, this.HEADERS, 'CategoryId', category.CategoryId, category);
    RepositoryCache.invalidate(this.CACHE_KEY_);
  }
};
