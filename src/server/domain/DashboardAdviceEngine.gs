// ドメイン層：ダッシュボードの一言アドバイス生成エンジン（ルールベース）。
//
// 設計方針：
// - 数値の説明ではなく、店主が経営判断のきっかけにできる「気づき＋可能なら次の一手」を1〜2文で示す
// - 優先順位：1.データなし（履歴の気づき） 2.売上に関する気づき 3.来客傾向 4.商品動向 5.曜日・季節性 6.将来的な改善提案（フォールバック）
// - ルールは「detect（条件判定・事実抽出）」と「message（文章生成）」に分離する。
//   detectは事実（fact）だけを返し、文章表現は一切持たない。将来AIによる自然文生成に置き換える場合は
//   message関数（またはdetectで集めたfact一式をまとめてAIに渡す形）だけを差し替えればよい
// - このファイルはドメイン層のため、リポジトリ（シート）には直接アクセスしない。
//   必要なデータはすべてDashboardService.gsが集計し、context引数として渡す

var DASHBOARD_ADVICE_THRESHOLDS_ = {
  salesDiffPercent: 15,      // 売上高比較の気づきを出す最小変化率（％）
  visitDropPercent: -10,     // 来客数「少なめ」とみなす変化率（％）
  perPersonRisePercent: 10,  // 客単価「高め」とみなす変化率（％）
  newRatioForSurge: 0.7,     // 新規急増とみなす新規比率
  productMinQuantity: 3,     // 商品動向を提示する最低販売数量（ノイズ回避）
  productDiffPercent: 30,    // 商品動向の気づきを出す最小変化率（％）
  weekdayDiffPercent: 15     // 曜日傾向の気づきを出す最小乖離率（％）
};

var DashboardAdviceEngine = {
  // 優先順位順。上から順にdetectを試し、最初にfactを返したルールのmessageを採用する
  RULES_: [
    { category: 'データなし', detect: dashboardAdviceDetectNoData_, message: dashboardAdviceMessageNoData_ },
    { category: '売上', detect: dashboardAdviceDetectSalesTrend_, message: dashboardAdviceMessageSalesTrend_ },
    { category: '来客傾向：客単価で補完', detect: dashboardAdviceDetectVisitorCompensation_, message: dashboardAdviceMessageVisitorCompensation_ },
    { category: '来客傾向：新規急増', detect: dashboardAdviceDetectNewCustomerSurge_, message: dashboardAdviceMessageNewCustomerSurge_ },
    { category: '商品動向', detect: dashboardAdviceDetectProductTrend_, message: dashboardAdviceMessageProductTrend_ },
    { category: '曜日性', detect: dashboardAdviceDetectWeekdayPattern_, message: dashboardAdviceMessageWeekdayPattern_ },
    { category: '改善提案（フォールバック）', detect: dashboardAdviceDetectFallback_, message: dashboardAdviceMessageFallback_ }
  ],

  generate: function (context) {
    for (var i = 0; i < this.RULES_.length; i++) {
      var rule = this.RULES_[i];
      var fact = rule.detect(context);
      if (fact) {
        return rule.message(fact);
      }
    }
    return { text: '', sentiment: 'neutral' };
  }
};

// ----- 1. データなし（対象期間の会計が0件） -----

function dashboardAdviceDetectNoData_(ctx) {
  if (ctx.ranking.length > 0) {
    return null;
  }
  return { historicalTip: ctx.historicalTip };
}
function dashboardAdviceMessageNoData_(fact) {
  return fact.historicalTip || { text: 'この期間の会計データがまだありません。', sentiment: 'neutral' };
}

// ----- 2. 売上に関する気づき -----

function dashboardAdviceDetectSalesTrend_(ctx) {
  var diff = ctx.kpis.totalAmount.diffPercent;
  if (diff === null || Math.abs(diff) < DASHBOARD_ADVICE_THRESHOLDS_.salesDiffPercent) {
    return null;
  }
  return { diff: diff };
}
function dashboardAdviceMessageSalesTrend_(fact) {
  if (fact.diff >= 0) {
    return { text: '売上は好調に推移しています（比較期間比+' + fact.diff + '%）。この調子を維持しましょう。', sentiment: 'up' };
  }
  return { text: '売上はやや伸び悩んでいます（比較期間比' + fact.diff + '%）。客足や商品構成を見直すきっかけにしてみましょう。', sentiment: 'down' };
}

// ----- 3. 来客傾向：来客数は少ないが客単価で補っている -----

function dashboardAdviceDetectVisitorCompensation_(ctx) {
  var visitDiff = ctx.kpis.visitCount.diffPercent;
  var perPersonDiff = ctx.kpis.perPersonAmount.diffPercent;
  if (visitDiff === null || perPersonDiff === null) {
    return null;
  }
  if (visitDiff <= DASHBOARD_ADVICE_THRESHOLDS_.visitDropPercent && perPersonDiff >= DASHBOARD_ADVICE_THRESHOLDS_.perPersonRisePercent) {
    return { visitDiff: visitDiff, perPersonDiff: perPersonDiff };
  }
  return null;
}
function dashboardAdviceMessageVisitorCompensation_(fact) {
  return { text: '来客数は少なめですが、客単価が高く売上を維持できています。', sentiment: 'neutral' };
}

// ----- 3b. 来客傾向：新規のお客様の来店が多い -----

function dashboardAdviceDetectNewCustomerSurge_(ctx) {
  var total = ctx.newRepeat.newCount + ctx.newRepeat.repeatCount;
  if (total < 2) {
    return null;
  }
  var newRatio = ctx.newRepeat.newCount / total;
  if (newRatio >= DASHBOARD_ADVICE_THRESHOLDS_.newRatioForSurge) {
    return { newRatioPercent: Math.round(newRatio * 100) };
  }
  return null;
}
function dashboardAdviceMessageNewCustomerSurge_(fact) {
  return { text: '新規のお客様の来店が多い期間でした。良い印象を持っていただけるよう、接客や声かけを意識してみましょう。', sentiment: 'up' };
}

// ----- 4. 商品動向 -----

function dashboardAdviceDetectProductTrend_(ctx) {
  return ctx.productTrend; // 事実抽出はDashboardService.gs側で実施済み（null または {name, diffPercent}）
}
function dashboardAdviceMessageProductTrend_(fact) {
  if (fact.diffPercent >= 0) {
    return { text: '「' + fact.name + '」の注文が比較期間より' + fact.diffPercent + '%増えています。仕入れ量を見直してもよいかもしれません。', sentiment: 'up' };
  }
  return { text: '「' + fact.name + '」の注文が比較期間より' + Math.abs(fact.diffPercent) + '%減っています。メニューの見せ方を工夫してみるとよいかもしれません。', sentiment: 'down' };
}

// ----- 5. 曜日・季節性（単日選択時のみ） -----

function dashboardAdviceDetectWeekdayPattern_(ctx) {
  return ctx.weekdayPattern; // 事実抽出はDashboardService.gs側で実施済み（null または {weekday, diffPercent}）
}
function dashboardAdviceMessageWeekdayPattern_(fact) {
  if (fact.diffPercent >= 0) {
    return { text: fact.weekday + '曜日は客単価が高い傾向です。おすすめメニューの提案を積極的に行うと売上アップが期待できます。', sentiment: 'up' };
  }
  return { text: fact.weekday + '曜日は客単価が低めの傾向です。セットメニューなどで単価を底上げできないか検討してみましょう。', sentiment: 'neutral' };
}

// ----- 6. 将来的な改善提案（フォールバック。会計データがあれば必ず何か表示する） -----

function dashboardAdviceDetectFallback_(ctx) {
  if (ctx.ranking.length === 0) {
    return null;
  }
  return { topMenuName: ctx.ranking[0].MenuName };
}
function dashboardAdviceMessageFallback_(fact) {
  return { text: '目立った変化は見られませんが、人気商品「' + fact.topMenuName + '」を軸にしたおすすめ・セット提案で客単価アップを狙えそうです。', sentiment: 'neutral' };
}
