// データアクセス層：ExpenseVendorシート（経費の取引先マスタ。仕入れ先・家賃の貸主等）の読み書き。
// Customerと同じく論理削除（IsActive）で管理する
var ExpenseVendorRepository = {
  HEADERS: ['ExpenseVendorId', 'ExpenseVendorName', 'IsActive'],

  findAll: function () {
    var sheet = SpreadsheetConfig.getSheet('ExpenseVendor');
    var values = sheet.getDataRange().getValues();
    return SheetUtil.rowsToObjects(values);
  },

  save: function (vendor) {
    var sheet = SpreadsheetConfig.getSheet('ExpenseVendor');
    SheetUtil.upsertByRow(sheet, this.HEADERS, 'ExpenseVendorId', vendor.ExpenseVendorId, vendor);
  }
};
