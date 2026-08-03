// アプリケーション層：商品カテゴリー・サブカテゴリー管理（SCR-003 カテゴリー管理／商品一覧）のユースケース。
//
// Menu.CategoryLarge/CategoryMedium は引き続き文字列（カテゴリー名）で保持する（Category/SubCategoryへの
// 外部キー化はしない）。カテゴリー名・サブカテゴリー名の変更時は、対象のMenu行のCategoryLarge/CategoryMedium
// を新しい名称に一括更新する（カスケード）ことで、既存商品の分類を維持する。SalesDetailは登録時点の
// スナップショットのため、この一括更新の影響を受けない

function getCategoryList() {
  return CategoryRepository.findAll();
}

function getSubCategoryList() {
  return SubCategoryRepository.findAll();
}

function renameCategory(categoryId, newName) {
  var name = (newName || '').trim();
  if (!name) {
    throw new Error('カテゴリー名を入力してください');
  }
  var categories = CategoryRepository.findAll();
  var target = categories.filter(function (c) { return c.CategoryId === categoryId; })[0];
  if (!target) {
    throw new Error('対象のカテゴリーが見つかりません：' + categoryId);
  }
  if (categories.some(function (c) { return c.CategoryName === name && c.CategoryId !== categoryId; })) {
    throw new Error('同じ名前のカテゴリーが既にあります');
  }

  var oldName = target.CategoryName;
  if (oldName === name) {
    return;
  }
  target.CategoryName = name;
  CategoryRepository.save(target);

  MenuRepository.findAll().forEach(function (menu) {
    if (menu.CategoryLarge === oldName) {
      menu.CategoryLarge = name;
      MenuRepository.save(menu);
    }
  });
}

function createSubCategory(categoryId, subCategoryName) {
  var name = (subCategoryName || '').trim();
  if (!name) {
    throw new Error('サブカテゴリー名を入力してください');
  }
  var subCategories = SubCategoryRepository.findAll();
  var scoped = subCategories.filter(function (s) { return s.CategoryId === categoryId; });
  if (scoped.some(function (s) { return s.SubCategoryName === name; })) {
    throw new Error('同じ名前のサブカテゴリーが既にあります');
  }

  var maxOrder = scoped.reduce(function (max, s) { return Math.max(max, Number(s.SortOrder) || 0); }, 0);
  var existingIds = subCategories.map(function (s) { return s.SubCategoryId; });
  var subCategoryId = SequentialIdRule.generateNext('SCT', existingIds);
  SubCategoryRepository.save({
    SubCategoryId: subCategoryId,
    CategoryId: categoryId,
    SubCategoryName: name,
    SortOrder: maxOrder + 1
  });
  return subCategoryId;
}

function renameSubCategory(subCategoryId, newName) {
  var name = (newName || '').trim();
  if (!name) {
    throw new Error('サブカテゴリー名を入力してください');
  }
  var subCategories = SubCategoryRepository.findAll();
  var target = subCategories.filter(function (s) { return s.SubCategoryId === subCategoryId; })[0];
  if (!target) {
    throw new Error('対象のサブカテゴリーが見つかりません：' + subCategoryId);
  }
  var scoped = subCategories.filter(function (s) { return s.CategoryId === target.CategoryId; });
  if (scoped.some(function (s) { return s.SubCategoryName === name && s.SubCategoryId !== subCategoryId; })) {
    throw new Error('同じ名前のサブカテゴリーが既にあります');
  }

  var category = CategoryRepository.findAll().filter(function (c) { return c.CategoryId === target.CategoryId; })[0];
  var oldName = target.SubCategoryName;
  if (oldName === name) {
    return;
  }
  target.SubCategoryName = name;
  SubCategoryRepository.save(target);

  if (category) {
    MenuRepository.findAll().forEach(function (menu) {
      if (menu.CategoryLarge === category.CategoryName && menu.CategoryMedium === oldName) {
        menu.CategoryMedium = name;
        MenuRepository.save(menu);
      }
    });
  }
}

// SubCategoryは論理削除（IsActive）を持たないため物理削除する（Menuの商品削除と同じ考え方）。
// Menu.CategoryMediumはSubCategoryへの外部キーではなく文字列スナップショットのため、
// 削除してもこのサブカテゴリーに属していた商品自体は壊れず残る（分類名は保持される）
function deleteSubCategory(subCategoryId) {
  var target = SubCategoryRepository.findAll().filter(function (s) { return s.SubCategoryId === subCategoryId; })[0];
  if (!target) {
    throw new Error('対象のサブカテゴリーが見つかりません：' + subCategoryId);
  }
  SubCategoryRepository.deleteById(subCategoryId);
}

// directionは-1（上へ）または1（下へ）。同じ大分類内での並び順を入れ替えたうえで、
// SortOrderを1からの連番に振り直して保存する（重複・欠番があっても自己修復する）
function moveSubCategory(subCategoryId, direction) {
  var subCategories = SubCategoryRepository.findAll();
  var target = subCategories.filter(function (s) { return s.SubCategoryId === subCategoryId; })[0];
  if (!target) {
    throw new Error('対象のサブカテゴリーが見つかりません：' + subCategoryId);
  }
  var siblings = subCategories
    .filter(function (s) { return s.CategoryId === target.CategoryId; })
    .sort(function (a, b) { return (Number(a.SortOrder) || 0) - (Number(b.SortOrder) || 0); });

  var index = siblings.indexOf(target);
  var newIndex = index + direction;
  if (newIndex < 0 || newIndex >= siblings.length) {
    return;
  }

  siblings.splice(index, 1);
  siblings.splice(newIndex, 0, target);
  siblings.forEach(function (s, i) {
    var newOrder = i + 1;
    if (Number(s.SortOrder) !== newOrder) {
      s.SortOrder = newOrder;
      SubCategoryRepository.save(s);
    }
  });
}

// サブカテゴリー一覧のドラッグ並び替え。同じ大分類内でのSortOrderを、渡された順序で1からの連番に振り直す
function reorderSubCategories(categoryId, orderedSubCategoryIds) {
  var byId = {};
  SubCategoryRepository.findAll().forEach(function (s) { byId[s.SubCategoryId] = s; });
  orderedSubCategoryIds.forEach(function (subCategoryId, i) {
    var s = byId[subCategoryId];
    if (!s || s.CategoryId !== categoryId) {
      return;
    }
    var newOrder = i + 1;
    if (Number(s.SortOrder) !== newOrder) {
      s.SortOrder = newOrder;
      SubCategoryRepository.save(s);
    }
  });
}
