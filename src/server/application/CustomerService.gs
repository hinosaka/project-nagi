// アプリケーション層：顧客管理のユースケース。
// google.script.runの制約により、クライアント公開分はトップレベル関数として定義する

function getCustomerList() {
  // google.script.runでDate型をそのまま返すと扱いが不安定なため、文字列に整形して返す
  return CustomerRepository.findAll().map(function (c) {
    return {
      CustomerId: c.CustomerId,
      CustomerName: c.CustomerName,
      PhoneNumber: c.PhoneNumber,
      Memo: c.Memo,
      FirstVisitDate: formatDate_(c.FirstVisitDate),
      LastVisitDate: formatDate_(c.LastVisitDate),
      VisitCount: c.VisitCount,
      IsActive: c.IsActive
    };
  });
}

function registerCustomer(customerName) {
  if (!customerName) {
    throw new Error('ニックネームは必須です');
  }

  var existingIds = CustomerRepository.findAll().map(function (c) { return c.CustomerId; });
  var now = new Date();

  CustomerRepository.save({
    CustomerId: SequentialIdRule.generateNext('C', existingIds),
    CustomerName: customerName,
    PhoneNumber: '',
    Memo: '',
    FirstVisitDate: now,
    LastVisitDate: now,
    VisitCount: 0,
    IsActive: true
  });
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

function findCustomerById_(customerId) {
  return CustomerRepository.findAll().filter(function (c) {
    return c.CustomerId === customerId;
  })[0];
}

function formatDate_(date) {
  if (!date) {
    return '';
  }
  return Utilities.formatDate(new Date(date), Session.getScriptTimeZone(), 'yyyy/MM/dd');
}
