// アプリケーション層：エントリーポイント。pageパラメータで画面を出し分ける（実装済みの画面のみ対応）
var PAGE_FILES = {
  home: 'client/home',
  menu: 'client/menu',
  seat: 'client/seat',
  customer: 'client/customer',
  sales: 'client/sales-entry'
};

function doGet(e) {
  var page = (e && e.parameter && e.parameter.page) || 'home';
  var file = PAGE_FILES[page] || PAGE_FILES.home;

  var template = HtmlService.createTemplateFromFile(file);
  // Webアプリの/exec URLはアクセス時にgoogleusercontent.comへリダイレクトされるため、
  // 画面内の遷移リンクは相対パスではなく絶対URL（baseUrl）を使う必要がある
  template.baseUrl = ScriptApp.getService().getUrl();
  template.currentPage = page;

  return template.evaluate()
    .setTitle('店長のノート')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// includeするファイル自身もスクリプトレット（<?= ?>等）を評価できるよう、
// createHtmlOutputFromFile（静的読み込み）ではなくcreateTemplateFromFileを使う。
// dataを渡すと、そのファイル内で変数として参照できる（例：include('client/shared/sidebar', {baseUrl: baseUrl})）
function include(filename, data) {
  var template = HtmlService.createTemplateFromFile(filename);
  if (data) {
    Object.keys(data).forEach(function (key) {
      template[key] = data[key];
    });
  }
  return template.evaluate().getContent();
}
