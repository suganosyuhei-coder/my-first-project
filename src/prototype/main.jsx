import FlightInstructions from './FlightInstructions.jsx';
import FlightResult from './FlightResult.jsx';
import React,{lazy,Suspense,useState} from 'react';
import {createRoot} from 'react-dom/client';
import logo from '../assets/shutle_logo_v3.svg';
import FlightView from './FlightView.jsx';
import CraftView from './CraftView.jsx';
import Hud from './Hud.jsx';
import Operations from './Operations.jsx';
import useFlight from './useFlight.js';
import './style.css';
const DevTuningPanel=import.meta.env.DEV?lazy(()=>import('./DevTuningPanel.jsx')):null;
function Prototype() {
 const [pilotFilename,setPilotFilename]=useState('');
 const {game,telemetry,command,restart,selectScenario,angelRecords,angelRecordError}=useFlight(),flight=telemetry.flight;
 return <main className="proto-page"><FlightInstructions visible={telemetry.introduction} onStart={()=>command({type:'flight-start'})}/>{DevTuningPanel&&<Suspense fallback={null}><DevTuningPanel game={game} telemetry={telemetry} onScenario={selectScenario}/></Suspense>}<header className="proto-header"><div className="proto-brand"><img src={logo} alt="SHuTLe ロゴ"/></div><div className="proto-edition"><span>REALTIME FLIGHT / CRAFT STUDY</span><strong>PROTOTYPE <b>009</b></strong></div><a href="./">スタートへ ↗</a></header><div className="proto-layout"><div className="proto-flight-column"><FlightView pilotFilename={pilotFilename} game={game} telemetry={telemetry} command={command}/><div style={telemetry.tuning?{zoom:telemetry.tuning.ui.hudScale,opacity:telemetry.tuning.ui.opacity,padding:telemetry.tuning.ui.padding,transform:`translate(${telemetry.tuning.ui.offsetX}px, ${telemetry.tuning.ui.offsetY}px)`}:undefined}><Hud telemetry={telemetry}/></div></div><CraftView onPortraitChange={setPilotFilename} telemetry={telemetry} parts={telemetry.ship.parts} ship={telemetry.ship} energy={telemetry.energy} command={command} stats={telemetry.stats} ended={telemetry.status!=='running'||telemetry.paused}/></div><Operations telemetry={telemetry}/><footer className="proto-footer"><span><b>LIVE TELEMETRY</b> T+<strong data-testid="proto-time">{flight.elapsed.toFixed(1)}</strong>s · HDG <strong data-testid="proto-heading">{((flight.heading*180/Math.PI)%360+360)%360|0}</strong>°</span><span>最大距離＝出発点からの直線距離の最大値</span><span>速度・質量・容量・環境影響は試作調整値</span></footer><FlightResult telemetry={telemetry} restart={restart} angelRecords={angelRecords} angelRecordError={angelRecordError}/></main>;
}
createRoot(document.getElementById('root')).render(<Prototype/>);
