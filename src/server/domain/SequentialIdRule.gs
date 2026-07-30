// ドメイン層：マスタ系IDの採番規則（{頭文字}-{4桁連番}形式。例：M-0001, C-0001）。
// DATABASE.md 4章「命名規則」参照。Spreadsheetに依存しない純粋関数
var SequentialIdRule = {
  generateNext: function (prefix, existingIds) {
    var pattern = new RegExp('^' + prefix + '-(\\d{4})$');
    var maxSeq = existingIds.reduce(function (max, id) {
      var match = pattern.exec(id);
      if (!match) {
        return max;
      }
      var seq = parseInt(match[1], 10);
      return seq > max ? seq : max;
    }, 0);

    var nextSeq = maxSeq + 1;
    var padded = ('0000' + nextSeq).slice(-4);
    return prefix + '-' + padded;
  }
};
