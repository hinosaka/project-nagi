// ドメイン層：日付から曜日（日本語）を算出する
var DayOfWeekRule = {
  NAMES: ['日', '月', '火', '水', '木', '金', '土'],

  fromDate: function (date) {
    return this.NAMES[new Date(date).getDay()];
  }
};
