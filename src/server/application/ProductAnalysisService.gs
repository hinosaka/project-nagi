// アプリケーション層：商品分析（SCR-008）のユースケース。
// google.script.runの制約により、クライアント公開分はトップレベル関数として定義する
// 期間の算出（日次／週次／月次）はDashboardService.gsのcalcPeriodRange_を共用する

function getProductAnalysisData(periodType, referenceDateStr, sortBy) {
  var range = calcPeriodRange_(periodType, new Date(referenceDateStr));

  var salesInRange = SalesRepository.findAll().filter(function (s) {
    var d = new Date(s.SalesDate);
    return d >= range.start && d <= range.end;
  });
  var totalPartySize = salesInRange.reduce(function (sum, s) { return sum + (Number(s.PartySize) || 0); }, 0);

  var salesIdSet = {};
  salesInRange.forEach(function (s) { salesIdSet[s.SalesId] = true; });

  var menuTotals = {};
  var menuOrder = [];
  var categoryTotals = { 'フード': { amount: 0, quantity: 0 }, 'ドリンク': { amount: 0, quantity: 0 } };
  var totalAmount = 0;
  var totalQuantity = 0;

  SalesDetailRepository.findAll().forEach(function (d) {
    if (!salesIdSet[d.SalesId] || !d.MenuName) {
      return;
    }
    var subtotal = Number(d.Subtotal) || 0;
    var quantity = Number(d.Quantity) || 0;
    var category = d.CategoryLarge || '';
    var hasCost = d.UnitCost !== '' && d.UnitCost !== null && d.UnitCost !== undefined;
    var cost = hasCost ? (Number(d.UnitCost) || 0) * quantity : 0;

    if (menuTotals[d.MenuName] === undefined) {
      menuTotals[d.MenuName] = { amount: 0, quantity: 0, category: category, cost: 0, hasCost: false };
      menuOrder.push(d.MenuName);
    }
    var entry = menuTotals[d.MenuName];
    entry.amount += subtotal;
    entry.quantity += quantity;
    if (hasCost) {
      entry.cost += cost;
      entry.hasCost = true;
    }

    if (categoryTotals[category]) {
      categoryTotals[category].amount += subtotal;
      categoryTotals[category].quantity += quantity;
    }
    totalAmount += subtotal;
    totalQuantity += quantity;
  });

  // ABC分析は売上金額の降順に基づいて分類する（表示順はsortByに従うため別途並び替える）
  var itemsByAmountDesc = menuOrder
    .map(function (name) { return { name: name, entry: menuTotals[name] }; })
    .sort(function (a, b) { return b.entry.amount - a.entry.amount; });

  var cumulative = 0;
  var abcClassByName = {};
  itemsByAmountDesc.forEach(function (item) {
    cumulative += item.entry.amount;
    var cumulativeRatio = totalAmount > 0 ? cumulative / totalAmount : 0;
    var abcClass = cumulativeRatio <= 0.7 ? 'A' : (cumulativeRatio <= 0.9 ? 'B' : 'C');
    abcClassByName[item.name] = abcClass;
  });

  var items = itemsByAmountDesc.map(function (item) {
    var entry = item.entry;
    return {
      MenuName: item.name,
      category: entry.category,
      amount: entry.amount,
      quantity: entry.quantity,
      sharePercent: totalAmount > 0 ? Math.round((entry.amount / totalAmount) * 1000) / 10 : 0,
      grossProfit: entry.hasCost ? entry.amount - entry.cost : null,
      costRate: entry.hasCost && entry.amount > 0 ? Math.round((entry.cost / entry.amount) * 1000) / 10 : null,
      abcClass: abcClassByName[item.name]
    };
  });

  if (sortBy === 'quantity') {
    items.sort(function (a, b) { return b.quantity - a.quantity; });
  } else if (sortBy === 'grossProfit') {
    items.sort(function (a, b) { return (b.grossProfit || 0) - (a.grossProfit || 0); });
  }

  return {
    periodLabel: range.label,
    totalAmount: totalAmount,
    totalQuantity: totalQuantity,
    avgOrderQuantity: totalPartySize > 0 ? Math.round((totalQuantity / totalPartySize) * 10) / 10 : null,
    categoryTotals: [
      { category: 'フード', amount: categoryTotals['フード'].amount, quantity: categoryTotals['フード'].quantity },
      { category: 'ドリンク', amount: categoryTotals['ドリンク'].amount, quantity: categoryTotals['ドリンク'].quantity }
    ],
    items: items
  };
}
