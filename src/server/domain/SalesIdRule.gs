// ドメイン層：会計ID（S-YYYYMMDD-0001形式、会計日ごとに連番リセット）の採番規則。
// DATABASE.md 4章「命名規則」参照
var SalesIdRule = {
  generateNext: function (salesDate, existingIds) {
    return DailyIdRule.generateNext('S', salesDate, existingIds);
  }
};
