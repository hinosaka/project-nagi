// アプリケーション層：経費管理のユースケース。
// google.script.runの制約により、クライアント公開分はトップレベル関数として定義する
//
// 仕入れ・家賃・水道光熱費など、日々発生する経費を区分（ExpenseCategory）ごとに記録し、
// 月次の予定額（ExpenseTarget）と実績（Expense）を比較する。既存のSales/SalesTarget/予算管理と
// 同じ設計方針（区分マスタは論理削除、月次目標は1区分1ヶ月1行、実績は日次トランザクションIDで
// 採番しLockUtilで排他化する）を踏襲する

function getExpenseCategoryList() {
  return ExpenseCategoryRepository.findAll();
}

function createExpenseCategory(name) {
  var trimmed = (name || '').trim();
  if (!trimmed) {
    throw new Error('区分名を入力してください');
  }
  var categories = ExpenseCategoryRepository.findAll();
  if (categories.some(function (c) { return c.ExpenseCategoryName === trimmed; })) {
    throw new Error('同じ名前の区分が既にあります');
  }

  var existingIds = categories.map(function (c) { return c.ExpenseCategoryId; });
  var maxOrder = categories.reduce(function (max, c) { return Math.max(max, Number(c.SortOrder) || 0); }, 0);
  var categoryId = SequentialIdRule.generateNext('EC', existingIds);
  ExpenseCategoryRepository.save({
    ExpenseCategoryId: categoryId,
    ExpenseCategoryName: trimmed,
    SortOrder: maxOrder + 1,
    IsActive: true,
    IsCostOfGoods: false
  });
  return categoryId;
}

function renameExpenseCategory(categoryId, newName) {
  var trimmed = (newName || '').trim();
  if (!trimmed) {
    throw new Error('区分名を入力してください');
  }
  var categories = ExpenseCategoryRepository.findAll();
  var target = categories.filter(function (c) { return c.ExpenseCategoryId === categoryId; })[0];
  if (!target) {
    throw new Error('対象の区分が見つかりません：' + categoryId);
  }
  if (categories.some(function (c) { return c.ExpenseCategoryName === trimmed && c.ExpenseCategoryId !== categoryId; })) {
    throw new Error('同じ名前の区分が既にあります');
  }
  target.ExpenseCategoryName = trimmed;
  ExpenseCategoryRepository.save(target);
}

function deactivateExpenseCategory(categoryId) {
  setExpenseCategoryActive_(categoryId, false);
}

function reactivateExpenseCategory(categoryId) {
  setExpenseCategoryActive_(categoryId, true);
}

function setExpenseCategoryActive_(categoryId, isActive) {
  var target = ExpenseCategoryRepository.findAll().filter(function (c) { return c.ExpenseCategoryId === categoryId; })[0];
  if (!target) {
    throw new Error('対象の区分が見つかりません：' + categoryId);
  }
  target.IsActive = isActive;
  ExpenseCategoryRepository.save(target);
}

// 損益（3.8参照）で「原価」として扱う区分かどうかを切り替える。区分名は改名されうるため、
// 名前ではなくこのフラグで判別する（DATABASE.md ExpenseCategory参照）
function setExpenseCategoryCostFlag_(categoryId, isCostOfGoods) {
  var target = ExpenseCategoryRepository.findAll().filter(function (c) { return c.ExpenseCategoryId === categoryId; })[0];
  if (!target) {
    throw new Error('対象の区分が見つかりません：' + categoryId);
  }
  target.IsCostOfGoods = isCostOfGoods;
  ExpenseCategoryRepository.save(target);
}

// 区分一覧の並び替え。渡された順序でSortOrderを1からの連番に振り直す（MenuService.reorderMenusと同じ考え方）
function reorderExpenseCategories(orderedCategoryIds) {
  var byId = {};
  ExpenseCategoryRepository.findAll().forEach(function (c) { byId[c.ExpenseCategoryId] = c; });
  orderedCategoryIds.forEach(function (categoryId, i) {
    var c = byId[categoryId];
    if (!c) { return; }
    var newOrder = i + 1;
    if (Number(c.SortOrder) !== newOrder) {
      c.SortOrder = newOrder;
      ExpenseCategoryRepository.save(c);
    }
  });
}

function getExpenseVendorList() {
  return ExpenseVendorRepository.findAll();
}

// 予実タブの「編集」→「保存」をまとめて1回のサーバー呼び出しで反映する。
// クライアント側で区分の新規作成・並び替え・有効/無効・改名・予定額保存を区分の数だけ
// 個別に呼んでいたところ、書き込み系の呼び出しは（二重実行防止のため）自動リトライの対象外で、
// 区分数が多いと1回の保存で10回以上の通信が発生し、途中の1回でも一過性の通信エラーが起きると
// 保存全体が失敗する不具合があった。1回の呼び出しにまとめることで通信回数そのものを減らす。
//
// rows: [{ExpenseCategoryId（新規は空文字）, ExpenseCategoryName, targetAmount, note,
//         IsActive, originalName, originalIsActive, isNew}]（画面表示順）
function saveExpenseCategoryEdits(yearMonth, rows) {
  // ①：ローカルで追加しただけ（isNew）の区分を実際に作成し、実IDを確定する
  rows.forEach(function (r) {
    if (r.isNew) {
      r.ExpenseCategoryId = createExpenseCategory(r.ExpenseCategoryName);
    }
  });

  // ②：画面上の並び順を保存する（新規分もこの時点で実IDを持つ）
  reorderExpenseCategories(rows.map(function (r) { return r.ExpenseCategoryId; }));

  // ③：既存区分の改名・有効/無効・予定額を保存する
  //    （新規作成した区分は、作成時点で名前・有効状態が正しいため改名・有効化は不要）
  rows.forEach(function (r) {
    if (!r.isNew) {
      var newName = (r.ExpenseCategoryName || '').trim();
      if (newName && newName !== r.originalName) {
        renameExpenseCategory(r.ExpenseCategoryId, newName);
      }
      if (r.IsActive !== r.originalIsActive) {
        if (r.IsActive) {
          reactivateExpenseCategory(r.ExpenseCategoryId);
        } else {
          deactivateExpenseCategory(r.ExpenseCategoryId);
        }
      }
    }
    // 原価区分の切替は新規作成分（デフォルトfalse）にも起こりうるため、isNewにかかわらず判定する
    if (!!r.IsCostOfGoods !== !!r.originalIsCostOfGoods) {
      setExpenseCategoryCostFlag_(r.ExpenseCategoryId, !!r.IsCostOfGoods);
    }
    // 無効化した区分に今月の目標額を設定しても意味がないため、予定額の保存は有効な区分のみ行う
    if (r.IsActive) {
      saveExpenseTarget(yearMonth, r.ExpenseCategoryId, r.targetAmount || 0, r.note || '');
    }
  });

  return getExpenseManagementData(yearMonth);
}

// 経費管理画面の初期表示・月切替のたびに呼ぶ。対象月の区分別予定・実績・達成率をまとめて返す
function getExpenseManagementData(yearMonth) {
  var categories = ExpenseCategoryRepository.findAll();
  var activeCategories = categories
    .filter(function (c) { return c.IsActive; })
    .sort(function (a, b) { return (Number(a.SortOrder) || 0) - (Number(b.SortOrder) || 0); });
  // 無効化した区分の一覧（編集モードで「有効に戻す」操作に使う）
  var inactiveCategories = categories.filter(function (c) { return !c.IsActive; });
  var categoryNameById = {};
  categories.forEach(function (c) { categoryNameById[c.ExpenseCategoryId] = c.ExpenseCategoryName; });

  var vendors = ExpenseVendorRepository.findAll();
  var activeVendors = vendors.filter(function (v) { return v.IsActive; });
  var vendorNameById = {};
  vendors.forEach(function (v) { vendorNameById[v.ExpenseVendorId] = v.ExpenseVendorName; });

  var targetByCategoryId = {};
  ExpenseTargetRepository.findByMonth(yearMonth).forEach(function (t) {
    targetByCategoryId[t.ExpenseCategoryId] = t;
  });

  var entries = ExpenseRepository.findByMonth(yearMonth)
    .sort(function (a, b) { return new Date(b.ExpenseDate) - new Date(a.ExpenseDate); })
    .map(function (e) {
      return {
        ExpenseId: e.ExpenseId,
        ExpenseDate: DateUtil.formatYmd(e.ExpenseDate),
        ExpenseCategoryId: e.ExpenseCategoryId,
        ExpenseCategoryName: categoryNameById[e.ExpenseCategoryId] || '（不明な区分）',
        ExpenseVendorId: e.ExpenseVendorId || '',
        ExpenseVendorName: e.ExpenseVendorId ? (vendorNameById[e.ExpenseVendorId] || '（不明な取引先）') : '',
        Amount: Number(e.Amount) || 0,
        Note: e.Note || ''
      };
    });

  var actualByCategoryId = {};
  entries.forEach(function (e) {
    actualByCategoryId[e.ExpenseCategoryId] = (actualByCategoryId[e.ExpenseCategoryId] || 0) + e.Amount;
  });

  var summary = activeCategories.map(function (c) {
    var target = targetByCategoryId[c.ExpenseCategoryId];
    var targetAmount = target ? Number(target.TargetAmount) || 0 : 0;
    var hasTarget = !!target && targetAmount > 0;
    var actualAmount = actualByCategoryId[c.ExpenseCategoryId] || 0;
    return {
      ExpenseCategoryId: c.ExpenseCategoryId,
      ExpenseCategoryName: c.ExpenseCategoryName,
      IsCostOfGoods: !!c.IsCostOfGoods,
      targetAmount: targetAmount,
      hasTarget: hasTarget,
      note: target ? (target.Note || '') : '',
      actualAmount: actualAmount,
      achievementRate: hasTarget ? Math.round((actualAmount / targetAmount) * 100) : null
    };
  });

  var totalTarget = summary.reduce(function (sum, s) { return sum + (s.hasTarget ? s.targetAmount : 0); }, 0);
  var totalActual = entries.reduce(function (sum, e) { return sum + e.Amount; }, 0);

  return {
    yearMonth: yearMonth,
    categories: activeCategories,
    inactiveCategories: inactiveCategories,
    vendors: activeVendors,
    summary: summary,
    entries: entries,
    totals: {
      targetAmount: totalTarget,
      actualAmount: totalActual,
      achievementRate: totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : null
    }
  };
}

// 月次比較タブ用：指定年の12ヶ月分を区分別に1回でまとめて返す
// （月ごとにgetExpenseManagementDataを呼ぶとSales/Targetの全件読み込みが12回発生してしまうため、
// getBudgetDataForYearと同じ考え方で1回にまとめる）
function getExpenseYearlyData(year) {
  var categories = ExpenseCategoryRepository.findAll()
    .filter(function (c) { return c.IsActive; })
    .sort(function (a, b) { return (Number(a.SortOrder) || 0) - (Number(b.SortOrder) || 0); });

  var targetByMonthCategory = {};
  ExpenseTargetRepository.findAll().forEach(function (t) {
    if (!targetByMonthCategory[t.TargetMonth]) { targetByMonthCategory[t.TargetMonth] = {}; }
    targetByMonthCategory[t.TargetMonth][t.ExpenseCategoryId] = Number(t.TargetAmount) || 0;
  });

  var actualByMonthCategory = {};
  ExpenseRepository.findAll().forEach(function (e) {
    var ym = DateUtil.formatYm(e.ExpenseDate);
    if (ym.indexOf(String(year)) !== 0) { return; }
    if (!actualByMonthCategory[ym]) { actualByMonthCategory[ym] = {}; }
    actualByMonthCategory[ym][e.ExpenseCategoryId] = (actualByMonthCategory[ym][e.ExpenseCategoryId] || 0) + (Number(e.Amount) || 0);
  });

  var months = [];
  for (var m = 1; m <= 12; m++) {
    var ym = year + '-' + ('0' + m).slice(-2);
    var byCategory = {};
    var totalTarget = 0;
    var totalActual = 0;
    categories.forEach(function (c) {
      var target = (targetByMonthCategory[ym] || {})[c.ExpenseCategoryId] || 0;
      var actual = (actualByMonthCategory[ym] || {})[c.ExpenseCategoryId] || 0;
      byCategory[c.ExpenseCategoryId] = { targetAmount: target, actualAmount: actual };
      totalTarget += target;
      totalActual += actual;
    });
    months.push({
      month: ym,
      label: m + '月',
      byCategory: byCategory,
      totalTarget: totalTarget,
      totalActual: totalActual,
      achievementRate: totalTarget > 0 ? Math.round((totalActual / totalTarget) * 100) : null
    });
  }

  return { year: year, categories: categories, months: months };
}

function saveExpenseTarget(yearMonth, categoryId, amount, note) {
  var targetAmount = Number(amount);
  if (!(targetAmount >= 0)) {
    throw new Error('目標額には0以上の数値を入力してください');
  }
  ExpenseTargetRepository.save({
    ExpenseTargetId: 'EXT-' + yearMonth.replace('-', '') + '-' + categoryId,
    TargetMonth: yearMonth,
    ExpenseCategoryId: categoryId,
    TargetAmount: targetAmount,
    Note: note || ''
  });
  return getExpenseManagementData(yearMonth);
}

function saveExpenseEntry(input) {
  if (!input.ExpenseDate) {
    throw new Error('日付は必須です');
  }
  if (!input.ExpenseCategoryId) {
    throw new Error('区分は必須です');
  }
  var amount = Number(input.Amount);
  if (!(amount >= 0)) {
    throw new Error('金額には0以上の数値を入力してください');
  }

  var expenseDate = new Date(input.ExpenseDate);
  var expenseId = input.ExpenseId;
  var registeredAt = new Date();
  var vendorId = resolveExpenseVendorId_(input);

  // ID採番（既存ID一覧から次番号を決める）〜保存までを排他化する（SalesService.saveSalesEntryと
  // 同じ理由。複数人が同時に新規経費を登録した場合のID衝突・上書き消失を防ぐ。LockUtil.gs参照）
  LockUtil.withLock(function () {
    if (expenseId) {
      var existing = findExpenseById_(expenseId);
      if (!existing) {
        throw new Error('対象の経費が見つかりません：' + expenseId);
      }
      registeredAt = existing.RegisteredAt;
    } else {
      var existingIds = ExpenseRepository.findAll().map(function (e) { return e.ExpenseId; });
      expenseId = DailyIdRule.generateNext('EXP', expenseDate, existingIds);
    }

    ExpenseRepository.save({
      ExpenseId: expenseId,
      ExpenseDate: expenseDate,
      ExpenseCategoryId: input.ExpenseCategoryId,
      Amount: amount,
      Note: input.Note || '',
      RegisteredAt: registeredAt,
      ExpenseVendorId: vendorId
    });
  });

  return getExpenseManagementData(DateUtil.formatYm(expenseDate));
}

// 新規取引先名が既存の取引先と同じ名前の場合は、重複作成せず既存の取引先にそのまま紐付ける
// （SalesService.resolveCustomerId_と同じ考え方。1名称1取引先の原則を守る）
function resolveExpenseVendorId_(input) {
  if (input.ExpenseVendorId) {
    return input.ExpenseVendorId;
  }
  if (input.NewVendorName) {
    var trimmed = input.NewVendorName.trim();
    if (!trimmed) {
      return '';
    }
    var vendors = ExpenseVendorRepository.findAll();
    var existing = vendors.filter(function (v) { return v.ExpenseVendorName === trimmed; })[0];
    if (existing) {
      return existing.ExpenseVendorId;
    }
    var existingIds = vendors.map(function (v) { return v.ExpenseVendorId; });
    var vendorId = SequentialIdRule.generateNext('EV', existingIds);
    ExpenseVendorRepository.save({ ExpenseVendorId: vendorId, ExpenseVendorName: trimmed, IsActive: true });
    return vendorId;
  }
  return '';
}

function deleteExpenseEntry(expenseId) {
  var existing = findExpenseById_(expenseId);
  if (!existing) {
    throw new Error('対象の経費が見つかりません：' + expenseId);
  }
  ExpenseRepository.deleteById(expenseId);
  return getExpenseManagementData(DateUtil.formatYm(existing.ExpenseDate));
}

function findExpenseById_(expenseId) {
  return ExpenseRepository.findAll().filter(function (e) {
    return e.ExpenseId === expenseId;
  })[0];
}
