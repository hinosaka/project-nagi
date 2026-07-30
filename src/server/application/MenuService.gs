// アプリケーション層：メニュー管理のユースケース。
// google.script.runはトップレベル関数のみ呼び出せる制約があるため、クライアント公開分はここで
// トップレベル関数として定義する（内部ではドメイン層・データアクセス層をオブジェクトリテラルで呼ぶ）

function getMenuList() {
  return MenuRepository.findAll();
}

function saveMenu(menuInput) {
  validateMenuInput_(menuInput);

  var menu = {
    MenuName: menuInput.MenuName,
    Price: Number(menuInput.Price),
    Cost: menuInput.Cost === '' || menuInput.Cost === null || menuInput.Cost === undefined ? '' : Number(menuInput.Cost),
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
  } else {
    var existingIds = MenuRepository.findAll().map(function (m) { return m.MenuId; });
    menu.MenuId = MenuIdRule.generateNext(existingIds);
    menu.IsActive = true;
  }

  MenuRepository.save(menu);
}

function deactivateMenu(menuId) {
  var existing = findMenuById_(menuId);
  if (!existing) {
    throw new Error('対象の商品が見つかりません：' + menuId);
  }
  existing.IsActive = false;
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
