import React from 'react';
import {RAILGUN} from './railgun.js';
const names=['SMALL','MEDIUM','MAX'];
export default function BeamMeter({weapon}){
 const percent=Math.round(weapon.charge*100);
 return <div className="proto-beam" aria-label="レールガン計測" title="Space長押しでチャージ、離すと発射"><div className="proto-beam-row"><b>BEAM</b><div className="proto-beam-meter" role="meter" aria-label="BEAMチャージ" aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent} data-testid="beam-meter"><i style={{width:`${percent}%`}}/><span className="proto-beam-limit" style={{left:`${weapon.limit*100}%`}}/>{RAILGUN.thresholds.slice(1).map(value=><span key={value} className="proto-beam-threshold" style={{left:`${value*100}%`}}/>)}</div></div><span hidden data-testid="shot-count">{weapon.shots}</span><span hidden data-testid="hit-count">{weapon.hits}</span>{weapon.lastShot&&<span hidden data-testid="last-shot" data-stage={weapon.lastShot.stage}>{names[weapon.lastShot.stage]} · {weapon.lastShot.cost} E（蓄積 {weapon.lastShot.paid.toFixed(1)} / 基礎 {weapon.lastShot.base.toFixed(1)}）</span>}</div>;
}
