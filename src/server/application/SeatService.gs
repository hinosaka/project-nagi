// アプリケーション層：座席管理のユースケース。座席番号・定員は変動しない固定レイアウトのため、
// 使用可否の切替のみを扱う。
// google.script.runの制約により、クライアント公開分はトップレベル関数として定義する

function getSeatList() {
  return SeatRepository.findAll();
}

function toggleSeatActive(seatId) {
  var existing = SeatRepository.findAll().filter(function (s) {
    return s.SeatId === seatId;
  })[0];
  if (!existing) {
    throw new Error('対象の座席が見つかりません：' + seatId);
  }
  existing.IsActive = !existing.IsActive;
  SeatRepository.save(existing);
}
