// ドメイン層：会計ID（S-YYYYMMDD-0001形式、会計日ごとに連番リセット）の採番規則。
// DATABASE.md 4章「命名規則」参照
var SalesIdRule = {
  generateNext: function (salesDate, existingIds) {
    var prefix = 'S-' + DateUtil.formatYmd(salesDate).replace(/-/g, '') + '-';
    var pattern = new RegExp('^' + prefix + '(\\d{4})$');
    var maxSeq = existingIds.reduce(function (max, id) {
      var match = pattern.exec(id);
      if (!match) {
        return max;
      }
      var seq = parseInt(match[1], 10);
      return seq > max ? seq : max;
    }, 0);

    var nextSeq = maxSeq + 1;
    return prefix + ('0000' + nextSeq).slice(-4);
  }
};
