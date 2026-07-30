// アプリケーション層：エントリーポイント（疎通確認用の暫定実装。画面が揃い次第home.htmlの描画に置き換える）
function doGet(e) {
  return ContentService.createTextOutput('pos-app: OK');
}
