import React from 'react';
import { TRUE_BOSS } from './trueBossGeometry.js';
import { SUPPLIED_PORTRAITS } from './pilotSuppliedPortraits.js';

export default function TrueEnding({ telemetry, restart }) {
  const time = telemetry.end.endingElapsed ?? 0;
  const report = time >= 16;
  return (
    <section className={'proto-true-ending' + (report ? ' is-report' : '')}
      role="dialog" aria-modal="true" aria-label="エンディング" data-testid="true-ending"
      style={{ '--amber': Math.min(1, Math.max(0, (time - 7) / 5)) }}>
      {!report ? <>
        <div className="proto-ending-light" aria-hidden="true"/>
        {time < 4 && <svg className="proto-ending-eye" viewBox="0 0 240 240" aria-hidden="true">
          {Array.from({length:12},(_,i)=><g key={i} transform={`rotate(${i*30} 120 120)`}><path d="M103 57 A65 65 0 0 1 137 57 L130 88 L110 88Z"/></g>)}
          <circle className="proto-ending-force-orb" cx="120" cy="120" r="20"/>
        </svg>}
        <h2>{time < 4 ? '崩れ去るバイド。その光の中に、フォースも消えた。' : time < 9 ? '見つめていると、涙が自然と流れていく。' : '目の前が、琥珀色に――'}</h2>
        {time >= 4 && time < 9 && <div className="proto-ending-tears"><img src={SUPPLIED_PORTRAITS.sadMemory.src} alt="涙を浮かべるスー"/><i aria-hidden="true"/></div>}
        {time >= 9 && <div className="proto-ending-credits"><p>SHuTLe</p><p>異次元のバイド帝国</p><p>スー / ANGELpack</p><p>航行記録 終了</p></div>}
      </> : <div className="proto-recovery-report">
        <span>ANGELpack / RECOVERY REPORT</span><h2>機体回収報告</h2>
        <dl><div><dt>機体</dt><dd>回収済み</dd></div><div><dt>パイロット</dt><dd>姿を確認できず</dd></div><div><dt>消息</dt><dd>不明</dd></div><div><dt>フォース</dt><dd>反応消失</dd></div></dl>
        <p>「キタイヲカイシュウ。パイロットノシンゴウハ、カクニンデキマセン。」</p>
        <p>「キカンノケンサクハ、ケイゾクシマス。」</p>
        <small>最大直線距離 {telemetry.end.maxDistance.toFixed(1)} m / score {(telemetry.score ?? 0).toLocaleString()}</small>
        <button onClick={restart} disabled={time < TRUE_BOSS.endingSeconds}>新しい航行記録を始める</button>
      </div>}
    </section>
  );
}
