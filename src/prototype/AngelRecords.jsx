import React from 'react';
import {angelResultSummary} from './angelRecords.js';
const reasons={finalBoss:'作戦クリア',overload:'オーバーロード',structural:'重要部分の破壊',vital:'VITAL切れ',impact:'岩との衝突',enemyAttack:'敵の攻撃',contact:'接触',heatContact:'熱領域'};
const duration=seconds=>`${Math.floor(seconds/60)}分 ${(seconds%60).toFixed(1)}秒`;
export default function AngelRecords({records,error}){
 if(!records)return null;
 const {current,previous,bestDistance,totalFlights}=angelResultSummary(records);
 return <section className="proto-angel-records" aria-label="エンジェルパック航行記録" data-testid="angel-records">
  {error&&<p role="status" className="proto-angel-error">{error}</p>}
  <p className="proto-angel-summary"><span>last time : <b data-testid="angel-previous">{previous?`${previous.maxDistance.toFixed(1)} m`:'記録なし'}</b> / max distance : <b data-testid="angel-best">{bestDistance.toFixed(1)} m</b></span><br/>number of space : {totalFlights}回<br/><span data-testid="angel-current-time">this time : {current?`${Math.floor(current.elapsed/60)}min${(current.elapsed%60).toFixed(1)}s`:'記録なし'}</span></p>
  <p data-testid="angel-totals">累計プレイ時間：{Math.floor((records.totalSeconds??0)/3600)}時間 {Math.floor(((records.totalSeconds??0)%3600)/60)}分<br/>再プレイ回数：{records.replayCount??0}回</p>{records.timeIncomplete&&<p className="proto-angel-note">旧版で保存されていない航行時間は集計に含まれません。</p>}<details><summary>直近の航行履歴（最大20件）</summary><ol>{records.entries.map(e=><li key={e.id}>
   <strong>第{e.id}回 · {e.maxDistance.toFixed(1)} m</strong><span>{new Date(e.endedAt).toLocaleString('ja-JP')} / {duration(e.elapsed)}</span><span>{reasons[e.reason]??'環境接触'} · score: {e.score.toLocaleString()} · 撃破数：{e.kills}</span><span>終了地点：{e.position.x.toFixed(1)} / {e.position.y.toFixed(1)} m</span>
  </li>)}</ol></details>
 </section>;
}
