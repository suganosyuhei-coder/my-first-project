import {suppliedPilotPortrait} from './pilotSuppliedPortraits.js';
import {PORTRAIT_VIEW,pilotPortraitGeometry} from './pilotPortraitGeometry.js';
import VitalMeter from './VitalMeter.jsx';
import React, { useRef, useEffect, useState, useId } from 'react';
import { createPilotController, PILOT_EXPRESSIONS, PILOT_SHEET, PILOT_TUNING } from './pilotExpressions.js';

export default function PilotPortrait({ telemetry }) {
  const controller=useRef(null);
  if(!controller.current)controller.current=createPilotController();
  const action=controller.current(telemetry);
  const [clock,setClock]=useState(0),clip=useId(),dialogue=useRef();
  const started=useRef({serial:action.serial,time:clock});
  if(started.current.serial!==action.serial)started.current={serial:action.serial,time:clock};
  useEffect(()=>{
    if(telemetry.paused)return;
    const timer=setInterval(()=>setClock(value=>value+.05),50);
    return ()=>clearInterval(timer);
  },[telemetry.paused]);
  const age=Math.max(0,clock-started.current.time),characters=Array.from(action.line??'航路を確認中……。');
  const count=Math.min(characters.length,Math.floor(age*PILOT_TUNING.charactersPerSecond));
  const reducedMotion=typeof window!=='undefined'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const expression=suppliedPilotPortrait(action,telemetry)??PILOT_EXPRESSIONS[action.expression]??PILOT_EXPRESSIONS.neutral;
  const crop=expression.crop;
  const geometry=pilotPortraitGeometry(crop);
  useEffect(()=>{if(dialogue.current)dialogue.current.scrollTop=dialogue.current.scrollHeight;},[count,action.serial]);
  return <div className="proto-pilot-with-dialogue"><figure className="proto-pilot" data-testid="pilot-portrait" data-warning={action.id?.startsWith('warning-')?'true':undefined} data-action={action.id} data-expression={action.expression} data-frame="0" data-animation="off" data-portrait={expression.id??action.expression}>
    <div className="proto-pilot-image" role="img" aria-label={`パイロット：${expression.label}`}>
      <svg width="100%" height="100%" viewBox={`0 0 ${PORTRAIT_VIEW.width} ${PORTRAIT_VIEW.height}`} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <defs><clipPath id={clip}><rect {...geometry.clip}/></clipPath></defs>
        <image href={expression.src??PILOT_SHEET.src} {...geometry.image} clipPath={`url(#${clip})`}/>
      </svg>
    </div>
  </figure><div ref={dialogue} className="proto-pilot-dialogue" data-testid="pilot-dialogue"><p role="status" aria-label={action.line}><span aria-hidden="true">{characters.slice(0,reducedMotion?characters.length:count).join('')}</span></p></div><VitalMeter vital={telemetry.vital} elapsed={telemetry.flight.elapsed}/></div>;
}
