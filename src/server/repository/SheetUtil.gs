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

  // マスタ系リポジトリのsave()共通処理：idColumnNameの値でidValueと一致する行を探し、
  // あれば上書き、なければ追記する。ほぼ全リポジトリのsave()が同じ形だったため、ここに集約した
  upsertByRow: function (sheet, headers, idColumnName, idValue, obj) {
    var row = this.objectToRow(headers, obj);
    var rowIndex = this.findRowIndexById(sheet, idColumnName, idValue);
    if (rowIndex === -1) {
      sheet.appendRow(row);
    } else {
      sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
    }
  },

  // upsertByRowの複数件版。1回のgetDataRange読み込みで全行のID→行位置を解決し、既存行の更新は
  // 対象範囲全体を1回のsetValuesでまとめて書き戻す（変更のない行もその場の値のまま書き戻すだけなので
  // 実害はない）。1件ずつupsertByRowを呼ぶ場合に比べ、保存件数が多いほどAPI呼び出し回数を大きく
  // 減らせる（複数商品をまとめて保存する画面で、件数分の読み込み・書き込みが体感の重さや、GAS側の
  // 一過性の応答エラーの原因になっていたための対策）
  upsertManyByRow: function (sheet, headers, idColumnName, items) {
    var values = sheet.getDataRange().getValues();
    var idColumnIndex = headers.indexOf(idColumnName);
    var rowIndexByValue = {};
    for (var i = 1; i < values.length; i++) {
      rowIndexByValue[values[i][idColumnIndex]] = i;
    }
    var self = this;
    var newRows = [];
    items.forEach(function (obj) {
      var row = self.objectToRow(headers, obj);
      var rowIndex = rowIndexByValue[obj[idColumnName]];
      if (rowIndex !== undefined) {
        values[rowIndex] = row;
      } else {
        newRows.push(row);
      }
    });
    if (values.length > 1) {
      sheet.getRange(1, 1, values.length, headers.length).setValues(values);
    }
    newRows.forEach(function (row) { sheet.appendRow(row); });
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
