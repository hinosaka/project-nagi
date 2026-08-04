// データアクセス層：Menuシートの読み書き
var MenuRepository = {
  HEADERS: ['MenuId', 'MenuName', 'Price', 'Cost', 'CategoryLarge', 'CategoryMedium', 'IsActive', 'SortOrder'],
  CACHE_KEY_: 'repo:Menu:findAll',

  // 商品管理・会計処理（商品選択）の両方から短時間に何度もアクセスされるため、
  // Sales/SalesDetailと同じくRepositoryCacheで60秒キャッシュする（save/deleteById時に破棄する）
  findAll: function () {
    var cached = RepositoryCache.get(this.CACHE_KEY_);
    if (cached) {
      return cached;
    }
    var sheet = SpreadsheetConfig.getSheet('Menu');
    var values = sheet.getDataRange().getValues();
    var rows = SheetUtil.rowsToObjects(values);
    RepositoryCache.put(this.CACHE_KEY_, rows);
    return rows;
  },

  save: function (menu) {
    var sheet = SpreadsheetConfig.getSheet('Menu');
    SheetUtil.upsertByRow(sheet, this.HEADERS, 'MenuId', menu.MenuId, menu);
    RepositoryCache.invalidate(this.CACHE_KEY_);
  },

  deleteById: function (menuId) {
    var sheet = SpreadsheetConfig.getSheet('Menu');
    SheetUtil.deleteRowsByColumnValue(sheet, 'MenuId', menuId);
    RepositoryCache.invalidate(this.CACHE_KEY_);
  }
};
