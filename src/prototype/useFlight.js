import {startFlight} from './flightGuide.js';
import {createAngelRecorder} from './angelRecords.js';
import {continueVoyage} from './victory.js';
import {CAMPAIGN} from './campaign.js';
import {loadRuntimeTuning} from './runtimeTuning.js';
import {createBoostInput} from './boostInput.js';
import {useEffect,useRef,useState,useCallback} from 'react';
import {createWeaponInput} from './weaponInput.js';
import {createGame,stepGame,snapshot} from './game.js';
const createPrototypeGame=(tuning=loadRuntimeTuning())=>{
 const demo=import.meta.env.DEV?new URLSearchParams(window.location.search).get('demo'):null;
 const game=createGame({...demo==='enemies'?{seed:4}:{},tuning});game.introduction=true;
 if(demo==='campaign-front'||demo==='campaign-home'||demo==='campaign-boss'){
  const target=demo==='campaign-front'?CAMPAIGN.approachBases[0]:CAMPAIGN.home;
  game.flight.position={x:target.x,y:target.y+(demo==='campaign-front'?200:demo==='campaign-boss'?200:600)};
 }
 return game;
};
export default function useFlight() {
 const recorder=useRef(null);if(!recorder.current)recorder.current=createAngelRecorder();
 const [records,setRecords]=useState(()=>recorder.current.snapshot());
 const game=useRef(null);if(!game.current){game.current=createPrototypeGame();}
 const keys=useRef(new Set()),weaponInput=useRef(null),boostInput=useRef(null);const [telemetry,setTelemetry]=useState(()=>snapshot(game.current));
 const command=useCallback(action=>{if(action.type==='flight-start'){weaponInput.current?.cancel();boostInput.current?.cancel();if(startFlight(game.current)){keys.current.clear();setTelemetry(snapshot(game.current));}return;}if(action.type==='pause-toggle'){keys.current.clear();weaponInput.current?.cancel();boostInput.current?.cancel();}game.current.commands.push(action);},[]);
 const restart=useCallback(()=>{weaponInput.current?.cancel();boostInput.current?.cancel();if(continueVoyage(game.current)){keys.current.clear();setTelemetry(snapshot(game.current));return;}const viewport=game.current.viewport,tuning=game.current.tuning;if(recorder.current.replay(game.current))setRecords(recorder.current.snapshot());game.current=createPrototypeGame(tuning);game.current.viewport=viewport;keys.current.clear();setTelemetry(snapshot(game.current));},[]);
 useEffect(()=>{
  const input=createWeaponInput({enqueue:action=>game.current.commands.push(action),isRunning:()=>game.current.status==='running'&&!game.current.paused&&!game.current.introduction,heading:()=>game.current.flight.heading,isAuto:()=>game.current.weapon.autoFire});weaponInput.current=input;
  const burst=createBoostInput({enqueue:action=>game.current.commands.push(action),isRunning:()=>game.current.status==='running'&&!game.current.paused&&!game.current.introduction,heading:()=>game.current.flight.heading});boostInput.current=burst;
  const focus=e=>{input.focus(e);burst.focus(e);};
  const flushRecords=()=>{if(recorder.current.flush())setRecords(recorder.current.snapshot());};
  const visibility=()=>{if(document.hidden){input.cancel();burst.cancel();flushRecords();}};
  const allowed=new Set(['KeyA','KeyD','ArrowLeft','ArrowRight']);
  const down=e=>{if(game.current.introduction){if(['Space','ShiftLeft','ShiftRight','KeyA','KeyD','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();return;}if(['KeyP','Escape'].includes(e.code)&&!/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)&&!e.target.isContentEditable){e.preventDefault();if(!e.repeat)command({type:'pause-toggle'});return;}if(game.current.paused)return;input.down(e);burst.down(e);if(!allowed.has(e.code)||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.target.isContentEditable)return;e.preventDefault();keys.current.add(e.code);};
  const up=e=>{input.up(e);burst.up(e);keys.current.delete(e.code);},clear=()=>{keys.current.clear();input.cancel();burst.cancel();};
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);window.addEventListener('focusin',focus);document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',flushRecords);
  let frame,last=performance.now(),accumulator=0,report=0;
  const tick=now=>{
   if(document.hidden){last=now;accumulator=0;clear();frame=requestAnimationFrame(tick);return;}
   const dt=Math.min((now-last)/1000,.1);last=now;accumulator+=dt;report+=dt;
   const steering=Number(keys.current.has('KeyD')||keys.current.has('ArrowRight'))-Number(keys.current.has('KeyA')||keys.current.has('ArrowLeft'));
   while(accumulator>=1/60){stepGame(game.current,steering,1/60);accumulator-=1/60;}
   const timedSave=recorder.current.accumulate(game.current),finished=recorder.current.record(game.current);if(timedSave||finished)setRecords(recorder.current.snapshot());
   if(report>=.1){report=0;setTelemetry(snapshot(game.current));}
   frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
  return()=>{recorder.current.flush();window.removeEventListener('pagehide',flushRecords);cancelAnimationFrame(frame);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);window.removeEventListener('focusin',focus);document.removeEventListener('visibilitychange',visibility);};
 },[]);
 return {game,telemetry,command,restart,angelRecords:records.data,angelRecordError:records.error};
}
