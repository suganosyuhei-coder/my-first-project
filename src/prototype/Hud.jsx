import React from 'react';
function Metric({label,value,unit,ratio,testId}) {
 return <div className="proto-metric"><div className="proto-metric-label"><span className="proto-label">{label}</span></div><div className="proto-metric-value"><strong data-testid={testId}>{value}</strong><small>{unit}</small></div>{ratio!==undefined&&<div className="proto-gauge" aria-hidden="true"><i style={{width:`${Math.min(1,Math.max(0,ratio))*100}%`}}/></div>}</div>;
}
export default function Hud({telemetry}) {
 const {flight,ship,stats,observation}=telemetry,speed=Math.hypot(flight.velocity.x,flight.velocity.y);
 return <section className="proto-hud" aria-label="航行計測パネル"><Metric label="MAX DISTANCE" value={flight.maxDistance.toFixed(1)} unit="m" testId="proto-distance"/><Metric label="VELOCITY" value={speed.toFixed(1)} unit="m/s" ratio={speed/36} testId="proto-speed"/><Metric label="CANOPY" value={ship.critical.canopy.toFixed(0)} unit="%" ratio={ship.critical.canopy/100}/><Metric label="CORE" value={ship.critical.core.toFixed(0)} unit="%" ratio={ship.critical.core/100}/><Metric label="OBSERVATION" value={observation.toFixed(0)} unit="m" testId="proto-observation-range"/><Metric label="MASS" value={stats.mass} unit="kg" testId="proto-mass"/><Metric label="THRUST" value={stats.thrust.toFixed(1)} unit="kN" testId="proto-thrust"/></section>;
}
