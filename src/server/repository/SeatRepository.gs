// データアクセス層：Seatシートの読み書き
var SeatRepository = {
  HEADERS: ['SeatId', 'SeatType', 'Capacity', 'IsActive'],

  findAll: function () {
    var sheet = SpreadsheetConfig.getSheet('Seat');
    var values = sheet.getDataRange().getValues();
    return SheetUtil.rowsToObjects(values);
  },

  save: function (seat) {
    var sheet = SpreadsheetConfig.getSheet('Seat');
    var row = SheetUtil.objectToRow(this.HEADERS, seat);
    var rowIndex = SheetUtil.findRowIndexById(sheet, 'SeatId', seat.SeatId);

    if (rowIndex === -1) {
      sheet.appendRow(row);
    } else {
      sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
    }
  }
};
