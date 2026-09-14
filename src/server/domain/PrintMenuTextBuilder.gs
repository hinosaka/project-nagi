// ドメイン層：印刷メニュー用テキストの組み立て（Spreadsheetに依存しない純粋ロジック、REQ-055）
var PrintMenuTextBuilder = {
  // 生成したテキストは、店主がChatGPT等の画像生成プロンプトにそのまま貼り付ける想定。
  // 【】=大分類・◆=中分類・商品の次の行=一言説明という表記ルールをこちらで決めて出力しているだけで、
  // 貼り付け先のプロンプト側はこの記法を知らないため、AIが表記の意味を取り違えない（一言説明を
  // 商品名の一部と誤読する等）よう、テキスト冒頭に凡例を必ず付ける
  INTRO_: '以下は卓上メニューの品目リストです。【】は大分類、◆は中分類、各行は「商品名　価格円」の形式です。その次の行に一言説明が入る場合があります（例：\n生ビール　580円\nよく冷えてます\n）。商品名・価格は正確に反映し、一言説明は商品の下に小文字で簡潔に記載してください。',

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

    // 対象商品が1件も無い場合は空文字のまま返す（呼び出し元・画面側が「まだ商品がありません」の
    // 案内を出す判定に使っているため、凡例だけの空虚なテキストを返さないようにする）
    if (blocks.length === 0) {
      return '';
    }
    return this.INTRO_ + '\n\n' + blocks.join('\n\n');
  },

  formatLine_: function (menu) {
    var name = (menu.PrintDisplayName || '').trim() || menu.MenuName;
    var line = name + '　' + Number(menu.Price || 0) + '円';
    var description = (menu.PrintDescription || '').trim();
    if (description) {
      line += '\n' + description;
    }
    return line;
  }
};
