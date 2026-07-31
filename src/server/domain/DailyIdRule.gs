// ドメイン層：日次トランザクションID（{prefix}-YYYYMMDD-0001形式、発生日ごとに連番リセット）の共通採番規則。
// DATABASE.md 4章「命名規則」参照。SalesIdRule・RegisterCloseLogの採番で共用する
var DailyIdRule = {
  generateNext: function (prefix, date, existingIds) {
    var idPrefix = prefix + '-' + DateUtil.formatYmd(date).replace(/-/g, '') + '-';
    var pattern = new RegExp('^' + idPrefix + '(\\d{4})$');
    var maxSeq = existingIds.reduce(function (max, id) {
      var match = pattern.exec(id);
      if (!match) {
        return max;
      }
      var seq = parseInt(match[1], 10);
      return seq > max ? seq : max;
    }, 0);

    var nextSeq = maxSeq + 1;
    return idPrefix + ('0000' + nextSeq).slice(-4);
  }
};
