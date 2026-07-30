// データアクセス層共通：唯一のデータベース（スプレッドシート）への接続を取得する
var SpreadsheetConfig = {
  getSpreadsheet: function () {
    var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!id) {
      throw new Error('SPREADSHEET_IDが未設定です。setupDatabase()を実行してください。');
    }
    return SpreadsheetApp.openById(id);
  },

  getSheet: function (sheetName) {
    var sheet = this.getSpreadsheet().getSheetByName(sheetName);
    if (!sheet) {
      throw new Error('シートが見つかりません：' + sheetName);
    }
    return sheet;
  }
};
