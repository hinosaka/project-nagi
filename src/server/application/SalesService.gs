// アプリケーション層：伝票入力のユースケース。
// google.script.runの制約により、クライアント公開分はトップレベル関数として定義する

function getSalesEntryData(salesDateStr) {
  var salesDate = new Date(salesDateStr);

  var allCustomers = CustomerRepository.findAll();
  var customerById = {};
  allCustomers.forEach(function (c) {
    customerById[c.CustomerId] = c;
  });

  var businessDayRow = BusinessDayRepository.findByDate(salesDate);

  return {
    menuList: MenuRepository.findAll().filter(function (m) { return m.IsActive; }),
    seatList: SeatRepository.findAll().filter(function (s) { return s.IsActive; }),
    customerList: buildActiveCustomerList_(allCustomers),
    businessDay: businessDayRow ? { Weather: businessDayRow.Weather, DayOfWeek: businessDayRow.DayOfWeek } : null,
    salesList: buildSalesListForDate_(salesDate, customerById),
    subCategoriesByLarge: buildSubCategoriesByLarge_()
  };
}

// 顧客一覧（アクティブのみ、最終来店日が新しい順）。伝票入力の顧客オートコンプリート・
// 会計管理の伝票一覧表示（顧客名）で使う形
function buildActiveCustomerList_(allCustomers) {
  return allCustomers
    .filter(function (c) { return c.IsActive; })
    .sort(function (a, b) { return new Date(b.LastVisitDate) - new Date(a.LastVisitDate); })
    .map(function (c) {
      return {
        CustomerId: c.CustomerId,
        CustomerName: c.CustomerName,
        LastVisitDate: DateUtil.formatDisplay(c.LastVisitDate)
      };
    });
}

// 大分類名（"ドリンク"等）ごとの中分類名一覧（SortOrder順）。
// その他商品（登録外商品）にも統計・分析用に中分類を選ばせるため、伝票入力側に渡す
function buildSubCategoriesByLarge_() {
  var categoryNameById = {};
  CategoryRepository.findAll().forEach(function (c) { categoryNameById[c.CategoryId] = c.CategoryName; });

  var result = {};
  SubCategoryRepository.findAll()
    .sort(function (a, b) { return Number(a.SortOrder) - Number(b.SortOrder); })
    .forEach(function (sub) {
      var largeName = categoryNameById[sub.CategoryId];
      if (!largeName) { return; }
      if (!result[largeName]) { result[largeName] = []; }
      result[largeName].push(sub.SubCategoryName);
    });
  return result;
}

function saveBusinessDayWeather(salesDateStr, weather) {
  if (!weather) {
    throw new Error('天候は必須です');
  }
  var salesDate = new Date(salesDateStr);
  BusinessDayRepository.save({
    BusinessDayId: 'BD-' + DateUtil.formatYmd(salesDate).replace(/-/g, ''),
    SalesDate: salesDate,
    DayOfWeek: DayOfWeekRule.fromDate(salesDate),
    Weather: weather
  });
}

// 天候ボタンをタップした直後に画面を軽く更新するための専用関数（ページ全体の再取得はしない）
function saveBusinessDayWeatherAndGetData(salesDateStr, weather) {
  saveBusinessDayWeather(salesDateStr, weather);
  var businessDayRow = BusinessDayRepository.findByDate(new Date(salesDateStr));
  return businessDayRow ? { Weather: businessDayRow.Weather, DayOfWeek: businessDayRow.DayOfWeek } : null;
}

function saveSalesEntry(input) {
  validateSalesInput_(input);

  var salesDate = new Date(input.SalesDate);
  var details = buildDetailRows_(input.details);
  var totalAmount = SalesCalculator.calcTotalAmount(details);

  var oldCustomerId = '';
  var salesId = input.SalesId;
  var registeredAt = new Date();

  if (salesId) {
    var existingSales = findSalesById_(salesId);
    if (!existingSales) {
      throw new Error('対象の会計が見つかりません：' + salesId);
    }
    oldCustomerId = existingSales.CustomerId;
    registeredAt = existingSales.RegisteredAt;
    SalesDetailRepository.deleteBySalesId(salesId);
  } else {
    var existingIds = SalesRepository.findAll().map(function (s) { return s.SalesId; });
    salesId = SalesIdRule.generateNext(salesDate, existingIds);
  }

  var customerId = resolveCustomerId_(input);

  SalesRepository.save({
    SalesId: salesId,
    SalesDate: salesDate,
    CustomerId: customerId,
    SeatId: input.SeatId || '',
    PartySize: Number(input.PartySize),
    TotalAmount: totalAmount,
    Note: input.Note || '',
    RegisteredAt: registeredAt
  });

  var detailRows = details.map(function (d, i) {
    d.SalesDetailId = salesId + '-' + (i + 1);
    d.SalesId = salesId;
    d.CustomerId = customerId;
    return d;
  });
  SalesDetailRepository.saveAll(detailRows);

  recalcCustomerVisitStats_(oldCustomerId);
  recalcCustomerVisitStats_(customerId);

  var allCustomers = CustomerRepository.findAll();
  var savedCustomer = customerId ? allCustomers.filter(function (c) { return c.CustomerId === customerId; })[0] : null;

  return {
    item: {
      SalesId: salesId,
      PartySize: Number(input.PartySize),
      SeatId: input.SeatId || '',
      CustomerId: customerId,
      CustomerName: savedCustomer ? savedCustomer.CustomerName : '',
      TotalAmount: totalAmount,
      Note: input.Note || '',
      details: detailRows
    },
    customerList: buildActiveCustomerList_(allCustomers)
  };
}

// 会計管理画面：伝票削除後、日別一覧を丸ごと再取得せずに済むよう、削除対象のSalesIdと
// 顧客一覧（来店統計が変わるため）だけを返す
function deleteSalesEntry(salesId) {
  var existing = findSalesById_(salesId);
  if (!existing) {
    throw new Error('対象の会計が見つかりません：' + salesId);
  }
  SalesDetailRepository.deleteBySalesId(salesId);
  SalesRepository.deleteById(salesId);
  recalcCustomerVisitStats_(existing.CustomerId);

  return {
    deletedSalesId: salesId,
    customerList: buildActiveCustomerList_(CustomerRepository.findAll())
  };
}

function buildSalesListForDate_(salesDate, customerById) {
  var salesRows = SalesRepository.findByDate(salesDate);
  var detailsBySalesId = groupDetailsBySalesId_(salesRows.map(function (s) { return s.SalesId; }));

  return salesRows.map(function (s) {
    return {
      SalesId: s.SalesId,
      PartySize: s.PartySize,
      SeatId: s.SeatId,
      CustomerId: s.CustomerId,
      CustomerName: s.CustomerId && customerById[s.CustomerId] ? customerById[s.CustomerId].CustomerName : '',
      TotalAmount: s.TotalAmount,
      Note: s.Note,
      details: detailsBySalesId[s.SalesId] || []
    };
  });
}

// SalesDetailRepository.findBySalesId()を会計件数ぶん繰り返し呼ぶとSalesDetail全体を毎回読み直すことになり
// 遅くなるため、1回のfindAll()結果をSalesIdでグルーピングして使う
function groupDetailsBySalesId_(salesIds) {
  var idSet = {};
  salesIds.forEach(function (id) {
    idSet[id] = true;
  });

  var grouped = {};
  SalesDetailRepository.findAll().forEach(function (d) {
    if (!idSet[d.SalesId]) {
      return;
    }
    if (!grouped[d.SalesId]) {
      grouped[d.SalesId] = [];
    }
    grouped[d.SalesId].push(d);
  });
  return grouped;
}

function buildDetailRows_(rawDetails) {
  return rawDetails.map(function (d) {
    var unitPrice = Number(d.UnitPrice);
    var quantity = Number(d.Quantity);
    var hasCost = !(d.UnitCost === '' || d.UnitCost === null || d.UnitCost === undefined);
    return {
      MenuId: d.MenuId || '',
      MenuName: d.MenuName,
      UnitPrice: unitPrice,
      UnitCost: hasCost ? Number(d.UnitCost) : '',
      Quantity: quantity,
      Subtotal: SalesCalculator.calcSubtotal(unitPrice, quantity),
      CategoryLarge: d.CategoryLarge || '',
      CategoryMedium: d.CategoryMedium || ''
    };
  });
}

// 新規顧客名が既存顧客と同じニックネームの場合は、重複作成せず既存顧客にそのまま紐付ける
// （オートコンプリートの候補をタップし忘れた場合の取りこぼし対策。1ニックネーム1人のみの原則を守る）
function resolveCustomerId_(input) {
  if (input.CustomerId) {
    return input.CustomerId;
  }
  if (input.NewCustomerName) {
    var existing = findCustomerByName_(input.NewCustomerName.trim());
    if (existing) {
      return existing.CustomerId;
    }
    return createCustomer_(input.NewCustomerName).CustomerId;
  }
  return '';
}

function recalcCustomerVisitStats_(customerId) {
  if (!customerId) {
    return;
  }
  var customer = findCustomerById_(customerId);
  if (!customer) {
    return;
  }
  var stats = VisitStatsCalculator.calc(SalesRepository.findByCustomerId(customerId));
  customer.VisitCount = stats.VisitCount;
  customer.FirstVisitDate = stats.FirstVisitDate || customer.FirstVisitDate;
  customer.LastVisitDate = stats.LastVisitDate || customer.FirstVisitDate;
  CustomerRepository.save(customer);
}

function findSalesById_(salesId) {
  return SalesRepository.findAll().filter(function (s) {
    return s.SalesId === salesId;
  })[0];
}

function validateSalesInput_(input) {
  if (!input.SalesDate) {
    throw new Error('会計日は必須です');
  }
  if (!input.PartySize || Number(input.PartySize) <= 0) {
    throw new Error('人数は1以上の数値で入力してください');
  }
  if (!input.details || input.details.length === 0) {
    throw new Error('明細を1件以上入力してください');
  }
  input.details.forEach(function (d) {
    if (!d.MenuName) {
      throw new Error('明細の商品名は必須です');
    }
    if (d.UnitPrice === '' || d.UnitPrice === null || d.UnitPrice === undefined || isNaN(d.UnitPrice) || Number(d.UnitPrice) < 0) {
      throw new Error('明細の単価は0以上の数値で入力してください');
    }
    if (!d.Quantity || Number(d.Quantity) <= 0) {
      throw new Error('明細の数量は1以上の数値で入力してください');
    }
  });
  if (input.CustomerId && input.NewCustomerName) {
    throw new Error('既存顧客の選択と新規顧客名の指定は同時にできません');
  }
}
