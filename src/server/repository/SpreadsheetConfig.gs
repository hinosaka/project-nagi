// データアクセス層共通：唯一のデータベース（スプレッドシート）への接続を取得する。
//
// コード上のシート識別子（Menu, Sales等。DATABASE.md命名規則に従う英語PascalCase）と、
// 実際のスプレッドシートのタブ表示名（店主が見てすぐ分かるよう日本語化したもの）を分離する。
// コード側（各Repository.gs、setup.gs）は今後もこの英語識別子で参照し続け、タブの見た目だけを
// このマップで日本語に変換する。マップに無い識別子はそのまま（英語）をタブ名として使う
var SHEET_DISPLAY_NAMES_ = {
  Menu: '商品',
  Category: 'カテゴリー',
  SubCategory: 'サブカテゴリー',
  Seat: '座席',
  Customer: '顧客',
  Sales: '会計',
  SalesDetail: '会計明細',
  BusinessDay: '営業日',
  SalesTarget: '売上目標',
  RegisterCloseLog: 'レジ締め履歴',
  DailyTarget: '日別目標',
  FixedCost: '固定費',
  BudgetSettings: '予算設定'
};

var SpreadsheetConfig = {
  getSpreadsheet: function () {
    var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
    if (!id) {
      throw new Error('SPREADSHEET_IDが未設定です。setupDatabase()を実行してください。');
    }
    return SpreadsheetApp.openById(id);
  },

  // sheetNameはコード上の識別子（例：'Menu'）。実際のタブ名（表示名）に変換する
  displayName: function (sheetName) {
    return SHEET_DISPLAY_NAMES_[sheetName] || sheetName;
  },

  getSheet: function (sheetName) {
    var displayName = this.displayName(sheetName);
    var sheet = this.getSpreadsheet().getSheetByName(displayName);
    if (!sheet) {
      throw new Error('シートが見つかりません：' + displayName);
    }
    return sheet;
  }
};
