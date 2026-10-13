import React from 'react';
export default function MissionPanel({telemetry}){
 const c=telemetry.campaign;if(!c)return null;
 if(c.bossCleared)return <section className="proto-mission" aria-label="合体敵の探索" data-testid="campaign-status"><div><span className="proto-label">MISSION / 次の目的地</span><p>さらなる敵の反応を確認</p></div>{c.objectives.map(e=><div key={e.id}><p>{e.name}：{e.remaining>0?`${Math.round(e.distance)} m / 残り ${e.remaining}匹`:'撃破済み'}</p></div>)}</section>;
 return <section className="proto-mission" aria-label="敵本星攻略" data-testid="campaign-status"><div><span className="proto-label">MISSION / 敵本星攻略</span><p>最終目標：本星中枢を撃破</p></div><div><p>{c.next?`最寄り：${c.next.name} / ${Math.round(c.next.distance)} m`:'周辺の防衛部隊を排除'}</p></div><div><p>前線基地3 · 本星周辺基地5 · 中ボス4</p></div>{c.boss.detected&&<div className="proto-boss-hp"><label>本星中枢 <span data-testid="boss-hp">{Math.ceil(c.boss.hp)} / {c.boss.maxHp}</span></label><progress max={c.boss.maxHp} value={c.boss.hp}/><p>{c.boss.parasiteRevealed?'露出した腹部の寄生体が弱点':'腹部に潜む反応 · 攻撃を重ねて露出させる'} · 赤い射線は攻撃予告</p></div>}</section>;
}
