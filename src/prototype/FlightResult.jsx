import TrueEnding from './TrueEnding.jsx';
import {VITAL_MAX} from './vital.js';
import AngelDamageReport from './AngelDamageReport.jsx';
import React,{useRef,useLayoutEffect} from 'react';
import {OVERLOAD_RATIO} from './shipDamage.js';
import AngelReport from './AngelReport.jsx';
import AngelRecords from './AngelRecords.jsx';
export default function FlightResult({telemetry,restart,angelRecords,angelRecordError}){
 const panel=useRef(null);
 useLayoutEffect(()=>{
  if(telemetry.status==='running'||!panel.current)return;
  const element=panel.current,fit=()=>{const scale=Math.min(.5,(window.innerHeight-24)/Math.max(1,element.offsetHeight),(window.innerWidth-24)/Math.max(1,element.offsetWidth));element.style.setProperty('--result-scale',String(Math.max(.05,scale)));};
  fit();const observer=new ResizeObserver(fit);observer.observe(element);window.addEventListener('resize',fit);
  return()=>{observer.disconnect();window.removeEventListener('resize',fit);};
 },[telemetry.status,telemetry.score,telemetry.end?.reason,angelRecords,angelRecordError]);
 if(telemetry.end?.reason==='trueBoss')return <TrueEnding telemetry={telemetry} restart={restart}/>;
 if(telemetry.status==='running')return null;
 const overload=telemetry.end?.reason==='overload',vitalEnd=telemetry.end?.reason==='vital';
 const clear=telemetry.status==='cleared',end=telemetry.end;
 const cause=overload?`船体損傷セル率${Math.round(OVERLOAD_RATIO*100)}％以上・オーバーロードによる自爆`:end.reason==='structural'?'重要部分の破壊':vitalEnd?'パイロットのバイタル切れ':end.reason==='impact'?'岩との衝突':end.reason==='enemyAttack'?'敵の攻撃':'環境接触';
 return <>{vitalEnd&&<div className="proto-vital-blackout" data-testid="vital-blackout" aria-hidden="true"/>}<div ref={panel} className={'proto-result'+(overload?' is-overload':'')+(vitalEnd?' is-vital-end':'')} role="dialog" aria-label={clear?'作戦クリア':'航行結果'}>
  <header className="proto-result-heading">{telemetry.developmentScenario&&<p className="proto-test-flight">テスト表示 · 航行履歴への加算なし</p>}<span className="proto-label">{clear?'MISSION CLEAR':'FLIGHT COMPLETE'}</span><h2>{clear?'航行可能':overload?'オーバーロード・自爆':'航行不能'}</h2>
  {clear?<p>原因：さらなる敵の反応を確認</p>:<p className="proto-result-cause">原因：{cause}</p>}
  <p className="proto-result-distance">最大直線距離：<strong data-testid="result-distance">{end.maxDistance.toFixed(1)} m</strong> <small>（地点：{end.position.x.toFixed(1)} / {end.position.y.toFixed(1)} m）</small></p></header>
  <div className="proto-result-score"><strong data-testid="result-score">score: {(telemetry.score??0).toLocaleString()}</strong><span aria-hidden="true">/</span><span data-testid="result-kills">撃破数：{telemetry.campaign?.defeated??telemetry.enemies?.kills??0}</span></div>
  {clear&&<p data-testid="result-time-bonus">クリアタイム：{Math.floor((end.clearSeconds??0)/60)}分 {((end.clearSeconds??0)%60).toFixed(1)}秒<br/>タイムボーナス：＋{(end.timeBonus??0).toLocaleString()}点</p>}
  <AngelReport telemetry={telemetry} records={angelRecords}/>{!clear&&<AngelDamageReport report={telemetry.damageReport} reason={end.reason}/>}<AngelRecords records={angelRecords} error={angelRecordError}/><p className="proto-result-note">{clear?<>装備・所持品を維持して、この地点から航行を再開します。<br/>VITAL ＋15（最大{VITAL_MAX}）／次の目的地：?????? ×{telemetry.campaign?.objectives.length??8}</>:<>未完了の回収は終了しました。<br/>再挑戦では機体・所持品を初期化します。</>}</p><button aria-label={clear?"装備を維持して航行再開":"新しいシャトルで再挑戦"} onClick={restart}>{clear?"航行再開":"Restart"}</button>
 </div></>;
}
