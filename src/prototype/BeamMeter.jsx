import React from 'react';
import {RAILGUN} from './railgun.js';
const names=['SMALL','MEDIUM','MAX'];
export default function BeamMeter({weapon}){
 const percent=Math.round(weapon.charge*100);
 return <div className="proto-beam" aria-label="レールガン計測"><div className="proto-beam-row"><b>BEAM</b><div className="proto-beam-meter" role="meter" aria-label="BEAMチャージ" aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent} data-testid="beam-meter"><i style={{width:`${percent}%`}}/><span className="proto-beam-limit" style={{left:`${weapon.limit*100}%`}}/>{RAILGUN.thresholds.slice(1).map(value=><span key={value} className="proto-beam-threshold" style={{left:`${value*100}%`}}/>)}</div></div><div className="proto-beam-readout"><span>{weapon.holding?'CHARGING':'READY'} / 上限 {names[weapon.limitStage]}</span><strong>{percent}%</strong></div><p>Space：保持でチャージ / 離して発射<br/>Enter：クラフトの選択セルを操作</p><div className="proto-shot-count">射撃 <b data-testid="shot-count">{weapon.shots}</b> / 命中 <b data-testid="hit-count">{weapon.hits}</b></div>{weapon.lastShot&&<div className="proto-last-shot" data-testid="last-shot" data-stage={weapon.lastShot.stage}>{names[weapon.lastShot.stage]} · {weapon.lastShot.cost} E（蓄積 {weapon.lastShot.paid.toFixed(1)} / 基礎 {weapon.lastShot.base.toFixed(1)}）</div>}</div>;
}
