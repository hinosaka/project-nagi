// データアクセス層：BudgetSettingsシートの読み書き。単一行のみを持つ設定シート（目標利益率、%の整数値）
var BudgetSettingsRepository = {
  get: function () {
    var sheet = SpreadsheetConfig.getSheet('BudgetSettings');
    var value = sheet.getRange(2, 1).getValue();
    return { TargetProfitRate: value === '' ? 0 : Number(value) };
  },

  save: function (targetProfitRate) {
    var sheet = SpreadsheetConfig.getSheet('BudgetSettings');
    sheet.getRange(2, 1).setValue(Number(targetProfitRate) || 0);
  }
};
