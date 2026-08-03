// データアクセス層：Salesシートの読み書き。会計は登録・修正・削除のたびに実データを直接更新する（論理削除ではない）
var SalesRepository = {
  HEADERS: ['SalesId', 'SalesDate', 'CustomerId', 'SeatId', 'PartySize', 'TotalAmount', 'Note', 'RegisteredAt'],
  CACHE_KEY_: 'repo:Sales:findAll',

  // ダッシュボード・各分析画面から同一データへ短時間に何度もアクセスされるため、
  // RepositoryCacheで60秒だけ結果をキャッシュする（save/deleteById時に破棄する。RepositoryCache.gs参照）
  findAll: function () {
    var cached = RepositoryCache.get(this.CACHE_KEY_);
    if (cached) {
      return cached;
    }
    var sheet = SpreadsheetConfig.getSheet('Sales');
    var values = sheet.getDataRange().getValues();
    var rows = SheetUtil.rowsToObjects(values);
    RepositoryCache.put(this.CACHE_KEY_, rows);
    return rows;
  },

  findByDate: function (salesDate) {
    return this.findAll().filter(function (s) {
      return DateUtil.isSameDate(s.SalesDate, salesDate);
    });
  },

  findByCustomerId: function (customerId) {
    return this.findAll().filter(function (s) {
      return s.CustomerId === customerId;
    });
  },

  save: function (sales) {
    var sheet = SpreadsheetConfig.getSheet('Sales');
    SheetUtil.upsertByRow(sheet, this.HEADERS, 'SalesId', sales.SalesId, sales);
    RepositoryCache.invalidate(this.CACHE_KEY_);
  },

  deleteById: function (salesId) {
    var sheet = SpreadsheetConfig.getSheet('Sales');
    SheetUtil.deleteRowsByColumnValue(sheet, 'SalesId', salesId);
    RepositoryCache.invalidate(this.CACHE_KEY_);
  }
};
