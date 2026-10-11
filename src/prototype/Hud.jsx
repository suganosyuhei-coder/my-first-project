import React from 'react';
import { DEMO } from './model.js';
function Metric({label,value,unit,demo=false,ratio,testId}) {
  return <div className="proto-metric"><div className="proto-metric-label"><span className="proto-label">{label}</span>{demo&&<span className="proto-demo">DEMO</span>}</div><div className="proto-metric-value"><strong data-testid={testId}>{value}</strong><small>{unit}</small></div>{ratio!==undefined&&<div className="proto-gauge" aria-hidden="true"><i style={{width:`${Math.min(1,Math.max(0,ratio))*100}%`}}/></div>}</div>;
}
export default function Hud({telemetry,stats}) {
  return <section className="proto-hud" aria-label="航行計測パネル"><Metric label="MAX DISTANCE" value={telemetry.maxDistance.toFixed(1)} unit="m" testId="proto-distance"/><Metric label="VELOCITY" value={Math.hypot(telemetry.velocity.x,telemetry.velocity.y).toFixed(1)} unit="m/s" ratio={Math.hypot(telemetry.velocity.x,telemetry.velocity.y)/40}/><Metric label="CANOPY" value={DEMO.canopy} unit="%" demo ratio={1}/><Metric label="CORE" value={DEMO.core} unit="%" demo ratio={1}/><Metric label="OBSERVATION" value={DEMO.observation} unit="m" demo/><Metric label="MASS" value={stats.mass} unit="kg" testId="proto-mass"/><Metric label="THRUST" value={stats.thrust} unit="kN" demo testId="proto-thrust"/></section>;
}
