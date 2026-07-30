// 初回のみ、Apps Scriptエディタから手動実行する。データベース（スプレッドシート）を新規作成し、
// Script PropertiesにSPREADSHEET_IDを保存する。既に作成済みの場合は何もしない
function setupDatabase() {
  var existingId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (existingId) {
    Logger.log('既に作成済みです。SPREADSHEET_ID=' + existingId);
    return;
  }

  var spreadsheet = SpreadsheetApp.create('pos-app DB');

  var menuSheet = spreadsheet.getSheets()[0];
  menuSheet.setName('Menu');
  menuSheet.appendRow(['MenuId', 'MenuName', 'Price', 'Cost', 'CategoryLarge', 'CategoryMedium', 'IsActive']);

  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', spreadsheet.getId());
  Logger.log('作成しました。URL=' + spreadsheet.getUrl());
}
