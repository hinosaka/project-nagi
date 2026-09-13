// ドメイン層：印刷メニュー用テキストの組み立て（Spreadsheetに依存しない純粋ロジック、REQ-055）
var PrintMenuTextBuilder = {
  // menus: IsActive && IsOnPrintMenu で絞り込み済みのMenu配列
  // categories: CategoryRepository.findAll()の結果（表示順＝シート登録順）
  // subCategories: SubCategoryRepository.findAll()の結果（大分類ごとにSortOrderで整列する）
  // 商品一覧（SCR-003）と同じ「大分類→中分類」のグループ順で組み立てることで、
  // 店主が普段見ている並びのまま印刷用テキストを確認できるようにする
  build: function (menus, categories, subCategories) {
    var blocks = [];

    categories.forEach(function (cat) {
      var inCategory = menus.filter(function (m) { return m.CategoryLarge === cat.CategoryName; });
      if (inCategory.length === 0) {
        return;
      }

      var orderedSubNames = subCategories
        .filter(function (s) { return s.CategoryId === cat.CategoryId; })
        .sort(function (a, b) { return (Number(a.SortOrder) || 0) - (Number(b.SortOrder) || 0); })
        .map(function (s) { return s.SubCategoryName; });

      var groups = {};
      inCategory.forEach(function (m) {
        var key = m.CategoryMedium || 'その他';
        if (!groups[key]) { groups[key] = []; }
        groups[key].push(m);
      });

      // マスタに無いサブカテゴリー名（想定外データ）は末尾にアイウエオ順で追加し、商品が漏れないようにする
      var leftoverKeys = Object.keys(groups).filter(function (key) { return orderedSubNames.indexOf(key) === -1; })
        .sort(function (a, b) { return a.localeCompare(b, 'ja'); });
      var orderedKeys = orderedSubNames.concat(leftoverKeys).filter(function (key) { return groups[key]; });

      var lines = ['【' + cat.CategoryName + '】'];
      orderedKeys.forEach(function (subName, i) {
        if (i > 0) { lines.push(''); }
        lines.push('◆' + subName);
        groups[subName]
          .slice()
          .sort(function (a, b) { return (Number(a.SortOrder) || 0) - (Number(b.SortOrder) || 0); })
          .forEach(function (m) {
            lines.push(this.formatLine_(m));
          }, this);
      }, this);

      blocks.push(lines.join('\n'));
    }, this);

    return blocks.join('\n\n');
  },

  formatLine_: function (menu) {
    var name = (menu.PrintDisplayName || '').trim() || menu.MenuName;
    var line = name + '　' + Number(menu.Price || 0) + '円';
    var description = (menu.PrintDescription || '').trim();
    if (description) {
      line += ' - ' + description;
    }
    return line;
  }
};
