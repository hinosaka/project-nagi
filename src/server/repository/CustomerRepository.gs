// データアクセス層：Customerシートの読み書き
var CustomerRepository = {
  HEADERS: ['CustomerId', 'CustomerName', 'PhoneNumber', 'FirstVisitDate', 'LastVisitDate', 'VisitCount', 'IsActive', 'Memo'],

  findAll: function () {
    var sheet = SpreadsheetConfig.getSheet('Customer');
    var values = sheet.getDataRange().getValues();
    return SheetUtil.rowsToObjects(values);
  },

  save: function (customer) {
    var sheet = SpreadsheetConfig.getSheet('Customer');
    SheetUtil.upsertByRow(sheet, this.HEADERS, 'CustomerId', customer.CustomerId, customer);
  }
};
