// データアクセス層：SalesTargetシートの読み書き。1ヶ月1行（TargetMonthが一意）
var SalesTargetRepository = {
  HEADERS: ['SalesTargetId', 'TargetMonth', 'TargetAmount', 'Note'],
  CACHE_KEY_: 'repo:SalesTarget:findAll',

  // TargetMonthはGoogleスプレッドシートが自動的に日付型に変換して保存することがあるため、
  // 読み込み時に"yyyy-MM"形式の文字列へ正規化する（SheetUtil.normalizeDateKey参照）
  findAll: function () {
    var cached = RepositoryCache.get(this.CACHE_KEY_);
    if (cached) {
      return cached;
    }
    var sheet = SpreadsheetConfig.getSheet('SalesTarget');
    var values = sheet.getDataRange().getValues();
    var rows = SheetUtil.rowsToObjects(values).map(function (t) {
      t.TargetMonth = SheetUtil.normalizeDateKey(t.TargetMonth, 'yyyy-MM');
      return t;
    });
    RepositoryCache.put(this.CACHE_KEY_, rows);
    return rows;
  },

  findByMonth: function (targetMonth) {
    return this.findAll().filter(function (t) {
      return t.TargetMonth === targetMonth;
    })[0];
  },

  save: function (target) {
    var sheet = SpreadsheetConfig.getSheet('SalesTarget');
    SheetUtil.upsertByRow(sheet, this.HEADERS, 'SalesTargetId', target.SalesTargetId, target);
    RepositoryCache.invalidate(this.CACHE_KEY_);
  }
};
