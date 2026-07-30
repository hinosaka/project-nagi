// ドメイン層：会計金額の計算（Spreadsheetに依存しない）
var SalesCalculator = {
  calcSubtotal: function (unitPrice, quantity) {
    return unitPrice * quantity;
  },

  calcTotalAmount: function (details) {
    return details.reduce(function (sum, d) {
      return sum + d.Subtotal;
    }, 0);
  }
};
