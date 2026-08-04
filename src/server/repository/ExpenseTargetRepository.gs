// データアクセス層：ExpenseTargetシート（経費区分ごとの月次予定額）の読み書き。
// 1区分・1ヶ月につき1行（SalesTargetの区分別版）
var ExpenseTargetRepository = {
  HEADERS: ['ExpenseTargetId', 'TargetMonth', 'ExpenseCategoryId', 'TargetAmount', 'Note'],

  // TargetMonthはGoogleスプレッドシートが自動的に日付型に変換して保存することがあるため、
  // 読み込み時に"yyyy-MM"形式の文字列へ正規化する（SheetUtil.normalizeDateKey参照）
  findAll: function () {
    var sheet = SpreadsheetConfig.getSheet('ExpenseTarget');
    var values = sheet.getDataRange().getValues();
    return SheetUtil.rowsToObjects(values).map(function (t) {
      t.TargetMonth = SheetUtil.normalizeDateKey(t.TargetMonth, 'yyyy-MM');
      return t;
    });
  },

  findByMonth: function (targetMonth) {
    return this.findAll().filter(function (t) {
      return t.TargetMonth === targetMonth;
    });
  },

  save: function (target) {
    var sheet = SpreadsheetConfig.getSheet('ExpenseTarget');
    SheetUtil.upsertByRow(sheet, this.HEADERS, 'ExpenseTargetId', target.ExpenseTargetId, target);
  }
};
