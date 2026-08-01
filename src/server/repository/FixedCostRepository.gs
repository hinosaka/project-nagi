// データアクセス層：FixedCostシートの読み書き。固定費目標逆算（予算管理）で使う項目別の固定費一覧。
// 日付を持たない現在値のマスタ（家賃改定等があれば都度上書きする運用。履歴は持たない）
var FixedCostRepository = {
  HEADERS: ['FixedCostId', 'Name', 'Amount'],

  findAll: function () {
    var sheet = SpreadsheetConfig.getSheet('FixedCost');
    var values = sheet.getDataRange().getValues();
    return SheetUtil.rowsToObjects(values);
  },

  save: function (item) {
    var sheet = SpreadsheetConfig.getSheet('FixedCost');
    var row = SheetUtil.objectToRow(this.HEADERS, item);
    var rowIndex = SheetUtil.findRowIndexById(sheet, 'FixedCostId', item.FixedCostId);

    if (rowIndex === -1) {
      sheet.appendRow(row);
    } else {
      sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
    }
  },

  deleteById: function (fixedCostId) {
    var sheet = SpreadsheetConfig.getSheet('FixedCost');
    SheetUtil.deleteRowsByColumnValue(sheet, 'FixedCostId', fixedCostId);
  }
};
