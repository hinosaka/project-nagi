// 静的フロントエンドのビルドスクリプト（フレームワーク不使用、Node標準ライブラリのみ）。
//
// src/client/*.html（GAS HtmlService用）をそのまま単一の情報源とし、GAS専用のスクリプトレット
// （<?!= include(...) ?> 等）だけを静的な同等物（<link>/<script src>やファイルへのハイパーリンク）
// に置き換えてweb/dist/に出力する。ページごとの構造・JSロジックは一切変更しない
// （google.script.runの呼び出し互換シムはapi-client.jsが担う。詳細はそちらのコメント参照）。
//
// 実行：node web/build.js
'use strict';

var fs = require('fs');
var path = require('path');

var ROOT = path.join(__dirname, '..');
var SRC_CLIENT = path.join(ROOT, 'src', 'client');
var WEB_SRC = path.join(__dirname, 'src');
var OUT_DIR = path.join(__dirname, 'dist');

// server/main.gsのPAGE_FILESと同じ対応関係（id → 出力ファイル名）
var PAGE_FILES = {
  dashboard: 'dashboard',
  sales: 'sales-entry',
  menu: 'menu',
  'sales-stats': 'sales-stats',
  'analysis-product': 'analysis-product',
  'data-analysis': 'data-analysis',
  customer: 'customer',
  seat: 'seat'
};

function readClient(relPath) {
  return fs.readFileSync(path.join(SRC_CLIENT, relPath), 'utf8');
}

function stripWrapperTag(html, tagName) {
  var openRe = new RegExp('^\\s*<' + tagName + '(\\s[^>]*)?>\\n?');
  var closeRe = new RegExp('\\n?</' + tagName + '>\\s*$');
  return html.replace(openRe, '').replace(closeRe, '');
}

function pageHref(pageId) {
  var file = PAGE_FILES[pageId] || pageId;
  return file + '.html';
}

function buildSidebarHtml() {
  var raw = readClient('shared/sidebar.html');
  return raw.replace(/<\?= baseUrl \?>\?page=([a-z-]+)/g, function (_, pageId) {
    return pageHref(pageId);
  });
}

function buildStyleCss() {
  return stripWrapperTag(readClient('shared/stylesheet.html'), 'style');
}

function buildAppJs() {
  return stripWrapperTag(readClient('shared/javascript.html'), 'script');
}

function buildIconsSvg() {
  return readClient('shared/icons.html');
}

function buildPage(pageId, sidebarHtml) {
  var srcFile = PAGE_FILES[pageId] + '.html';
  var html = readClient(srcFile);

  // ヘッド先頭：認証チェック（未ログインならlogin.htmlへ即リダイレクト）を最優先で読み込む
  html = html.replace(
    '<base target="_top">',
    '<base target="_top">\n    <script src="config.js"></script>\n' +
    '    <script src="api-client.js"></script>\n' +
    '    <script>PosApi.requireAuth();</script>'
  );

  html = html.replace(
    "<?!= include('client/shared/stylesheet') ?>",
    '<link rel="stylesheet" href="style.css">'
  );
  html = html.replace('<?= currentPage ?>', pageId);
  html = html.replace("<?!= include('client/shared/icons') ?>", buildIconsSvg());
  html = html.replace(
    /<\?!= include\('client\/shared\/sidebar',\s*\{baseUrl: baseUrl\}\) \?>/,
    sidebarHtml
  );
  html = html.replace(
    "<?!= include('client/shared/javascript') ?>",
    '<script src="app.js"></script>'
  );
  // ページ内に残る個別リンク（例：ダッシュボードの詳細分析リンク）
  html = html.replace(/<\?= baseUrl \?>\?page=([a-z-]+)/g, function (_, targetPageId) {
    return pageHref(targetPageId);
  });

  var remaining = html.match(/<\?[=!]/);
  if (remaining) {
    throw new Error(srcFile + ' に未変換のGASスクリプトレットが残っています： ' + html.slice(remaining.index, remaining.index + 60));
  }

  return html;
}

function copyStatic(name) {
  fs.copyFileSync(path.join(WEB_SRC, name), path.join(OUT_DIR, name));
}

function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  fs.writeFileSync(path.join(OUT_DIR, 'style.css'), buildStyleCss());
  fs.writeFileSync(path.join(OUT_DIR, 'app.js'), buildAppJs());

  copyStatic('config.js');
  copyStatic('api-client.js');
  copyStatic('login.html');

  var sidebarHtml = buildSidebarHtml();
  Object.keys(PAGE_FILES).forEach(function (pageId) {
    var html = buildPage(pageId, sidebarHtml);
    fs.writeFileSync(path.join(OUT_DIR, pageHref(pageId)), html);
  });

  // トップURL（GitHub Pagesのルート）はダッシュボードへ
  fs.copyFileSync(path.join(OUT_DIR, 'dashboard.html'), path.join(OUT_DIR, 'index.html'));

  console.log('ビルド完了: ' + OUT_DIR);
}

main();
