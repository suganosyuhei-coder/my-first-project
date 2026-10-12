import React,{lazy,Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import logo from '../assets/shutle_logo.svg';
import FlightView from './FlightView.jsx';
import CraftView from './CraftView.jsx';
import Hud from './Hud.jsx';
import Operations from './Operations.jsx';
import useFlight from './useFlight.js';
import './style.css';
const DevTuningPanel=import.meta.env.DEV?lazy(()=>import('./DevTuningPanel.jsx')):null;
function Prototype() {
 const {game,telemetry,command,restart}=useFlight(),flight=telemetry.flight;
 return <main className="proto-page">{DevTuningPanel&&<Suspense fallback={null}><DevTuningPanel game={game}/></Suspense>}<header className="proto-header"><div className="proto-brand"><img src={logo} alt="SHuTLe 既存ロゴ"/><div><strong>SHuTLe</strong><span>宇宙を縫い、未知を織る。</span></div></div><div className="proto-edition"><span>REALTIME FLIGHT / CRAFT STUDY</span><strong>PROTOTYPE <b>009</b></strong></div><a href="./">スタートへ ↗</a></header><div className="proto-intro"><div><span className="proto-label">FLIGHT INSTRUMENT / 009</span><h1>宇宙を縫う、船をつくる。</h1></div><p><span className="proto-live-dot"/> 2基のビットで資材を回収<br/><small>共通配管でエネルギーを届ける</small></p></div><div className="proto-layout"><div className="proto-flight-column"><FlightView game={game} telemetry={telemetry} command={command}/><div style={telemetry.tuning?{zoom:telemetry.tuning.ui.hudScale,opacity:telemetry.tuning.ui.opacity,padding:telemetry.tuning.ui.padding,transform:`translate(${telemetry.tuning.ui.offsetX}px, ${telemetry.tuning.ui.offsetY}px)`}:undefined}><Hud telemetry={telemetry}/></div></div><CraftView parts={telemetry.ship.parts} ship={telemetry.ship} energy={telemetry.energy} command={command} stats={telemetry.stats} ended={telemetry.status==='ended'}/></div><Operations telemetry={telemetry}/><footer className="proto-footer"><span><b>LIVE TELEMETRY</b> T+<strong data-testid="proto-time">{flight.elapsed.toFixed(1)}</strong>s · HDG <strong data-testid="proto-heading">{((flight.heading*180/Math.PI)%360+360)%360|0}</strong>°</span><span>最大距離＝出発点からの直線距離の最大値</span><span>速度・質量・容量・環境影響は試作調整値</span></footer>{telemetry.status==='ended'&&<div className="proto-result" role="dialog" aria-label="航行結果"><span className="proto-label">FLIGHT COMPLETE</span><h2>航行不能</h2><p>破壊部位：{telemetry.end.critical.map(c=>c==='canopy'?'キャノピー':'中核部').join('・')}</p><p>原因：{telemetry.end.reason==='impact'?'岩との衝突':telemetry.end.reason==='enemyAttack'?'敵の攻撃':'環境接触'}<br/>地点：{telemetry.end.position.x.toFixed(1)} / {telemetry.end.position.y.toFixed(1)} m</p><strong>{telemetry.end.maxDistance.toFixed(1)} m</strong><p>未完了の回収は終了しました。<br/>再挑戦では機体・所持品を初期化します。</p><button onClick={restart}>新しいシャトルで再挑戦</button></div>}</main>;
}
createRoot(document.getElementById('root')).render(<Prototype/>);
