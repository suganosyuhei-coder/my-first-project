import {loadDevTuning} from './devTuning.js';
import {createBoostInput} from './boostInput.js';
import {useEffect,useRef,useState,useCallback} from 'react';
import {createWeaponInput} from './weaponInput.js';
import {createGame,stepGame,snapshot} from './game.js';
export default function useFlight() {
 const game=useRef(null);if(!game.current){game.current=createGame();game.current.tuning=loadDevTuning();}
 const keys=useRef(new Set()),weaponInput=useRef(null),boostInput=useRef(null);const [telemetry,setTelemetry]=useState(()=>snapshot(game.current));
 const command=useCallback(action=>game.current.commands.push(action),[]);
 const restart=useCallback(()=>{weaponInput.current?.cancel();boostInput.current?.cancel();const viewport=game.current.viewport,tuning=game.current.tuning;game.current=createGame();game.current.viewport=viewport;game.current.tuning=tuning;keys.current.clear();setTelemetry(snapshot(game.current));},[]);
 useEffect(()=>{
  const input=createWeaponInput({enqueue:action=>game.current.commands.push(action),isRunning:()=>game.current.status==='running',heading:()=>game.current.flight.heading});weaponInput.current=input;
  const burst=createBoostInput({enqueue:action=>game.current.commands.push(action),isRunning:()=>game.current.status==='running',heading:()=>game.current.flight.heading});boostInput.current=burst;
  const focus=e=>{input.focus(e);burst.focus(e);};
  const visibility=()=>{if(document.hidden){input.cancel();burst.cancel();}};
  const allowed=new Set(['KeyA','KeyD','ArrowLeft','ArrowRight']);
  const down=e=>{input.down(e);burst.down(e);if(!allowed.has(e.code)||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.target.isContentEditable)return;e.preventDefault();keys.current.add(e.code);};
  const up=e=>{input.up(e);burst.up(e);keys.current.delete(e.code);},clear=()=>{keys.current.clear();input.cancel();burst.cancel();};
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);window.addEventListener('focusin',focus);document.addEventListener('visibilitychange',visibility);
  let frame,last=performance.now(),accumulator=0,report=0;
  const tick=now=>{
   if(document.hidden){last=now;accumulator=0;clear();frame=requestAnimationFrame(tick);return;}
   const dt=Math.min((now-last)/1000,.1);last=now;accumulator+=dt;report+=dt;
   const steering=Number(keys.current.has('KeyD')||keys.current.has('ArrowRight'))-Number(keys.current.has('KeyA')||keys.current.has('ArrowLeft'));
   while(accumulator>=1/60){stepGame(game.current,steering,1/60);accumulator-=1/60;}
   if(report>=.1){report=0;setTelemetry(snapshot(game.current));}
   frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);window.removeEventListener('focusin',focus);document.removeEventListener('visibilitychange',visibility);};
 },[]);
 return {game,telemetry,command,restart};
}
