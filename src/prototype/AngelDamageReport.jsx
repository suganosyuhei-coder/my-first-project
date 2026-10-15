import React from 'react';

export default function AngelDamageReport({ report, reason }) {
  if (!report) return null;
  const hits = report.hits.slice(-3);
  return (
    <section className="proto-damage-report" aria-label="ANGELpack終了直前記録" data-testid="angel-damage-report">
      <h3>ANGELpack / 終了直前{report.seconds}秒の記録</h3>
      <p>損傷セル率 {Math.round(report.ratioBefore * 100)}% → {Math.round(report.ratioAfter * 100)}%
        {' ／ '}被ダメージ合計 {report.damage.toFixed(1)}</p>
      {hits.length ? <ol>{hits.map(hit => (
        <li key={hit.sequence}>
          T+{hit.at.toFixed(1)}s · {hit.source} · セル {hit.cell.x}/{hit.cell.y} · −{hit.damage.toFixed(1)}HP
        </li>
      ))}</ol> : <p>{reason === 'vital' ? '終了直前の被ダメージなし。VITAL低下により航行終了。' : '終了直前の被ダメージ記録なし。'}</p>}
      {report.hits.length > hits.length && <small>直近3件を表示（期間内{report.hits.length}件）</small>}
    </section>
  );
}
