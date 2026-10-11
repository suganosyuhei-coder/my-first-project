import { useEffect, useRef, useState } from 'react';
import { createFlight, stepFlight } from './model.js';
export default function useFlight() {
  const flight=useRef(createFlight()),keys=useRef(new Set());
  const [telemetry,setTelemetry]=useState(()=>({...flight.current}));
  useEffect(()=>{
    const permitted=new Set(['KeyA','KeyD','ArrowLeft','ArrowRight']);
    const down=e=>{if(!permitted.has(e.code)||/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.target.isContentEditable)return;e.preventDefault();keys.current.add(e.code);};
    const up=e=>keys.current.delete(e.code),clear=()=>keys.current.clear();
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);
    let frame,last=performance.now(),accumulator=0,report=0;
    const tick=now=>{
      if(document.hidden){last=now;accumulator=0;clear();frame=requestAnimationFrame(tick);return;}
      // Discard long inactive gaps instead of jumping forward when returning to this tab.
      const dt=Math.min((now-last)/1000,.1);last=now;accumulator+=dt;report+=dt;
      const steer=Number(keys.current.has('KeyD')||keys.current.has('ArrowRight'))-Number(keys.current.has('KeyA')||keys.current.has('ArrowLeft'));
      while(accumulator>=1/60){stepFlight(flight.current,steer,1/60);accumulator-=1/60;}
      if(report>=.1){report=0;setTelemetry({...flight.current,position:{...flight.current.position}});}
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);};
  },[]);
  return {flight,telemetry};
}
