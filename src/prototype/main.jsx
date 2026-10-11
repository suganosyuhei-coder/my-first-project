import React,{useMemo,useState} from 'react';
import {createRoot} from 'react-dom/client';
import logo from '../assets/shutle_logo.svg';
import FlightView from './FlightView.jsx';
import CraftView from './CraftView.jsx';
import Hud from './Hud.jsx';
import useFlight from './useFlight.js';
import {initialParts,shipStats} from './model.js';
import './style.css';
function Prototype() {
  const {flight,telemetry}=useFlight();const [parts,setParts]=useState(initialParts);const stats=useMemo(()=>shipStats(parts),[parts]);
  return <main className="proto-page"><header className="proto-header"><div className="proto-brand"><img src={logo} alt="SHuTLe 既存ロゴ"/><div><strong>SHuTLe</strong><span>宇宙を縫い、未知を織る。</span></div></div><div className="proto-edition"><span>REALTIME FLIGHT / CRAFT STUDY</span><strong>PROTOTYPE <b>006</b></strong></div><a href="./">スタートへ ↗</a></header><div className="proto-intro"><div><span className="proto-label">FLIGHT INSTRUMENT / 006</span><h1>宇宙を縫う、船をつくる。</h1></div><p><span className="proto-live-dot"/> 航行中もクラフトできます<br/><small>2Dゲーム画面・操作プロトタイプ</small></p></div><div className="proto-layout"><div className="proto-flight-column"><FlightView flight={flight} parts={parts}/><Hud telemetry={telemetry} stats={stats}/></div><CraftView parts={parts} setParts={setParts} stats={stats}/></div><footer className="proto-footer"><span><b>LIVE TELEMETRY</b> T+<strong data-testid="proto-time">{telemetry.elapsed.toFixed(1)}</strong>s · HDG <strong data-testid="proto-heading">{((telemetry.heading*180/Math.PI)%360+360)%360|0}</strong>°</span><span>最大距離＝出発点からの直線距離の最大値</span><span>DEMO：耐久・観測・推力 ／ 質量は仮パーツ値から算出</span></footer></main>;
}
createRoot(document.getElementById('root')).render(<Prototype/>);
