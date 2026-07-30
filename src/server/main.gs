// アプリケーション層：エントリーポイント。pageパラメータで画面を出し分ける（実装済みの画面のみ対応）
var PAGE_FILES = {
  home: 'client/home',
  menu: 'client/menu',
  seat: 'client/seat'
};

function doGet(e) {
  var page = (e && e.parameter && e.parameter.page) || 'home';
  var file = PAGE_FILES[page] || PAGE_FILES.home;

  return HtmlService.createTemplateFromFile(file)
    .evaluate()
    .setTitle('店長のノート')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
