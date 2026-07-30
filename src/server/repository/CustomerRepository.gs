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
    var row = SheetUtil.objectToRow(this.HEADERS, customer);
    var rowIndex = SheetUtil.findRowIndexById(sheet, 'CustomerId', customer.CustomerId);

    if (rowIndex === -1) {
      sheet.appendRow(row);
    } else {
      sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
    }
  }
};
