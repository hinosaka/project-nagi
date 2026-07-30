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

  // 画面表示用の日付文字列。google.script.runでDate型をそのまま返すと扱いが不安定なため、
  // クライアントに返す前に文字列へ整形する用途で使う
  formatDisplay: function (date) {
    if (!date) {
      return '';
    }
    return Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), 'yyyy/MM/dd');
  }
};
