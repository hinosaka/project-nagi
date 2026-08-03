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
    SheetUtil.upsertByRow(sheet, this.HEADERS, 'MenuId', menu.MenuId, menu);
  },

  deleteById: function (menuId) {
    var sheet = SpreadsheetConfig.getSheet('Menu');
    SheetUtil.deleteRowsByColumnValue(sheet, 'MenuId', menuId);
  }
};
