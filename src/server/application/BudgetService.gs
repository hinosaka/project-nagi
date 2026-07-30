// アプリケーション層：予算管理（SCR-007）のユースケース。
// google.script.runの制約により、クライアント公開分はトップレベル関数として定義する

function getBudgetData(targetMonth) {
  var target = SalesTargetRepository.findByMonth(targetMonth);
  var targetAmount = target ? Number(target.TargetAmount) || 0 : 0;
  var note = target ? (target.Note || '') : '';

  var actualAmount = SalesRepository.findAll()
    .filter(function (s) { return formatYearMonth_(s.SalesDate) === targetMonth; })
    .reduce(function (sum, s) { return sum + (Number(s.TotalAmount) || 0); }, 0);

  var achievementRate = targetAmount > 0 ? Math.round((actualAmount / targetAmount) * 100) : null;

  return {
    targetMonth: targetMonth,
    targetAmount: targetAmount,
    note: note,
    hasTarget: !!target,
    actualAmount: actualAmount,
    achievementRate: achievementRate
  };
}

function saveBudgetTarget(input) {
  if (!input || !input.targetMonth) {
    throw new Error('対象年月は必須です');
  }
  var targetAmount = Number(input.targetAmount);
  if (!(targetAmount >= 0)) {
    throw new Error('目標売上には0以上の数値を入力してください');
  }

  SalesTargetRepository.save({
    SalesTargetId: 'TGT-' + input.targetMonth.replace('-', ''),
    TargetMonth: input.targetMonth,
    TargetAmount: targetAmount,
    Note: input.note || ''
  });

  return getBudgetData(input.targetMonth);
}

function formatYearMonth_(date) {
  return Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), 'yyyy-MM');
}
