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
  ensureSalesDetailCategoryMediumColumn_(spreadsheet);
  ensureBusinessDaySheet_(spreadsheet);
  ensureBusinessDayStartingCashColumn_(spreadsheet);
  ensureSalesTargetSheet_(spreadsheet);
  ensureRegisterCloseLogSheet_(spreadsheet);
  ensureFixedCostSheet_(spreadsheet);
  ensureBudgetSettingsSheet_(spreadsheet);
  ensureDailyTargetSheet_(spreadsheet);
  ensureCategorySheet_(spreadsheet);
  ensureSubCategorySheet_(spreadsheet);
  ensureCategoryMasterSeeded_(spreadsheet);
  repairCustomerFirstVisitDates_(spreadsheet);
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
  sheet.appendRow(['SalesDetailId', 'SalesId', 'MenuId', 'MenuName', 'UnitPrice', 'UnitCost', 'Quantity', 'Subtotal', 'CustomerId', 'CategoryLarge', 'CategoryMedium']);
}

// 既存のSalesDetailシートに後から追加した列（CategoryMedium）のヘッダーが無ければ追記する。
// ensureXxxSheet_はシート新規作成時のみ実行されるため、既存シートへの列追加は別途ここで行う。
// 列位置はSalesDetailRepository.HEADERS（スキーマ定義の正）の末尾位置を直接使う。
// getLastColumn()（実データの有無）から判定すると、ヘッダー行の更新前に新列へのデータ書き込みが
// 先行した場合に「最終列」の認識がずれ、ヘッダーが1列右にずれて付与されるバグがあったため
function ensureSalesDetailCategoryMediumColumn_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName('SalesDetail');
  if (!sheet) {
    return;
  }
  var targetColumn = SalesDetailRepository.HEADERS.length;
  var currentValue = sheet.getRange(1, targetColumn).getValue();
  if (currentValue !== 'CategoryMedium') {
    sheet.getRange(1, targetColumn).setValue('CategoryMedium');
  }
}

function ensureBusinessDaySheet_(spreadsheet) {
  if (spreadsheet.getSheetByName('BusinessDay')) {
    return;
  }
  var sheet = spreadsheet.insertSheet('BusinessDay');
  sheet.appendRow(['BusinessDayId', 'SalesDate', 'DayOfWeek', 'Weather', 'StartingCash']);
}

// 既存のBusinessDayシートに後から追加した列（StartingCash）のヘッダーが無ければ追記する。
// ensureSalesDetailCategoryMediumColumn_と同じく、固定位置（HEADERSの末尾）で判定する
function ensureBusinessDayStartingCashColumn_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName('BusinessDay');
  if (!sheet) {
    return;
  }
  var targetColumn = BusinessDayRepository.HEADERS.length;
  var currentValue = sheet.getRange(1, targetColumn).getValue();
  if (currentValue !== 'StartingCash') {
    sheet.getRange(1, targetColumn).setValue('StartingCash');
  }
}

function ensureSalesTargetSheet_(spreadsheet) {
  if (spreadsheet.getSheetByName('SalesTarget')) {
    return;
  }
  var sheet = spreadsheet.insertSheet('SalesTarget');
  sheet.appendRow(['SalesTargetId', 'TargetMonth', 'TargetAmount', 'Note']);
}

function ensureRegisterCloseLogSheet_(spreadsheet) {
  if (spreadsheet.getSheetByName('RegisterCloseLog')) {
    return;
  }
  var sheet = spreadsheet.insertSheet('RegisterCloseLog');
  sheet.appendRow(['RegisterCloseLogId', 'SalesDate', 'StartingCash', 'CashSalesAmount', 'ExpectedCashBalance', 'ClosedAt']);
}

function ensureFixedCostSheet_(spreadsheet) {
  if (spreadsheet.getSheetByName('FixedCost')) {
    return;
  }
  var sheet = spreadsheet.insertSheet('FixedCost');
  sheet.appendRow(['FixedCostId', 'TargetMonth', 'Name', 'Amount']);
}

// 単一行のみを持つ設定シート。目標利益率（%の整数値）を2行目1列目に保持する
function ensureBudgetSettingsSheet_(spreadsheet) {
  if (spreadsheet.getSheetByName('BudgetSettings')) {
    return;
  }
  var sheet = spreadsheet.insertSheet('BudgetSettings');
  sheet.appendRow(['TargetProfitRate']);
  sheet.appendRow([0]);
}

function ensureDailyTargetSheet_(spreadsheet) {
  if (spreadsheet.getSheetByName('DailyTarget')) {
    return;
  }
  var sheet = spreadsheet.insertSheet('DailyTarget');
  sheet.appendRow(['DailyTargetId', 'TargetDate', 'TargetAmount']);
}

function ensureCategorySheet_(spreadsheet) {
  if (spreadsheet.getSheetByName('Category')) {
    return;
  }
  var sheet = spreadsheet.insertSheet('Category');
  sheet.appendRow(['CategoryId', 'CategoryName']);
}

function ensureSubCategorySheet_(spreadsheet) {
  if (spreadsheet.getSheetByName('SubCategory')) {
    return;
  }
  var sheet = spreadsheet.insertSheet('SubCategory');
  sheet.appendRow(['SubCategoryId', 'CategoryId', 'SubCategoryName', 'SortOrder']);
}

// Category/SubCategoryシートを新設した際、既存のMenuシートに入力済みの大分類・中分類の値から
// カテゴリー・サブカテゴリーマスタを一度だけ生成する（Categoryシートが空の場合のみ実行する一回限りの移行処理）。
// 商品管理画面（SCR-003）はカテゴリー・サブカテゴリーをこのマスタから選択する方式に変更したため、
// 既存商品が引き続き同じ分類のまま表示・管理できるようにする
function ensureCategoryMasterSeeded_(spreadsheet) {
  var categorySheet = spreadsheet.getSheetByName('Category');
  var subCategorySheet = spreadsheet.getSheetByName('SubCategory');
  var menuSheet = spreadsheet.getSheetByName('Menu');
  if (!categorySheet || !subCategorySheet || !menuSheet) {
    return;
  }
  if (categorySheet.getLastRow() > 1) {
    return;
  }

  var menus = SheetUtil.rowsToObjects(menuSheet.getDataRange().getValues());
  if (menus.length === 0) {
    return;
  }

  var categoryIdByName = {};
  var categoryIds = [];
  var categoryRows = [];
  var subCategoryIds = [];
  var subCategoryRows = [];
  var sortOrderByCategoryId = {};

  menus.forEach(function (menu) {
    var largeName = menu.CategoryLarge;
    var mediumName = menu.CategoryMedium;
    if (!largeName) {
      return;
    }
    if (!categoryIdByName[largeName]) {
      var categoryId = SequentialIdRule.generateNext('CAT', categoryIds);
      categoryIds.push(categoryId);
      categoryIdByName[largeName] = categoryId;
      categoryRows.push([categoryId, largeName]);
      sortOrderByCategoryId[categoryId] = 0;
    }
    if (!mediumName) {
      return;
    }
    var categoryId = categoryIdByName[largeName];
    var alreadyExists = subCategoryRows.some(function (row) {
      return row[1] === categoryId && row[2] === mediumName;
    });
    if (alreadyExists) {
      return;
    }
    sortOrderByCategoryId[categoryId] += 1;
    var subCategoryId = SequentialIdRule.generateNext('SCT', subCategoryIds);
    subCategoryIds.push(subCategoryId);
    subCategoryRows.push([subCategoryId, categoryId, mediumName, sortOrderByCategoryId[categoryId]]);
  });

  if (categoryRows.length > 0) {
    categorySheet.getRange(2, 1, categoryRows.length, 2).setValues(categoryRows);
  }
  if (subCategoryRows.length > 0) {
    subCategorySheet.getRange(2, 1, subCategoryRows.length, 4).setValues(subCategoryRows);
  }
}

// 過去の実装ではFirstVisitDateに顧客登録時点の日時をそのまま使っており、Sales実データ（初回の
// 実際の来店日）と一致しない場合があった。Sales実データから都度算出し直すだけの処理のため、
// 何度実行しても安全（setupDatabase()を再実行するたびに補正される）
function repairCustomerFirstVisitDates_(spreadsheet) {
  var customerSheet = spreadsheet.getSheetByName('Customer');
  var salesSheet = spreadsheet.getSheetByName('Sales');
  if (!customerSheet || !salesSheet) {
    return;
  }

  CustomerRepository.findAll().forEach(function (customer) {
    var stats = VisitStatsCalculator.calc(SalesRepository.findByCustomerId(customer.CustomerId));
    if (!stats.FirstVisitDate) {
      return;
    }
    if (new Date(customer.FirstVisitDate).getTime() !== stats.FirstVisitDate.getTime()) {
      customer.FirstVisitDate = stats.FirstVisitDate;
      CustomerRepository.save(customer);
    }
  });
}

function removeUnusedDefaultSheet_(spreadsheet) {
  var defaultSheet = spreadsheet.getSheetByName('Sheet1');
  if (defaultSheet && spreadsheet.getSheets().length > 1) {
    spreadsheet.deleteSheet(defaultSheet);
  }
}
