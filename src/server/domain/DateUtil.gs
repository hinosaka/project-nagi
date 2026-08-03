// ドメイン層：日付の比較・整形の共通処理
var DateUtil = {
  isSameDate: function (a, b) {
    var da = new Date(a);
    var db = new Date(b);
    return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
  },

  formatYmd: function (date) {
    return Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), 'yyyy-MM-dd');
  },

  // 年月キー（例："2026-07"）。BudgetServiceの実績集計等、Sales.SalesDateを月単位で
  // グルーピングする際のキー生成に使う
  formatYm: function (date) {
    return Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), 'yyyy-MM');
  },

  // 画面表示用の日付文字列。google.script.runでDate型をそのまま返すと扱いが不安定なため、
  // クライアントに返す前に文字列へ整形する用途で使う
  formatDisplay: function (date) {
    if (!date) {
      return '';
    }
    return Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), 'yyyy/MM/dd');
  },

  // 集計対象日の見出し表示用（例：2026年07月31日）
  formatFullDate: function (date) {
    if (!date) {
      return '';
    }
    return Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), 'yyyy年MM月dd日');
  },

  // レジクローズ履歴など日時表示用
  formatDateTime: function (date) {
    if (!date) {
      return '';
    }
    return Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), 'yyyy/MM/dd HH:mm');
  }
};
