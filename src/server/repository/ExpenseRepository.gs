// データアクセス層：Expenseシート（経費実績）の読み書き。Salesと同じく、登録・修正・削除の
// たびに実データを直接更新する（論理削除ではない、入力ミスの訂正を随時許可する方針）
var ExpenseRepository = {
  // ExpenseVendorIdは後から追加した列のため末尾に置く（DATABASE.md命名規則：既存カラムの位置は変更しない）
  HEADERS: ['ExpenseId', 'ExpenseDate', 'ExpenseCategoryId', 'Amount', 'Note', 'RegisteredAt', 'ExpenseVendorId'],

  findAll: function () {
    var sheet = SpreadsheetConfig.getSheet('Expense');
    var values = sheet.getDataRange().getValues();
    return SheetUtil.rowsToObjects(values);
  },

  findByMonth: function (yearMonth) {
    return this.findAll().filter(function (e) {
      return DateUtil.formatYm(e.ExpenseDate) === yearMonth;
    });
  },

  save: function (expense) {
    var sheet = SpreadsheetConfig.getSheet('Expense');
    SheetUtil.upsertByRow(sheet, this.HEADERS, 'ExpenseId', expense.ExpenseId, expense);
  },

  deleteById: function (expenseId) {
    var sheet = SpreadsheetConfig.getSheet('Expense');
    SheetUtil.deleteRowsByColumnValue(sheet, 'ExpenseId', expenseId);
  }
};
