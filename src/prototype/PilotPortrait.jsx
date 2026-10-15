import {BASIC_PORTRAITS,basicBlinkFrame} from './pilotBasicBlink.js';
import {suppliedPilotPortrait} from './pilotSuppliedPortraits.js';
import {PORTRAIT_VIEW,pilotPortraitGeometry} from './pilotPortraitGeometry.js';
import VitalMeter from './VitalMeter.jsx';
import React, { useRef, useEffect, useState, useId } from 'react';
import { createPilotController, PILOT_EXPRESSIONS, PILOT_SHEET, PILOT_TUNING } from './pilotExpressions.js';

export default function PilotPortrait({ telemetry, onPortraitChange }) {
  const controller=useRef(null);
  if(!controller.current)controller.current=createPilotController();
  const action=controller.current(telemetry);
  const [clock,setClock]=useState(0),clip=useId(),dialogue=useRef();
  const started=useRef({serial:action.serial,time:clock});
  if(started.current.serial!==action.serial)started.current={serial:action.serial,time:clock};
  useEffect(()=>{
    if(telemetry.paused)return;
    let frame,last;
    const tick=time=>{if(last!==undefined)setClock(value=>value+(time-last)/1000);last=time;frame=requestAnimationFrame(tick);};
    frame=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(frame);
  },[telemetry.paused]);
  const age=Math.max(0,clock-started.current.time),characters=Array.from(action.line??'航路を確認中……。');
  const count=Math.min(characters.length,Math.floor(age*PILOT_TUNING.charactersPerSecond));
  const reducedMotion=typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const expression=suppliedPilotPortrait(action,telemetry)??PILOT_EXPRESSIONS[action.expression]??PILOT_EXPRESSIONS.neutral;
  const basic=expression.id===BASIC_PORTRAITS[0].id;
  const blinkStarted=useRef({basic,time:clock,elapsed:telemetry.flight.elapsed});
  if(blinkStarted.current.basic!==basic||telemetry.flight.elapsed<blinkStarted.current.elapsed)blinkStarted.current={basic,time:clock,elapsed:telemetry.flight.elapsed};
  blinkStarted.current.elapsed=telemetry.flight.elapsed;
  const blinkFrame=basic?basicBlinkFrame((clock-blinkStarted.current.time)*1000,reducedMotion):0;
  const displayed=basic?BASIC_PORTRAITS[blinkFrame]:expression;
  const filename=displayed.filename??(displayed.id?`${displayed.id}.jpg`:decodeURIComponent((displayed.src??PILOT_SHEET.src).split('/').at(-1)));
  useEffect(()=>{onPortraitChange?.(filename);},[filename,onPortraitChange]);
  const crop=expression.crop;
  const geometry=pilotPortraitGeometry(crop);
  useEffect(()=>{if(dialogue.current)dialogue.current.scrollTop=dialogue.current.scrollHeight;},[count,action.serial]);
  return <div className="proto-pilot-with-dialogue"><figure className="proto-pilot" data-testid="pilot-portrait" data-warning={action.id?.startsWith('warning-')?'true':undefined} data-action={action.id} data-expression={action.expression} data-filename={filename} data-frame={blinkFrame} data-animation={basic&&!reducedMotion?'basic-blink':'off'} data-portrait={expression.id??action.expression}>
    <div className="proto-pilot-image" role="img" aria-label={`パイロット：${expression.label}`}>
      <svg width="100%" height="100%" viewBox={`0 0 ${PORTRAIT_VIEW.width} ${PORTRAIT_VIEW.height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs><clipPath id={clip}><rect {...geometry.clip}/></clipPath></defs>
        {basic?BASIC_PORTRAITS.map((pose,index)=><image key={pose.id} href={pose.src} {...geometry.image} clipPath={`url(#${clip})`} opacity={index===blinkFrame?1:0}/>):<image href={expression.src??PILOT_SHEET.src} {...geometry.image} clipPath={`url(#${clip})`}/>}
      </svg>
    </div>
  </figure><div ref={dialogue} className="proto-pilot-dialogue" data-testid="pilot-dialogue"><p role="status" aria-label={action.line}><span aria-hidden="true">{characters.slice(0,reducedMotion?characters.length:count).join('')}</span></p></div><VitalMeter vital={telemetry.vital} elapsed={telemetry.flight.elapsed}/></div>;
}
