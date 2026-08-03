// データアクセス層：Menuシートの読み書き
var MenuRepository = {
  HEADERS: ['MenuId', 'MenuName', 'Price', 'Cost', 'CategoryLarge', 'CategoryMedium', 'IsActive', 'SortOrder'],

  findAll: function () {
    var sheet = SpreadsheetConfig.getSheet('Menu');
    var values = sheet.getDataRange().getValues();
    return SheetUtil.rowsToObjects(values);
  },

  save: function (menu) {
    var sheet = SpreadsheetConfig.getSheet('Menu');
    var row = SheetUtil.objectToRow(this.HEADERS, menu);
    var rowIndex = SheetUtil.findRowIndexById(sheet, 'MenuId', menu.MenuId);

    if (rowIndex === -1) {
      sheet.appendRow(row);
    } else {
      sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
    }
  },

  deleteById: function (menuId) {
    var sheet = SpreadsheetConfig.getSheet('Menu');
    SheetUtil.deleteRowsByColumnValue(sheet, 'MenuId', menuId);
  }
};
