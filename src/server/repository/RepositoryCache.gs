// データアクセス層共通：findAll()結果の短時間キャッシュ（CacheService）。
//
// ダッシュボード・各種分析画面は同じ営業日中に何度も開かれる想定だが、開かれるたびに
// Sales/SalesDetailの全件をSpreadsheetから読み直している。このヘルパーで短時間（既定60秒）
// だけ結果をキャッシュし、同じデータへの短時間の再アクセスをSpreadsheet読み込みなしで済ませる。
// 該当データを書き換えるリポジトリのsave系メソッドは、保存後に必ずinvalidate()で
// このキャッシュを破棄し、古いデータが返り続けないようにすること
//
// CacheServiceは1件あたり100KBの上限があるため、将来データ量が増えて上限を超えた場合は
// put()が例外を投げるが、ここで握りつぶしてキャッシュを諦めるだけにする（キャッシュはあくまで
// 読み込み回数を減らすための最適化であり、失敗しても機能自体は通常通りSpreadsheetから読み込んで動く）
var RepositoryCache = {
  TTL_SECONDS_: 60,

  get: function (key) {
    try {
      var json = CacheService.getScriptCache().get(key);
      return json ? JSON.parse(json) : null;
    } catch (e) {
      return null;
    }
  },

  // ttlSecondsを省略した場合は既定の60秒。祝日等、変化しないデータは長いTTL（最大21600秒＝6時間、
  // CacheServiceの上限）を明示的に指定できる
  put: function (key, rows, ttlSeconds) {
    try {
      CacheService.getScriptCache().put(key, JSON.stringify(rows), ttlSeconds || this.TTL_SECONDS_);
    } catch (e) {
      // 100KB上限超過などはキャッシュを諦めるだけで、呼び出し元には影響させない
    }
  },

  invalidate: function (key) {
    CacheService.getScriptCache().remove(key);
  }
};
