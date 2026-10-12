import {createNebulaRenderer} from './NebulaRenderer.js';
import NebulaPanel from './NebulaPanel.jsx';
import React,{useEffect,useRef,useState} from 'react';
import BeamMeter from './BeamMeter.jsx';
import FlightShip from './FlightShip.jsx';
import { drawFlight } from './render.js';
import {screenToWorld} from './model.js';
import {RESOURCE_TYPES,inViewport} from './collection.js';
export default function FlightView({game,telemetry,command}) {
 const canvas=useRef(),ship=useRef();const [observation,setObservation]=useState(true),[quality,setQuality]=useState(()=>window.innerWidth<760?'low':'high'),[reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches),[renderer,setRenderer]=useState('fallback');
 useEffect(()=>{
  const element=canvas.current,ctx=element.getContext('2d'),nebula=createNebulaRenderer();setRenderer(nebula.mode);let reportedMode=nebula.mode;let frame,width=0,height=0;
  const resize=new ResizeObserver(entries=>{const box=entries[0].contentRect,ratio=Math.min(window.devicePixelRatio||1,2);width=box.width;height=box.height;element.width=Math.round(width*ratio);element.height=Math.round(height*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);game.current.viewport={width,height,scale:1.55};});resize.observe(element);
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const draw=()=>{const reducedMotion=reduced||media.matches,nebulaImage=nebula.draw(width,height,game.current,{quality,reducedMotion});element.dataset.nebulaRenderer=nebula.mode;if(reportedMode!==nebula.mode){reportedMode=nebula.mode;setRenderer(nebula.mode);}drawFlight(ctx,width,height,game.current.flight,{observation,reducedMotion,game:game.current,nebulaImage});ship.current.style.transform=`translate(-50%, -50%) rotate(${game.current.flight.heading}rad)`;frame=requestAnimationFrame(draw);};
  frame=requestAnimationFrame(draw);return()=>{cancelAnimationFrame(frame);resize.disconnect();nebula.dispose();};
 },[game,observation,quality,reduced]);
 const click=e=>{const rect=canvas.current.getBoundingClientRect(),point=screenToWorld({x:e.clientX-rect.left,y:e.clientY-rect.top},game.current.flight.position,rect.width,rect.height,1.55);const resource=game.current.resources.find(r=>r.state==='available'&&r.discovered&&Math.hypot(r.position.x-point.x,r.position.y-point.y)<13);if(resource)command({type:'collect',id:resource.id});};
 const selectable=telemetry.resources.filter(r=>r.state==='available'&&r.discovered&&inViewport(r.position,game.current)&&Math.hypot(r.position.x-telemetry.flight.position.x,r.position.y-telemetry.flight.position.y)<=telemetry.observation).slice(0,4);
 return <><section className="proto-flight" aria-label="2D航行ビュー"><canvas ref={canvas} onClick={click} aria-label="資材をクリックしてビットを派遣する宇宙空間"/><svg ref={ship} className="proto-flight-ship" viewBox="-64 -55 128 110" role="img" aria-label="航行中の翼型シャトル"><FlightShip ship={telemetry.ship} charge={telemetry.weapon.charge}/></svg><div className="proto-flight-heading"><span className="proto-label">01 / FLIGHT FIELD</span><span>航行・回収</span></div><div className="proto-flight-key"><span className="proto-live-dot"/> AUTO FLIGHT <span className="proto-key-box">A</span><span className="proto-key-box">D</span><span> / ← → 操舵</span></div><div className="proto-flight-controls"><button className="proto-observation" aria-pressed={observation} onClick={()=>setObservation(v=>!v)}>{observation?'◉ 観測円を隠す':'○ 観測円を表示'}</button><BeamMeter weapon={telemetry.weapon}/></div><div className="proto-resource-actions">{selectable.map(r=><button key={r.id} disabled={telemetry.status!=='running'} data-resource={r.id} onClick={()=>command({type:'collect',id:r.id})}>{RESOURCE_TYPES[r.type].name}を回収（{RESOURCE_TYPES[r.type].bits}基）</button>)}</div><div className="proto-flight-caption"><span>–– 航跡 / ビット</span><span className="proto-caution">○ 惑星の重力：表示デモ</span><span>単位：m</span></div></section><NebulaPanel telemetry={telemetry} command={command} quality={quality} setQuality={setQuality} reduced={reduced} setReduced={setReduced} renderer={renderer}/></>;
}
