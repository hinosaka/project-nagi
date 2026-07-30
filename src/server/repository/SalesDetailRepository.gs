// データアクセス層：SalesDetailシートの読み書き
var SalesDetailRepository = {
  HEADERS: ['SalesDetailId', 'SalesId', 'MenuId', 'MenuName', 'UnitPrice', 'UnitCost', 'Quantity', 'Subtotal', 'CustomerId', 'CategoryLarge'],

  findAll: function () {
    var sheet = SpreadsheetConfig.getSheet('SalesDetail');
    var values = sheet.getDataRange().getValues();
    return SheetUtil.rowsToObjects(values);
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
  },

  deleteBySalesId: function (salesId) {
    var sheet = SpreadsheetConfig.getSheet('SalesDetail');
    SheetUtil.deleteRowsByColumnValue(sheet, 'SalesId', salesId);
  }
};
