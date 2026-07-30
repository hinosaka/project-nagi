// アプリケーション層：ダッシュボード（SCR-006）のユースケース。
// google.script.runの制約により、クライアント公開分はトップレベル関数として定義する

function getDashboardData(periodType, referenceDateStr) {
  var range = calcPeriodRange_(periodType, new Date(referenceDateStr));

  var salesInRange = SalesRepository.findAll().filter(function (s) {
    var d = new Date(s.SalesDate);
    return d >= range.start && d <= range.end;
  });

  var totalAmount = salesInRange.reduce(function (sum, s) { return sum + (Number(s.TotalAmount) || 0); }, 0);
  var totalPartySize = salesInRange.reduce(function (sum, s) { return sum + (Number(s.PartySize) || 0); }, 0);
  var visitCount = salesInRange.length;
  var perPersonAmount = totalPartySize > 0 ? Math.round(totalAmount / totalPartySize) : 0;

  var salesIdSet = {};
  salesInRange.forEach(function (s) { salesIdSet[s.SalesId] = true; });

  var foodAmount = 0;
  var drinkAmount = 0;
  var menuTotals = {};
  var menuOrder = [];

  SalesDetailRepository.findAll().forEach(function (d) {
    if (!salesIdSet[d.SalesId]) {
      return;
    }
    var subtotal = Number(d.Subtotal) || 0;
    if (d.CategoryLarge === 'フード') {
      foodAmount += subtotal;
    } else if (d.CategoryLarge === 'ドリンク') {
      drinkAmount += subtotal;
    }

    if (d.MenuName) {
      if (menuTotals[d.MenuName] === undefined) {
        menuTotals[d.MenuName] = { amount: 0, quantity: 0, category: d.CategoryLarge || '' };
        menuOrder.push(d.MenuName);
      }
      menuTotals[d.MenuName].amount += subtotal;
      menuTotals[d.MenuName].quantity += Number(d.Quantity) || 0;
    }
  });

  function buildRanking(category) {
    return menuOrder
      .filter(function (name) { return menuTotals[name].category === category; })
      .map(function (name) {
        return { MenuName: name, Amount: menuTotals[name].amount, Quantity: menuTotals[name].quantity };
      })
      .sort(function (a, b) { return b.Amount - a.Amount; })
      .slice(0, 5);
  }

  return {
    periodLabel: range.label,
    totalAmount: totalAmount,
    perPersonAmount: perPersonAmount,
    partySize: totalPartySize,
    visitCount: visitCount,
    foodAmount: foodAmount,
    drinkAmount: drinkAmount,
    foodRanking: buildRanking('フード'),
    drinkRanking: buildRanking('ドリンク')
  };
}

// 週次は月曜始まり（日本の業務慣行に合わせる）。月次は暦月（1日〜末日）
function calcPeriodRange_(periodType, refDate) {
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
}
