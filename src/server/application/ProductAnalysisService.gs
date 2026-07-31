// アプリケーション層：商品統計（SCR-008）のユースケース。
// google.script.runの制約により、クライアント公開分はトップレベル関数として定義する
//
// 期間別（日次／週次／期間指定）・月別・年別の3種類の粒度に対応する。
// 日次／週次／月次／期間指定の範囲算出はDashboardService.gsのresolvePeriodRange_を共用し、
// 年別のみこのファイル内で算出する
//
// 円グラフ・詳細表は必ず同じ「上位5件＋その他」データから作るため、
// 一度だけ畳み込んだ配列（productAnalysisFoldTop5_の戻り値）を両方の元にする

function getProductAnalysisData(periodType, referenceDateStr, startDateStr, endDateStr) {
  var range = resolveProductAnalysisRange_(periodType, referenceDateStr, startDateStr, endDateStr);

  var salesInRange = SalesRepository.findAll().filter(function (s) {
    var d = new Date(s.SalesDate);
    return d >= range.start && d <= range.end;
  });
  var salesIdSet = {};
  salesInRange.forEach(function (s) { salesIdSet[s.SalesId] = true; });

  var productTotals = {};
  var productOrder = [];
  var categoryTotals = {};
  var categoryOrder = [];
  var totalAmount = 0;

  SalesDetailRepository.findAll().forEach(function (d) {
    if (!salesIdSet[d.SalesId] || !d.MenuName) {
      return;
    }
    var subtotal = Number(d.Subtotal) || 0;
    var quantity = Number(d.Quantity) || 0;
    var category = d.CategoryMedium || 'その他';
    var hasCost = d.UnitCost !== '' && d.UnitCost !== null && d.UnitCost !== undefined;
    var cost = hasCost ? (Number(d.UnitCost) || 0) * quantity : 0;

    if (!productTotals[d.MenuName]) {
      productTotals[d.MenuName] = { amount: 0, quantity: 0, category: category, unitPrice: 0, cost: 0, hasCost: false };
      productOrder.push(d.MenuName);
    }
    var p = productTotals[d.MenuName];
    p.amount += subtotal;
    p.quantity += quantity;
    p.unitPrice = Number(d.UnitPrice) || 0;
    if (hasCost) {
      p.cost += cost;
      p.hasCost = true;
    }

    if (!categoryTotals[category]) {
      categoryTotals[category] = { amount: 0, quantity: 0, cost: 0, hasCost: false };
      categoryOrder.push(category);
    }
    var c = categoryTotals[category];
    c.amount += subtotal;
    c.quantity += quantity;
    if (hasCost) {
      c.cost += cost;
      c.hasCost = true;
    }

    totalAmount += subtotal;
  });

  var products = productOrder.map(function (name) {
    var p = productTotals[name];
    return {
      name: name,
      category: p.category,
      unitPrice: p.unitPrice,
      quantity: p.quantity,
      amount: p.amount,
      grossProfit: p.hasCost ? p.amount - p.cost : null
    };
  }).sort(function (a, b) { return b.amount - a.amount; });

  var categories = categoryOrder.map(function (name) {
    var c = categoryTotals[name];
    return {
      name: name,
      category: null,
      unitPrice: null,
      quantity: c.quantity,
      amount: c.amount,
      grossProfit: c.hasCost ? c.amount - c.cost : null
    };
  }).sort(function (a, b) { return b.amount - a.amount; });

  var foldedProducts = productAnalysisFoldTop5_(products, null, '品');
  var foldedCategories = productAnalysisFoldTop5_(categories, 'その他', '分類');

  return {
    periodLabel: range.label,
    productPie: foldedProducts.map(function (r) { return { name: r.name, amount: r.amount }; }),
    categoryPie: foldedCategories.map(function (r) { return { name: r.name, amount: r.amount }; }),
    // 表は円グラフ（上位5件＋その他）とは独立させ、1件でも注文があった全商品／全カテゴリを表示する
    productTable: productAnalysisToTableRows_(products, totalAmount),
    categoryTable: productAnalysisToTableRows_(categories, totalAmount)
  };
}

// ----- 期間の算出 -----

function resolveProductAnalysisRange_(periodType, referenceDateStr, startDateStr, endDateStr) {
  if (periodType === 'year') {
    var refDate = new Date(referenceDateStr);
    var yearStart = new Date(refDate.getFullYear(), 0, 1);
    var yearEnd = new Date(refDate.getFullYear(), 11, 31);
    yearEnd.setHours(23, 59, 59, 999);
    return { start: yearStart, end: yearEnd, label: refDate.getFullYear() + '年' };
  }
  // day／week／month／customはDashboardService.gsのresolvePeriodRange_を共用
  return resolvePeriodRange_(periodType, referenceDateStr, startDateStr, endDateStr);
}

// ----- 上位5件＋その他への畳み込み（円グラフ・詳細表で共通） -----

// rows: {name, category, unitPrice, quantity, amount, grossProfit}の配列（amount降順ソート済み）
// explicitOtherName: 集計時点で既に「その他」バケットを持つ場合はその名前（カテゴリ別の'その他'）を渡して合算する
function productAnalysisFoldTop5_(rows, explicitOtherName, otherLabelSuffix) {
  var explicitOther = null;
  var named = rows.filter(function (r) {
    if (explicitOtherName && r.name === explicitOtherName) {
      explicitOther = r;
      return false;
    }
    return true;
  });

  var top = named.slice(0, 5);
  var rest = named.slice(5);
  var overflow = rest.concat(explicitOther ? [explicitOther] : []);

  if (overflow.length > 0) {
    var restAmount = overflow.reduce(function (sum, r) { return sum + r.amount; }, 0);
    var restQuantity = overflow.reduce(function (sum, r) { return sum + r.quantity; }, 0);
    var anyHasCost = overflow.some(function (r) { return r.grossProfit !== null; });
    var restGrossProfit = overflow.reduce(function (sum, r) { return sum + (r.grossProfit || 0); }, 0);
    var label = rest.length > 0 ? 'その他' + rest.length + otherLabelSuffix : 'その他';
    top = top.concat([{
      name: label,
      category: '-',
      unitPrice: null,
      quantity: restQuantity,
      amount: restAmount,
      grossProfit: anyHasCost ? restGrossProfit : null
    }]);
  }
  return top;
}

function productAnalysisToTableRows_(rows, totalAmount) {
  return rows.map(function (r) {
    return {
      name: r.name,
      category: r.category,
      unitPrice: r.unitPrice,
      quantity: r.quantity,
      amount: r.amount,
      sharePercent: totalAmount > 0 ? Math.round((r.amount / totalAmount) * 1000) / 10 : 0,
      grossProfit: r.grossProfit
    };
  });
}
