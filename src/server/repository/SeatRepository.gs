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
    SheetUtil.upsertByRow(sheet, this.HEADERS, 'SeatId', seat.SeatId, seat);
  }
};
