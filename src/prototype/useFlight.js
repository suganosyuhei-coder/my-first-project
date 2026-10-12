import {useEffect,useRef,useState,useCallback} from 'react';
import {createGame,stepGame,snapshot} from './game.js';
export default function useFlight() {
 const game=useRef(null);if(!game.current)game.current=createGame();
 const keys=useRef(new Set());const [telemetry,setTelemetry]=useState(()=>snapshot(game.current));
 const command=useCallback(action=>game.current.commands.push(action),[]);
 const restart=useCallback(()=>{const viewport=game.current.viewport;game.current=createGame();game.current.viewport=viewport;keys.current.clear();setTelemetry(snapshot(game.current));},[]);
 useEffect(()=>{
  const allowed=new Set(['KeyA','KeyD','ArrowLeft','ArrowRight']);
  const down=e=>{if(!allowed.has(e.code)||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.target.isContentEditable)return;e.preventDefault();keys.current.add(e.code);};
  const up=e=>keys.current.delete(e.code),clear=()=>keys.current.clear();
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);
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
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);};
 },[]);
 return {game,telemetry,command,restart};
}
