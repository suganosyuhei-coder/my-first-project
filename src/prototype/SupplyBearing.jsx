import React from 'react';

export default function SupplyBearing({ guidance }) {
  if (!guidance) return null;
  const target = guidance.target;
  return (
    <div className="proto-supply-bearing" aria-label="低VITAL補給案内" data-testid="supply-bearing">
      <strong>ANGELpack / 補給案内</strong>
      {target ? (
        <span>
          <i aria-hidden="true" style={{ transform: `rotate(${target.bearing}rad)` }}>↑</i>
          {target.label} · 約{Math.round(target.distance)} m
          {target.kind === 'paw' && <small>最終検知位置</small>}
        </span>
      ) : <span>補給先は未検知 · 氷／緑PAWを探してください</span>}
    </div>
  );
}
