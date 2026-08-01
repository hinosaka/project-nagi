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
  },

  // 指定列の値が一致する行を全て物理削除する（Sales/SalesDetailなど実削除を許可するデータ用）
  deleteRowsByColumnValue: function (sheet, columnName, value) {
    var values = sheet.getDataRange().getValues();
    var headers = values[0];
    var colIndex = headers.indexOf(columnName);
    for (var i = values.length - 1; i >= 1; i--) {
      if (values[i][colIndex] === value) {
        sheet.deleteRow(i + 1);
      }
    }
  },

  // predicate(rowObject)がtrueを返す行を全て物理削除する（年単位の一括置き換え等、単純な列一致では
  // 表現できない条件で削除したい場合に使う）
  deleteRowsByPredicate: function (sheet, predicate) {
    var values = sheet.getDataRange().getValues();
    var objects = this.rowsToObjects(values);
    for (var i = objects.length - 1; i >= 0; i--) {
      if (predicate(objects[i])) {
        sheet.deleteRow(i + 2); // +1はヘッダー行、+1は1始まり
      }
    }
  },

  // "2026-07"のような文字列をシートに書き込んでも、Googleスプレッドシートが自動的に日付型に
  // 変換して保存することがある（セルの表示は元の文字列のように見えても、Apps Scriptからは
  // Dateオブジェクトとして返ってくる）。yyyy-MM／yyyy-MM-dd形式の文字列をキーとして扱う列
  // （TargetMonth, TargetDate等）はこれで正規化してから使う
  normalizeDateKey: function (value, format) {
    if (Object.prototype.toString.call(value) === '[object Date]') {
      return Utilities.formatDate(value, Session.getScriptTimeZone(), format);
    }
    return String(value);
  }
};
