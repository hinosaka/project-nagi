// データアクセス層：DailyTargetシートの読み書き。日別予算設定（予算管理）で使う、日単位の目標売上。
// 未設定の日はここに行を持たず、売上統計（SCR-007, SCR-011）の日別タブでは月目標の日数按分にフォールバックする
var DailyTargetRepository = {
  HEADERS: ['DailyTargetId', 'TargetDate', 'TargetAmount'],

  // TargetDateはGoogleスプレッドシートが自動的に日付型に変換して保存することがあるため、
  // 読み込み時に"yyyy-MM-dd"形式の文字列へ正規化する（SheetUtil.normalizeDateKey参照）
  findAll: function () {
    var sheet = SpreadsheetConfig.getSheet('DailyTarget');
    var values = sheet.getDataRange().getValues();
    return SheetUtil.rowsToObjects(values).map(function (t) {
      t.TargetDate = SheetUtil.normalizeDateKey(t.TargetDate, 'yyyy-MM-dd');
      return t;
    });
  },

  findByMonth: function (yearMonth) {
    return this.findAll().filter(function (t) {
      return t.TargetDate.indexOf(yearMonth) === 0;
    });
  },

  // 対象月の既存行を全て削除し、rowsで置き換える（月単位の一括保存用）
  replaceMonth: function (yearMonth, rows) {
    var sheet = SpreadsheetConfig.getSheet('DailyTarget');
    SheetUtil.deleteRowsByPredicate(sheet, function (obj) {
      return SheetUtil.normalizeDateKey(obj.TargetDate, 'yyyy-MM-dd').indexOf(yearMonth) === 0;
    });
    var self = this;
    rows.forEach(function (row) {
      sheet.appendRow(SheetUtil.objectToRow(self.HEADERS, row));
    });
  }
};
