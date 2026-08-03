// データアクセス層（GAS特有のインフラ）：排他制御の共通ヘルパー。
//
// ID採番（既存ID一覧を読んで次の番号を決める）は「読み取り→ID決定→書き込み」の間に
// 別の実行が割り込むと同じIDが生成されうる（例：スタッフ2人がほぼ同時に会計を保存し、
// 同じSalesIdが生成された結果、後勝ちの保存で先の会計データが上書き消失する）。
// この種の採番〜保存処理はLockUtil.withLock()で包み、スクリプト単位で排他化する
var LockUtil = {
  LOCK_TIMEOUT_MS_: 30 * 1000,

  withLock: function (fn) {
    var lock = LockService.getScriptLock();
    try {
      lock.waitLock(this.LOCK_TIMEOUT_MS_);
    } catch (e) {
      throw new Error('他の操作が実行中のため保存できませんでした。しばらくしてから再度お試しください');
    }
    try {
      return fn();
    } finally {
      lock.releaseLock();
    }
  }
};
