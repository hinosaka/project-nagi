// データアクセス層：ExpenseCategoryシート（経費区分マスタ。仕入れ／家賃／水道光熱費等）の読み書き。
// Menu/Seatと同じく論理削除（IsActive）で管理する
var ExpenseCategoryRepository = {
  HEADERS: ['ExpenseCategoryId', 'ExpenseCategoryName', 'SortOrder', 'IsActive', 'IsCostOfGoods'],

  findAll: function () {
    var sheet = SpreadsheetConfig.getSheet('ExpenseCategory');
    var values = sheet.getDataRange().getValues();
    return SheetUtil.rowsToObjects(values);
  },

  save: function (category) {
    var sheet = SpreadsheetConfig.getSheet('ExpenseCategory');
    SheetUtil.upsertByRow(sheet, this.HEADERS, 'ExpenseCategoryId', category.ExpenseCategoryId, category);
  }
};
