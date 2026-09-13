// アプリケーション層：メニュー管理のユースケース。
// google.script.runはトップレベル関数のみ呼び出せる制約があるため、クライアント公開分はここで
// トップレベル関数として定義する（内部ではドメイン層・データアクセス層をオブジェクトリテラルで呼ぶ）

function getMenuList() {
  return MenuRepository.findAll();
}

// 商品管理画面（SCR-003）の初期表示に必要なデータを1回の呼び出しでまとめて返す
function getMenuManagementData() {
  return {
    menus: MenuRepository.findAll(),
    categories: CategoryRepository.findAll(),
    subCategories: SubCategoryRepository.findAll()
  };
}

function saveMenu(menuInput) {
  validateMenuInput_(menuInput);

  var trimmedName = (menuInput.MenuName || '').trim();
  var allMenus = MenuRepository.findAll();
  var isDuplicateName = allMenus.some(function (m) {
    return m.MenuName === trimmedName && m.MenuId !== menuInput.MenuId;
  });
  if (isDuplicateName) {
    throw new Error('同じ商品名の商品が既に登録されています');
  }

  var menu = {
    MenuName: trimmedName,
    Price: Number(menuInput.Price),
    // 原価が未入力の場合は0を既定値とする（他画面の粗利計算・グラフ化が空文字でエラーになるため）
    Cost: menuInput.Cost === '' || menuInput.Cost === null || menuInput.Cost === undefined ? 0 : Number(menuInput.Cost),
    CategoryLarge: menuInput.CategoryLarge,
    CategoryMedium: menuInput.CategoryMedium
  };

  if (menuInput.MenuId) {
    var existing = findMenuById_(menuInput.MenuId);
    if (!existing) {
      throw new Error('対象の商品が見つかりません：' + menuInput.MenuId);
    }
    menu.MenuId = existing.MenuId;
    menu.IsActive = existing.IsActive;
    // 大分類・中分類が変わった場合は、新しいグループの末尾に並び直す
    if (existing.CategoryLarge === menu.CategoryLarge && existing.CategoryMedium === menu.CategoryMedium) {
      menu.SortOrder = existing.SortOrder;
    } else {
      menu.SortOrder = nextMenuSortOrder_(allMenus, menu.CategoryLarge, menu.CategoryMedium);
    }
    // 印刷メニュー設定（IsOnPrintMenu等）はこの関数の入力に含まれないため、既存値をそのまま引き継ぐ
    // （更新はupdateMenuPrintInfo経由のみとし、名前・価格等の編集のたびに意図せず消えないようにする）
    menu.IsOnPrintMenu = existing.IsOnPrintMenu;
    menu.PrintDisplayName = existing.PrintDisplayName;
    menu.PrintDescription = existing.PrintDescription;
  } else {
    var existingIds = allMenus.map(function (m) { return m.MenuId; });
    menu.MenuId = SequentialIdRule.generateNext('M', existingIds);
    menu.IsActive = true;
    menu.SortOrder = nextMenuSortOrder_(allMenus, menu.CategoryLarge, menu.CategoryMedium);
    menu.IsOnPrintMenu = false;
    menu.PrintDisplayName = '';
    menu.PrintDescription = '';
  }

  MenuRepository.save(menu);
  return menu.MenuId;
}

function nextMenuSortOrder_(allMenus, categoryLarge, categoryMedium) {
  var maxOrder = allMenus
    .filter(function (m) { return m.CategoryLarge === categoryLarge && m.CategoryMedium === categoryMedium; })
    .reduce(function (max, m) { return Math.max(max, Number(m.SortOrder) || 0); }, 0);
  return maxOrder + 1;
}

// 商品一覧のドラッグ並び替え。同じ大分類・中分類グループ内でのSortOrderを、渡された順序で1からの連番に振り直す
function reorderMenus(categoryLarge, categoryMedium, orderedMenuIds) {
  var byId = {};
  MenuRepository.findAll().forEach(function (m) { byId[m.MenuId] = m; });
  orderedMenuIds.forEach(function (menuId, i) {
    var m = byId[menuId];
    if (!m || m.CategoryLarge !== categoryLarge || m.CategoryMedium !== categoryMedium) {
      return;
    }
    var newOrder = i + 1;
    if (Number(m.SortOrder) !== newOrder) {
      m.SortOrder = newOrder;
      MenuRepository.save(m);
    }
  });
}

function deactivateMenu(menuId) {
  var existing = findMenuById_(menuId);
  if (!existing) {
    throw new Error('対象の商品が見つかりません：' + menuId);
  }
  existing.IsActive = false;
  MenuRepository.save(existing);
}

// Menuマスタから完全に削除する（販売終了＝IsActive falseとは別の、取り消しのきかない操作）。
// SalesDetailは登録時点の商品名・単価をスナップショットとして保持しており、Menuを都度参照しないため、
// 過去の会計データには影響しない
function deleteMenu(menuId) {
  var existing = findMenuById_(menuId);
  if (!existing) {
    throw new Error('対象の商品が見つかりません：' + menuId);
  }
  MenuRepository.deleteById(menuId);
}

function reactivateMenu(menuId) {
  var existing = findMenuById_(menuId);
  if (!existing) {
    throw new Error('対象の商品が見つかりません：' + menuId);
  }
  existing.IsActive = true;
  MenuRepository.save(existing);
}

// 印刷メニュー設定（REQ-055）のみを更新する。商品名・価格・カテゴリー等の会計用フィールドには触れない
function updateMenuPrintInfo(menuId, printInfo) {
  var existing = findMenuById_(menuId);
  if (!existing) {
    throw new Error('対象の商品が見つかりません：' + menuId);
  }
  existing.IsOnPrintMenu = !!(printInfo && printInfo.IsOnPrintMenu);
  existing.PrintDisplayName = ((printInfo && printInfo.PrintDisplayName) || '').trim();
  existing.PrintDescription = ((printInfo && printInfo.PrintDescription) || '').trim();
  MenuRepository.save(existing);
}

// 「卓上メニューに載せる」設定済み・販売中の商品だけを、商品一覧と同じカテゴリー・サブカテゴリー
// 表示順のままテキストとして生成する（REQ-055）。整形ロジック自体はSpreadsheetに依存しないため
// ドメイン層（PrintMenuTextBuilder）に委譲している
function generatePrintMenuText() {
  var targetMenus = MenuRepository.findAll().filter(function (m) {
    return m.IsActive && m.IsOnPrintMenu;
  });
  return PrintMenuTextBuilder.build(targetMenus, CategoryRepository.findAll(), SubCategoryRepository.findAll());
}

function findMenuById_(menuId) {
  return MenuRepository.findAll().filter(function (m) {
    return m.MenuId === menuId;
  })[0];
}

function validateMenuInput_(menuInput) {
  if (!menuInput.MenuName) {
    throw new Error('商品名は必須です');
  }
  if (!menuInput.CategoryLarge) {
    throw new Error('大分類は必須です');
  }
  if (!menuInput.CategoryMedium) {
    throw new Error('中分類は必須です');
  }
  if (menuInput.Price === '' || menuInput.Price === null || menuInput.Price === undefined || isNaN(menuInput.Price) || Number(menuInput.Price) < 0) {
    throw new Error('価格は0以上の数値で入力してください');
  }
  var hasCost = !(menuInput.Cost === '' || menuInput.Cost === null || menuInput.Cost === undefined);
  if (hasCost && (isNaN(menuInput.Cost) || Number(menuInput.Cost) < 0)) {
    throw new Error('原価は0以上の数値で入力してください');
  }
}
