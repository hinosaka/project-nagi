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

  var menu = {
    MenuName: menuInput.MenuName,
    Price: Number(menuInput.Price),
    // 原価が未入力の場合は0を既定値とする（他画面の粗利計算・グラフ化が空文字でエラーになるため）
    Cost: menuInput.Cost === '' || menuInput.Cost === null || menuInput.Cost === undefined ? 0 : Number(menuInput.Cost),
    CategoryLarge: menuInput.CategoryLarge,
    CategoryMedium: menuInput.CategoryMedium
  };

  var allMenus = MenuRepository.findAll();

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
  } else {
    var existingIds = allMenus.map(function (m) { return m.MenuId; });
    menu.MenuId = SequentialIdRule.generateNext('M', existingIds);
    menu.IsActive = true;
    menu.SortOrder = nextMenuSortOrder_(allMenus, menu.CategoryLarge, menu.CategoryMedium);
  }

  MenuRepository.save(menu);
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

function reactivateMenu(menuId) {
  var existing = findMenuById_(menuId);
  if (!existing) {
    throw new Error('対象の商品が見つかりません：' + menuId);
  }
  existing.IsActive = true;
  MenuRepository.save(existing);
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
