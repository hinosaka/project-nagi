// アプリケーション層：顧客管理のユースケース。
// google.script.runの制約により、クライアント公開分はトップレベル関数として定義する

function getCustomerList() {
  return CustomerRepository.findAll().map(function (c) {
    return {
      CustomerId: c.CustomerId,
      CustomerName: c.CustomerName,
      PhoneNumber: c.PhoneNumber,
      Memo: c.Memo,
      FirstVisitDate: DateUtil.formatDisplay(c.FirstVisitDate),
      LastVisitDate: DateUtil.formatDisplay(c.LastVisitDate),
      VisitCount: c.VisitCount,
      IsActive: c.IsActive
    };
  });
}

function registerCustomer(customerName) {
  createCustomer_(customerName);
}

function saveCustomerDetail(detailInput) {
  var existing = findCustomerById_(detailInput.CustomerId);
  if (!existing) {
    throw new Error('対象の顧客が見つかりません：' + detailInput.CustomerId);
  }
  existing.PhoneNumber = detailInput.PhoneNumber || '';
  existing.Memo = detailInput.Memo || '';
  CustomerRepository.save(existing);
}

// 顧客がよく注文する商品のランキング（上位3件とそれ以外に分けて返す）
function getCustomerOrderRanking(customerId) {
  var counts = {};
  var order = [];

  SalesDetailRepository.findAll().forEach(function (d) {
    if (d.CustomerId !== customerId || !d.MenuName) {
      return;
    }
    if (counts[d.MenuName] === undefined) {
      counts[d.MenuName] = 0;
      order.push(d.MenuName);
    }
    counts[d.MenuName] += Number(d.Quantity) || 0;
  });

  var ranking = order
    .map(function (name) {
      return { MenuName: name, Quantity: counts[name] };
    })
    .sort(function (a, b) {
      return b.Quantity - a.Quantity;
    });

  return {
    top: ranking.slice(0, 3),
    others: ranking.slice(3)
  };
}

// 顧客の新規作成（内部処理）。伝票入力画面からのその場登録でも利用する
function createCustomer_(customerName) {
  if (!customerName) {
    throw new Error('ニックネームは必須です');
  }

  var existingIds = CustomerRepository.findAll().map(function (c) { return c.CustomerId; });
  var now = new Date();

  var customer = {
    CustomerId: SequentialIdRule.generateNext('C', existingIds),
    CustomerName: customerName,
    PhoneNumber: '',
    Memo: '',
    FirstVisitDate: now,
    LastVisitDate: now,
    VisitCount: 0,
    IsActive: true
  };

  CustomerRepository.save(customer);
  return customer;
}

function findCustomerById_(customerId) {
  return CustomerRepository.findAll().filter(function (c) {
    return c.CustomerId === customerId;
  })[0];
}
