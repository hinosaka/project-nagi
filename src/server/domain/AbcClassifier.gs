// ドメイン層：ABC分析の分類ロジック（Spreadsheet非依存）。
// 売上の高い順に並べ、累積構成比が70%まで＝A、90%まで＝B、それ以降＝Cに分類する。
// axis='product'（商品別、categoryFilterで大分類を絞り込み可）／'category'（サブカテゴリー別。
// 商品統計＝SCR-008の「カテゴリー別」と同じくCategoryMedium単位で集計する）
var AbcClassifier = {
  classify: function (salesIdSet, allDetails, axis, categoryFilter) {
    var totals = {};
    var order = [];
    allDetails.forEach(function (d) {
      if (!salesIdSet[d.SalesId] || !d.MenuName) {
        return;
      }
      if (axis !== 'category' && categoryFilter && categoryFilter !== 'all' && d.CategoryLarge !== categoryFilter) {
        return;
      }

      var key = axis === 'category' ? (d.CategoryMedium || 'その他') : d.MenuName;
      var quantity = Number(d.Quantity) || 0;
      var subtotal = Number(d.Subtotal) || 0;
      var hasCost = d.UnitCost !== '' && d.UnitCost !== null && d.UnitCost !== undefined;
      var cost = hasCost ? (Number(d.UnitCost) || 0) * quantity : 0;

      if (!totals[key]) {
        totals[key] = { amount: 0, quantity: 0, cost: 0, hasCost: false };
        order.push(key);
      }
      totals[key].amount += subtotal;
      totals[key].quantity += quantity;
      if (hasCost) {
        totals[key].cost += cost;
        totals[key].hasCost = true;
      }
    });

    var rows = order.map(function (key) {
      var t = totals[key];
      return { name: key, amount: t.amount, quantity: t.quantity, cost: t.hasCost ? t.cost : null };
    }).sort(function (a, b) { return b.amount - a.amount; });

    var totalAmount = rows.reduce(function (sum, r) { return sum + r.amount; }, 0);
    var cum = 0;
    return rows.map(function (r, i) {
      var share = totalAmount > 0 ? (r.amount / totalAmount) * 100 : 0;
      cum += share;
      var profit = r.cost === null ? null : r.amount - r.cost;
      return {
        rank: i + 1,
        name: r.name,
        amount: r.amount,
        sharePercent: Math.round(share * 10) / 10,
        cumSharePercent: Math.round(cum * 10) / 10,
        quantity: r.quantity,
        cost: r.cost,
        profit: profit,
        profitRatePercent: (profit === null || !r.amount) ? null : Math.round((profit / r.amount) * 100),
        grade: cum <= 70 ? 'A' : cum <= 90 ? 'B' : 'C'
      };
    });
  }
};
