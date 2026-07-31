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

  var newName = (detailInput.CustomerName || '').trim();
  if (!newName) {
    throw new Error('ニックネームは必須です');
  }
  if (newName !== existing.CustomerName && isDuplicateCustomerName_(newName, existing.CustomerId)) {
    throw new Error('同じニックネームの顧客が既に存在します');
  }

  existing.CustomerName = newName;
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

// 顧客の新規作成（内部処理）。同じニックネームの顧客が既にいる場合はエラーとする（1ニックネーム1人のみ）。
// 伝票入力画面からのその場登録では、既存顧客と同名の場合は新規作成せず既存顧客に紐付ける
// （resolveCustomerId_参照）ため、このエラーには到達しない想定
function createCustomer_(customerName) {
  var name = (customerName || '').trim();
  if (!name) {
    throw new Error('ニックネームは必須です');
  }
  if (isDuplicateCustomerName_(name, '')) {
    throw new Error('同じニックネームの顧客が既に存在します');
  }

  var existingIds = CustomerRepository.findAll().map(function (c) { return c.CustomerId; });
  var now = new Date();

  var customer = {
    CustomerId: SequentialIdRule.generateNext('C', existingIds),
    CustomerName: name,
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

// 指定のニックネームが、excludeCustomerId以外の顧客に既に使われているか
function isDuplicateCustomerName_(customerName, excludeCustomerId) {
  return CustomerRepository.findAll().some(function (c) {
    return c.CustomerId !== excludeCustomerId && c.CustomerName === customerName;
  });
}

function findCustomerByName_(customerName) {
  return CustomerRepository.findAll().filter(function (c) {
    return c.CustomerName === customerName;
  })[0];
}

function findCustomerById_(customerId) {
  return CustomerRepository.findAll().filter(function (c) {
    return c.CustomerId === customerId;
  })[0];
}
