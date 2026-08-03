// データアクセス層：SalesDetailシートの読み書き
var SalesDetailRepository = {
  HEADERS: ['SalesDetailId', 'SalesId', 'MenuId', 'MenuName', 'UnitPrice', 'UnitCost', 'Quantity', 'Subtotal', 'CustomerId', 'CategoryLarge', 'CategoryMedium'],
  CACHE_KEY_: 'repo:SalesDetail:findAll',

  // Sales同様、ダッシュボード・各分析画面からの短時間の再アクセスをRepositoryCacheで吸収する
  // （saveAll/deleteBySalesId時に破棄する。RepositoryCache.gs参照）
  findAll: function () {
    var cached = RepositoryCache.get(this.CACHE_KEY_);
    if (cached) {
      return cached;
    }
    var sheet = SpreadsheetConfig.getSheet('SalesDetail');
    var values = sheet.getDataRange().getValues();
    var rows = SheetUtil.rowsToObjects(values);
    RepositoryCache.put(this.CACHE_KEY_, rows);
    return rows;
  },

  findBySalesId: function (salesId) {
    return this.findAll().filter(function (d) {
      return d.SalesId === salesId;
    });
  },

  saveAll: function (details) {
    var sheet = SpreadsheetConfig.getSheet('SalesDetail');
    var rows = details.map(function (d) {
      return SheetUtil.objectToRow(SalesDetailRepository.HEADERS, d);
    });
    if (rows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }
    RepositoryCache.invalidate(this.CACHE_KEY_);
  },

  deleteBySalesId: function (salesId) {
    var sheet = SpreadsheetConfig.getSheet('SalesDetail');
    SheetUtil.deleteRowsByColumnValue(sheet, 'SalesId', salesId);
    RepositoryCache.invalidate(this.CACHE_KEY_);
  }
};
