// ドメイン層：Menuの採番規則（M-0001形式、4桁ゼロ埋め連番）。Spreadsheetに依存しない純粋関数
var MenuIdRule = {
  generateNext: function (existingIds) {
    var maxSeq = existingIds.reduce(function (max, id) {
      var match = /^M-(\d{4})$/.exec(id);
      if (!match) {
        return max;
      }
      var seq = parseInt(match[1], 10);
      return seq > max ? seq : max;
    }, 0);

    var nextSeq = maxSeq + 1;
    var padded = ('0000' + nextSeq).slice(-4);
    return 'M-' + padded;
  }
};
