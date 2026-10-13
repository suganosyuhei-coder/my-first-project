import {shipDamageCells} from './shipDamage.js';
import React from 'react';
import {gridDamageMarkers} from './gridDamage.js';
export default function GridDamage({ship,repairs=[],elapsed=0}){
 return <g className="proto-grid-damage" pointerEvents="none">{shipDamageCells(ship).filter(c=>c.hp<100).map(c=><rect key={`red-${c.x},${c.y}`} data-testid="damaged-grid-cell" x={c.x*20+1} y={c.y*20+1} width="18" height="18" fill="#ff423c33"/>)}{gridDamageMarkers(ship).map(marker=><g key={`${marker.x},${marker.y}`} transform={`translate(${marker.x*20} ${marker.y*20})`} data-testid="grid-damage-marker" data-severity={marker.severity} data-x={marker.x} data-y={marker.y} role="img" aria-label={`X${marker.x} Y${marker.y} ${marker.severity==='destroyed'?'破壊':'損傷'} 耐久${marker.hp}%`}>
  <title>{`X${marker.x} Y${marker.y} / 耐久 ${marker.hp}%`}</title>
  <rect x="1" y="1" width="18" height="18" fill={marker.severity==='damaged'?'#ff423c12':'#ff423c55'} stroke="#ff615b" strokeOpacity={marker.severity==='damaged'?.45:1} strokeWidth="1.5"/>
  <text x="10" y="15" textAnchor="middle" fontSize="17" fontWeight="bold" fill="#ff625b" stroke="#190808" strokeWidth=".8" paintOrder="stroke">{marker.symbol}</text>
  <text x="21" y="6" fontSize="10" fontWeight="bold" fill="#ff7a70" stroke="#14090b" strokeWidth="2.5" paintOrder="stroke">損{100-marker.hp}%</text>
 </g>)}{repairs.map((effect,i)=>{const age=elapsed-effect.at;if(age<0||age>=2.2)return null;return <g key={`repair-${i}`} data-testid="grid-repair-effect" data-x={effect.x} data-y={effect.y} transform={`translate(${effect.x*20} ${effect.y*20})`} opacity={Math.min(1,(2.2-age)/.8)} aria-label={`X${effect.x} Y${effect.y} 耐久${effect.amount}%回復`}>
  <rect x="0" y="0" width="20" height="20" fill="#48ff8e66" stroke="#72ffad" strokeWidth="2"/>
  <path d="M10 4v12M4 10h12" stroke="#b3ffd0" strokeWidth="2"/>
  <text x="21" y="16" fontSize="11" fontWeight="bold" fill="#83ffb1" stroke="#071e10" strokeWidth="2" paintOrder="stroke">+{Number(effect.amount.toFixed(1))}%</text>
 </g>;})}</g>;
}
