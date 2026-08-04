// アプリケーション層：天候別分析（データ分析画面の「天候別分析」タブ）のユースケース。
// google.script.runの制約により、クライアント公開分はトップレベル関数として定義する
// 期間の算出（日次／週次／月次／期間指定）はdomain/PeriodRangeCalculator.gsを共用する。
// 集計ロジック自体はdomain/WeatherAggregator.gsに集約し、このファイルはSales/SalesDetail/
// BusinessDayの読み込みとそこへの委譲のみを行う

function getWeatherAnalysisData(periodType, referenceDateStr, startDateStr, endDateStr) {
  var range = PeriodRangeCalculator.resolve(periodType, referenceDateStr, startDateStr, endDateStr);
  var salesInRange = SalesRepository.findAll().filter(function (s) {
    var d = new Date(s.SalesDate);
    return d >= range.start && d <= range.end;
  });

  // BusinessDayは日付ごとに1回だけ全件読み込み、対象日ごとの照合はJS側のMapで行う
  // （salesInRangeの件数分だけBusinessDayRepository.findByDateを呼ぶと、都度シート全体を
  // 読み直すことになり件数に対して遅くなるため）
  var businessDayByDate = {};
  BusinessDayRepository.findAll().forEach(function (b) {
    businessDayByDate[DateUtil.formatYmd(b.SalesDate)] = b;
  });

  var weatherStats = WeatherAggregator.aggregate(salesInRange, SalesDetailRepository.findAll(), businessDayByDate);

  return { periodLabel: range.label, weatherStats: weatherStats };
}
