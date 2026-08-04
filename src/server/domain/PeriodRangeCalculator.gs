// ドメイン層：日次／週次／月次／期間指定（custom）の集計対象期間を算出する。
// 商品統計・データ分析（ABC分析／曜日別／天候別／客層分析）で共用する期間算出ロジック
// （旧DashboardService.gsのcalcPeriodRange_/resolvePeriodRange_を移設）
var PeriodRangeCalculator = {
  // 週次は月曜始まり（日本の業務慣行に合わせる）。月次は暦月（1日〜末日）
  calc: function (periodType, refDate) {
    var start;
    var end;
    var label;

    if (periodType === 'week') {
      var day = refDate.getDay();
      var diffToMonday = (day === 0 ? -6 : 1 - day);
      start = new Date(refDate);
      start.setDate(refDate.getDate() + diffToMonday);
      end = new Date(start);
      end.setDate(start.getDate() + 6);
      label = DateUtil.formatDisplay(start) + ' 〜 ' + DateUtil.formatDisplay(end);
    } else if (periodType === 'month') {
      start = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
      end = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);
      label = refDate.getFullYear() + '年' + (refDate.getMonth() + 1) + '月';
    } else {
      start = new Date(refDate);
      end = new Date(refDate);
      label = DateUtil.formatDisplay(refDate);
    }

    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    return { start: start, end: end, label: label };
  },

  // 日次／週次／月次はcalc()を共用し、期間指定（custom）のみここで算出する
  resolve: function (periodType, referenceDateStr, startDateStr, endDateStr) {
    if (periodType === 'custom') {
      var start = new Date(startDateStr);
      var end = new Date(endDateStr);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { start: start, end: end, label: DateUtil.formatDisplay(start) + ' 〜 ' + DateUtil.formatDisplay(end) };
    }
    return this.calc(periodType, new Date(referenceDateStr));
  }
};
