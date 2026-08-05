// Apps Scriptエディタから手動実行する。データベース（スプレッドシート）が未作成なら新規作成し、
// 未作成のシートがあれば追加する（既存シートには触れない）。新しいシートを追加した際は、この関数に
// ensure〜Sheet_を追加したうえで再実行すればよい
function setupDatabase() {
  var spreadsheet = getOrCreateSpreadsheet_();
  ensureMenuSheet_(spreadsheet);
  ensureMenuSortOrderColumn_(spreadsheet);
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
  ensureExpenseCategorySheet_(spreadsheet);
  ensureExpenseCategorySeeded_(spreadsheet);
  ensureExpenseCategoryCostFlagColumn_(spreadsheet);
  ensureExpenseTargetSheet_(spreadsheet);
  ensureExpenseSheet_(spreadsheet);
  ensureExpenseVendorSheet_(spreadsheet);
  ensureExpenseVendorIdColumn_(spreadsheet);
  repairCustomerFirstVisitDates_(spreadsheet);
  removeUnusedDefaultSheet_(spreadsheet);
  Logger.log('セットアップ完了。URL=' + spreadsheet.getUrl());
}

// Apps Scriptエディタから手動で一度だけ実行する。既存のスプレッドシートのタブ名を、
// SpreadsheetConfig.SHEET_DISPLAY_NAMES_のマッピングに従って日本語表示名にリネームする
// （データ・列構成・コード上の参照名は一切変更しない。タブの見た目だけを変える）。
// 新規セットアップ（setupDatabase()）では最初から日本語名でシートが作られるため、
// 既にある店舗のスプレッドシートに対してのみ実行すればよい。既に日本語名になっている
// シートはgetSheetByNameで見つからず何もしないため、何度実行しても安全
function renameSheetsToJapanese() {
  var spreadsheet = SpreadsheetConfig.getSpreadsheet();
  Object.keys(SHEET_DISPLAY_NAMES_).forEach(function (logicalName) {
    var displayName = SHEET_DISPLAY_NAMES_[logicalName];
    var sheet = spreadsheet.getSheetByName(logicalName);
    if (sheet && logicalName !== displayName) {
      sheet.setName(displayName);
      Logger.log(logicalName + ' → ' + displayName);
    }
  });
  Logger.log('シート名のリネームが完了しました');
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
  if (spreadsheet.getSheetByName(SpreadsheetConfig.displayName('Menu'))) {
    return;
  }
  var sheet = spreadsheet.insertSheet(SpreadsheetConfig.displayName('Menu'));
  sheet.appendRow(['MenuId', 'MenuName', 'Price', 'Cost', 'CategoryLarge', 'CategoryMedium', 'IsActive']);
}

function ensureSeatSheet_(spreadsheet) {
  if (spreadsheet.getSheetByName(SpreadsheetConfig.displayName('Seat'))) {
    return;
  }
  var sheet = spreadsheet.insertSheet(SpreadsheetConfig.displayName('Seat'));
  sheet.appendRow(['SeatId', 'SeatType', 'Capacity', 'IsActive']);
  for (var i = 1; i <= 8; i++) {
    sheet.appendRow(['C' + i, 'カウンター', 1, true]);
  }
  sheet.appendRow(['TA', 'テーブル', 4, true]);
  sheet.appendRow(['TB', 'テーブル', 4, true]);
}

function ensureCustomerSheet_(spreadsheet) {
  if (spreadsheet.getSheetByName(SpreadsheetConfig.displayName('Customer'))) {
    return;
  }
  var sheet = spreadsheet.insertSheet(SpreadsheetConfig.displayName('Customer'));
  sheet.appendRow(['CustomerId', 'CustomerName', 'PhoneNumber', 'FirstVisitDate', 'LastVisitDate', 'VisitCount', 'IsActive', 'Memo']);
}

function ensureSalesSheet_(spreadsheet) {
  if (spreadsheet.getSheetByName(SpreadsheetConfig.displayName('Sales'))) {
    return;
  }
  var sheet = spreadsheet.insertSheet(SpreadsheetConfig.displayName('Sales'));
  sheet.appendRow(['SalesId', 'SalesDate', 'CustomerId', 'SeatId', 'PartySize', 'TotalAmount', 'Note', 'RegisteredAt']);
}

function ensureSalesDetailSheet_(spreadsheet) {
  if (spreadsheet.getSheetByName(SpreadsheetConfig.displayName('SalesDetail'))) {
    return;
  }
  var sheet = spreadsheet.insertSheet(SpreadsheetConfig.displayName('SalesDetail'));
  sheet.appendRow(['SalesDetailId', 'SalesId', 'MenuId', 'MenuName', 'UnitPrice', 'UnitCost', 'Quantity', 'Subtotal', 'CustomerId', 'CategoryLarge', 'CategoryMedium']);
}

// 既存のSalesDetailシートに後から追加した列（CategoryMedium）のヘッダーが無ければ追記する。
// ensureXxxSheet_はシート新規作成時のみ実行されるため、既存シートへの列追加は別途ここで行う。
// 列位置はSalesDetailRepository.HEADERS（スキーマ定義の正）の末尾位置を直接使う。
// getLastColumn()（実データの有無）から判定すると、ヘッダー行の更新前に新列へのデータ書き込みが
// 先行した場合に「最終列」の認識がずれ、ヘッダーが1列右にずれて付与されるバグがあったため
// 既存のMenuシートに後から追加した列（SortOrder、商品一覧のドラッグ並び替え用）のヘッダーが
// 無ければ追記し、既存行の値が空の場合は現状の表示順（大分類・中分類ごとに商品名のあいうえお順）を
// 初期値として書き戻す（ドラッグ操作をするまでは今までの見た目の並び順を維持するため）
function ensureMenuSortOrderColumn_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(SpreadsheetConfig.displayName('Menu'));
  if (!sheet) {
    return;
  }
  var targetColumn = MenuRepository.HEADERS.length;
  if (sheet.getRange(1, targetColumn).getValue() !== 'SortOrder') {
    sheet.getRange(1, targetColumn).setValue('SortOrder');
  }

  var menus = MenuRepository.findAll();
  if (menus.every(function (m) { return m.SortOrder !== '' && m.SortOrder !== null && m.SortOrder !== undefined; })) {
    return;
  }
  var groups = {};
  menus.forEach(function (m) {
    var key = m.CategoryLarge + ' ' + m.CategoryMedium;
    if (!groups[key]) { groups[key] = []; }
    groups[key].push(m);
  });
  Object.keys(groups).forEach(function (key) {
    groups[key]
      .sort(function (a, b) { return (a.MenuName || '').localeCompare(b.MenuName || '', 'ja'); })
      .forEach(function (m, i) {
        if (m.SortOrder === '' || m.SortOrder === null || m.SortOrder === undefined) {
          m.SortOrder = i + 1;
          MenuRepository.save(m);
        }
      });
  });
}

function ensureSalesDetailCategoryMediumColumn_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(SpreadsheetConfig.displayName('SalesDetail'));
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
  if (spreadsheet.getSheetByName(SpreadsheetConfig.displayName('BusinessDay'))) {
    return;
  }
  var sheet = spreadsheet.insertSheet(SpreadsheetConfig.displayName('BusinessDay'));
  sheet.appendRow(['BusinessDayId', 'SalesDate', 'DayOfWeek', 'Weather', 'StartingCash']);
}

// 既存のBusinessDayシートに後から追加した列（StartingCash）のヘッダーが無ければ追記する。
// ensureSalesDetailCategoryMediumColumn_と同じく、固定位置（HEADERSの末尾）で判定する
function ensureBusinessDayStartingCashColumn_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(SpreadsheetConfig.displayName('BusinessDay'));
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
  if (spreadsheet.getSheetByName(SpreadsheetConfig.displayName('SalesTarget'))) {
    return;
  }
  var sheet = spreadsheet.insertSheet(SpreadsheetConfig.displayName('SalesTarget'));
  sheet.appendRow(['SalesTargetId', 'TargetMonth', 'TargetAmount', 'Note']);
}

function ensureRegisterCloseLogSheet_(spreadsheet) {
  if (spreadsheet.getSheetByName(SpreadsheetConfig.displayName('RegisterCloseLog'))) {
    return;
  }
  var sheet = spreadsheet.insertSheet(SpreadsheetConfig.displayName('RegisterCloseLog'));
  sheet.appendRow(['RegisterCloseLogId', 'SalesDate', 'StartingCash', 'CashSalesAmount', 'ExpectedCashBalance', 'ClosedAt']);
}

function ensureFixedCostSheet_(spreadsheet) {
  if (spreadsheet.getSheetByName(SpreadsheetConfig.displayName('FixedCost'))) {
    return;
  }
  var sheet = spreadsheet.insertSheet(SpreadsheetConfig.displayName('FixedCost'));
  sheet.appendRow(['FixedCostId', 'TargetMonth', 'Name', 'Amount']);
}

// 単一行のみを持つ設定シート。目標利益率（%の整数値）を2行目1列目に保持する
function ensureBudgetSettingsSheet_(spreadsheet) {
  if (spreadsheet.getSheetByName(SpreadsheetConfig.displayName('BudgetSettings'))) {
    return;
  }
  var sheet = spreadsheet.insertSheet(SpreadsheetConfig.displayName('BudgetSettings'));
  sheet.appendRow(['TargetProfitRate']);
  sheet.appendRow([0]);
}

function ensureDailyTargetSheet_(spreadsheet) {
  if (spreadsheet.getSheetByName(SpreadsheetConfig.displayName('DailyTarget'))) {
    return;
  }
  var sheet = spreadsheet.insertSheet(SpreadsheetConfig.displayName('DailyTarget'));
  sheet.appendRow(['DailyTargetId', 'TargetDate', 'TargetAmount']);
}

function ensureCategorySheet_(spreadsheet) {
  if (spreadsheet.getSheetByName(SpreadsheetConfig.displayName('Category'))) {
    return;
  }
  var sheet = spreadsheet.insertSheet(SpreadsheetConfig.displayName('Category'));
  sheet.appendRow(['CategoryId', 'CategoryName']);
}

function ensureSubCategorySheet_(spreadsheet) {
  if (spreadsheet.getSheetByName(SpreadsheetConfig.displayName('SubCategory'))) {
    return;
  }
  var sheet = spreadsheet.insertSheet(SpreadsheetConfig.displayName('SubCategory'));
  sheet.appendRow(['SubCategoryId', 'CategoryId', 'SubCategoryName', 'SortOrder']);
}

// Category/SubCategoryシートを新設した際、既存のMenuシートに入力済みの大分類・中分類の値から
// カテゴリー・サブカテゴリーマスタを一度だけ生成する（Categoryシートが空の場合のみ実行する一回限りの移行処理）。
// 商品管理画面（SCR-003）はカテゴリー・サブカテゴリーをこのマスタから選択する方式に変更したため、
// 既存商品が引き続き同じ分類のまま表示・管理できるようにする
function ensureCategoryMasterSeeded_(spreadsheet) {
  var categorySheet = spreadsheet.getSheetByName(SpreadsheetConfig.displayName('Category'));
  var subCategorySheet = spreadsheet.getSheetByName(SpreadsheetConfig.displayName('SubCategory'));
  var menuSheet = spreadsheet.getSheetByName(SpreadsheetConfig.displayName('Menu'));
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

function ensureExpenseCategorySheet_(spreadsheet) {
  if (spreadsheet.getSheetByName(SpreadsheetConfig.displayName('ExpenseCategory'))) {
    return;
  }
  var sheet = spreadsheet.insertSheet(SpreadsheetConfig.displayName('ExpenseCategory'));
  sheet.appendRow(['ExpenseCategoryId', 'ExpenseCategoryName', 'SortOrder', 'IsActive', 'IsCostOfGoods']);
}

// ExpenseCategoryシートが空の場合のみ、代表的な経費区分をあらかじめ登録しておく
// （店主が最初に区分を1つずつ作らずに済むようにするための初期値。後から自由に追加・名称変更・
// 無効化できる）。損益（3.8参照）で原価として扱うのは「仕入れ」区分のみ
function ensureExpenseCategorySeeded_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(SpreadsheetConfig.displayName('ExpenseCategory'));
  if (!sheet || sheet.getLastRow() > 1) {
    return;
  }
  var defaults = ['仕入れ', '家賃', '水道光熱費', '人件費', 'その他'];
  var rows = defaults.map(function (name, i) {
    return ['EC-' + ('0000' + (i + 1)).slice(-4), name, i + 1, true, name === '仕入れ'];
  });
  sheet.getRange(2, 1, rows.length, 5).setValues(rows);
}

// 既存のExpenseCategoryシートに後から追加した列（IsCostOfGoods）のヘッダーが無ければ追記し、
// 未設定（空欄）の行にのみ「仕入れ」区分ならtrue・それ以外はfalseをバックフィルする。
// 既に値が入っている行（店主が編集画面で変更済み）は上書きしない
function ensureExpenseCategoryCostFlagColumn_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(SpreadsheetConfig.displayName('ExpenseCategory'));
  if (!sheet) {
    return;
  }
  var targetColumn = ExpenseCategoryRepository.HEADERS.length;
  var headerCell = sheet.getRange(1, targetColumn);
  if (headerCell.getValue() !== 'IsCostOfGoods') {
    headerCell.setValue('IsCostOfGoods');
  }
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return;
  }
  var names = sheet.getRange(2, 2, lastRow - 1, 1).getValues();
  var flagRange = sheet.getRange(2, targetColumn, lastRow - 1, 1);
  var flags = flagRange.getValues();
  var changed = false;
  for (var i = 0; i < flags.length; i++) {
    if (flags[i][0] === '') {
      flags[i][0] = names[i][0] === '仕入れ';
      changed = true;
    }
  }
  if (changed) {
    flagRange.setValues(flags);
  }
}

function ensureExpenseTargetSheet_(spreadsheet) {
  if (spreadsheet.getSheetByName(SpreadsheetConfig.displayName('ExpenseTarget'))) {
    return;
  }
  var sheet = spreadsheet.insertSheet(SpreadsheetConfig.displayName('ExpenseTarget'));
  sheet.appendRow(['ExpenseTargetId', 'TargetMonth', 'ExpenseCategoryId', 'TargetAmount', 'Note']);
}

function ensureExpenseSheet_(spreadsheet) {
  if (spreadsheet.getSheetByName(SpreadsheetConfig.displayName('Expense'))) {
    return;
  }
  var sheet = spreadsheet.insertSheet(SpreadsheetConfig.displayName('Expense'));
  sheet.appendRow(['ExpenseId', 'ExpenseDate', 'ExpenseCategoryId', 'Amount', 'Note', 'RegisteredAt']);
}

function ensureExpenseVendorSheet_(spreadsheet) {
  if (spreadsheet.getSheetByName(SpreadsheetConfig.displayName('ExpenseVendor'))) {
    return;
  }
  var sheet = spreadsheet.insertSheet(SpreadsheetConfig.displayName('ExpenseVendor'));
  sheet.appendRow(['ExpenseVendorId', 'ExpenseVendorName', 'IsActive']);
}

// 既存のExpenseシートに後から追加した列（ExpenseVendorId）のヘッダーが無ければ追記する。
// ensureBusinessDayStartingCashColumn_と同じく、固定位置（HEADERSの末尾）で判定する
function ensureExpenseVendorIdColumn_(spreadsheet) {
  var sheet = spreadsheet.getSheetByName(SpreadsheetConfig.displayName('Expense'));
  if (!sheet) {
    return;
  }
  var targetColumn = ExpenseRepository.HEADERS.length;
  var currentValue = sheet.getRange(1, targetColumn).getValue();
  if (currentValue !== 'ExpenseVendorId') {
    sheet.getRange(1, targetColumn).setValue('ExpenseVendorId');
  }
}

// 過去の実装ではFirstVisitDateに顧客登録時点の日時をそのまま使っており、Sales実データ（初回の
// 実際の来店日）と一致しない場合があった。Sales実データから都度算出し直すだけの処理のため、
// 何度実行しても安全（setupDatabase()を再実行するたびに補正される）
function repairCustomerFirstVisitDates_(spreadsheet) {
  var customerSheet = spreadsheet.getSheetByName(SpreadsheetConfig.displayName('Customer'));
  var salesSheet = spreadsheet.getSheetByName(SpreadsheetConfig.displayName('Sales'));
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
