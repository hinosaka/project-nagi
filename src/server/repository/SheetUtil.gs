// データアクセス層共通：シートの2次元配列とプレーンオブジェクトを相互変換する（ヘッダー名ベース）
var SheetUtil = {
  rowsToObjects: function (values) {
    var headers = values[0];
    var rows = values.slice(1);
    return rows.map(function (row) {
      var obj = {};
      headers.forEach(function (header, i) {
        obj[header] = row[i];
      });
      return obj;
    });
  },

  objectToRow: function (headers, obj) {
    return headers.map(function (header) {
      return obj[header] !== undefined ? obj[header] : '';
    });
  },

  findRowIndexById: function (sheet, idColumnName, idValue) {
    var values = sheet.getDataRange().getValues();
    var headers = values[0];
    var idColumnIndex = headers.indexOf(idColumnName);
    for (var i = 1; i < values.length; i++) {
      if (values[i][idColumnIndex] === idValue) {
        return i + 1; // 1始まり・ヘッダー行込みのシート上の行番号
      }
    }
    return -1;
  }
};
