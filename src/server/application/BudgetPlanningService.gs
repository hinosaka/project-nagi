// アプリケーション層：固定費からの目標予算逆算（予算管理画面）のユースケース。
// google.script.runの制約により、クライアント公開分はトップレベル関数として定義する
//
// 計算式：目標売上 ＝ 固定費合計 ÷ (1 − 原価率 − 目標利益率)
// 原価率は全期間のSalesDetail実績（原価合計÷売上合計）から算出する（店舗の実際の原価構成を反映するため。
// 原価率＋目標利益率が100%以上の場合は計算不能とし、suggestedTargetAmountをnullで返す

function getFixedCostPlan() {
  var items = FixedCostRepository.findAll();
  var targetProfitRate = BudgetSettingsRepository.get().TargetProfitRate;
  return buildFixedCostPlan_(items, targetProfitRate);
}

function saveFixedCostItem(item) {
  var name = (item && item.Name || '').trim();
  if (!name) {
    throw new Error('項目名は必須です');
  }
  var amount = Number(item.Amount);
  if (!(amount >= 0)) {
    throw new Error('金額には0以上の数値を入力してください');
  }

  var fixedCostId = item.FixedCostId || SequentialIdRule.generateNext('FC', FixedCostRepository.findAll().map(function (i) { return i.FixedCostId; }));
  FixedCostRepository.save({ FixedCostId: fixedCostId, Name: name, Amount: amount });
  return getFixedCostPlan();
}

function deleteFixedCostItem(fixedCostId) {
  FixedCostRepository.deleteById(fixedCostId);
  return getFixedCostPlan();
}

function saveTargetProfitRate(rate) {
  var value = Number(rate);
  if (!(value >= 0)) {
    throw new Error('目標利益率には0以上の数値を入力してください');
  }
  BudgetSettingsRepository.save(value);
  return getFixedCostPlan();
}

function buildFixedCostPlan_(items, targetProfitRate) {
  var totalFixedCost = items.reduce(function (sum, i) { return sum + (Number(i.Amount) || 0); }, 0);
  var costRate = calcActualCostRate_();
  var denominator = 1 - costRate - (targetProfitRate / 100);

  return {
    items: items,
    totalFixedCost: totalFixedCost,
    targetProfitRate: targetProfitRate,
    costRatePercent: Math.round(costRate * 1000) / 10,
    suggestedTargetAmount: denominator > 0 ? Math.round(totalFixedCost / denominator) : null
  };
}

// 全期間のSalesDetail実績から原価率（原価合計÷売上合計）を算出する。原価未入力の明細は
// ProductAnalysisService.gsと同じ方針で0扱いにする
function calcActualCostRate_() {
  var totalSubtotal = 0;
  var totalCost = 0;
  SalesDetailRepository.findAll().forEach(function (d) {
    var subtotal = Number(d.Subtotal) || 0;
    var quantity = Number(d.Quantity) || 0;
    var hasCost = d.UnitCost !== '' && d.UnitCost !== null && d.UnitCost !== undefined;
    totalSubtotal += subtotal;
    if (hasCost) {
      totalCost += (Number(d.UnitCost) || 0) * quantity;
    }
  });
  return totalSubtotal > 0 ? totalCost / totalSubtotal : 0;
}
