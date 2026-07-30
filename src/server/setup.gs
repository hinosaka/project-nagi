// Apps Scriptエディタから手動実行する。データベース（スプレッドシート）が未作成なら新規作成し、
// 未作成のシートがあれば追加する（既存シートには触れない）。新しいシートを追加した際は、この関数に
// ensure〜Sheet_を追加したうえで再実行すればよい
function setupDatabase() {
  var spreadsheet = getOrCreateSpreadsheet_();
  ensureMenuSheet_(spreadsheet);
  ensureSeatSheet_(spreadsheet);
  ensureCustomerSheet_(spreadsheet);
  ensureSalesSheet_(spreadsheet);
  ensureSalesDetailSheet_(spreadsheet);
  ensureBusinessDaySheet_(spreadsheet);
  ensureSalesTargetSheet_(spreadsheet);
  removeUnusedDefaultSheet_(spreadsheet);
  Logger.log('セットアップ完了。URL=' + spreadsheet.getUrl());
}

function getOrCreateSpreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (id) {
    return SpreadsheetApp.openById(id);
  }
  var spreadsheet = SpreadsheetApp.create('店長のノート DB');
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', spreadsheet.getId());
  return spreadsheet;
}

function ensureMenuSheet_(spreadsheet) {
  if (spreadsheet.getSheetByName('Menu')) {
    return;
  }
  var sheet = spreadsheet.insertSheet('Menu');
  sheet.appendRow(['MenuId', 'MenuName', 'Price', 'Cost', 'CategoryLarge', 'CategoryMedium', 'IsActive']);
}

function ensureSeatSheet_(spreadsheet) {
  if (spreadsheet.getSheetByName('Seat')) {
    return;
  }
  var sheet = spreadsheet.insertSheet('Seat');
  sheet.appendRow(['SeatId', 'SeatType', 'Capacity', 'IsActive']);
  for (var i = 1; i <= 8; i++) {
    sheet.appendRow(['C' + i, 'カウンター', 1, true]);
  }
  sheet.appendRow(['TA', 'テーブル', 4, true]);
  sheet.appendRow(['TB', 'テーブル', 4, true]);
}

function ensureCustomerSheet_(spreadsheet) {
  if (spreadsheet.getSheetByName('Customer')) {
    return;
  }
  var sheet = spreadsheet.insertSheet('Customer');
  sheet.appendRow(['CustomerId', 'CustomerName', 'PhoneNumber', 'FirstVisitDate', 'LastVisitDate', 'VisitCount', 'IsActive', 'Memo']);
}

function ensureSalesSheet_(spreadsheet) {
  if (spreadsheet.getSheetByName('Sales')) {
    return;
  }
  var sheet = spreadsheet.insertSheet('Sales');
  sheet.appendRow(['SalesId', 'SalesDate', 'CustomerId', 'SeatId', 'PartySize', 'TotalAmount', 'Note', 'RegisteredAt']);
}

function ensureSalesDetailSheet_(spreadsheet) {
  if (spreadsheet.getSheetByName('SalesDetail')) {
    return;
  }
  var sheet = spreadsheet.insertSheet('SalesDetail');
  sheet.appendRow(['SalesDetailId', 'SalesId', 'MenuId', 'MenuName', 'UnitPrice', 'UnitCost', 'Quantity', 'Subtotal', 'CustomerId', 'CategoryLarge']);
}

function ensureBusinessDaySheet_(spreadsheet) {
  if (spreadsheet.getSheetByName('BusinessDay')) {
    return;
  }
  var sheet = spreadsheet.insertSheet('BusinessDay');
  sheet.appendRow(['BusinessDayId', 'SalesDate', 'DayOfWeek', 'Weather']);
}

function ensureSalesTargetSheet_(spreadsheet) {
  if (spreadsheet.getSheetByName('SalesTarget')) {
    return;
  }
  var sheet = spreadsheet.insertSheet('SalesTarget');
  sheet.appendRow(['SalesTargetId', 'TargetMonth', 'TargetAmount', 'Note']);
}

function removeUnusedDefaultSheet_(spreadsheet) {
  var defaultSheet = spreadsheet.getSheetByName('Sheet1');
  if (defaultSheet && spreadsheet.getSheets().length > 1) {
    spreadsheet.deleteSheet(defaultSheet);
  }
}
