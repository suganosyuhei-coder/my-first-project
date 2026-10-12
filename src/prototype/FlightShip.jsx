import React,{useId} from 'react';
import {occupiedCells} from './model.js';
// Original 2D silhouette inspired by swept wings, long cockpit and twin nacelles.
export default function FlightShip({ship,charge=0}){
 const prefix=useId().replaceAll(':',''),metal=`${prefix}-metal`,canopy=`${prefix}-glass`;
 const body='M0 -47 L7 -40 L10 -15 L18 -4 L58 26 L59 31 L31 31 L19 27 L12 35 L4 38 L0 45 L-4 38 L-12 35 L-19 27 L-31 31 L-59 31 L-58 26 L-18 -4 L-10 -15 L-7 -40 Z';
 return <g data-renderer="flight-shuttle">
  <defs><linearGradient id={metal} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#77858b"/><stop offset=".28" stopColor="#d7dedb"/><stop offset=".49" stopColor="#fffdf0"/><stop offset=".66" stopColor="#c4ccca"/><stop offset="1" stopColor="#65777e"/></linearGradient><linearGradient id={canopy} x1="0" y1="0" x2="1" y2="0"><stop stopColor="#183d50"/><stop offset=".45" stopColor="#bdedf0"/><stop offset=".6" stopColor="#7bc1ce"/><stop offset="1" stopColor="#274958"/></linearGradient></defs>
  <path d={body} transform="translate(0 2)" fill="#0a121b" opacity=".85"/>
  <path d={body} fill={`url(#${metal})`} stroke="#e4ece6" strokeWidth=".8" strokeLinejoin="round"/>
  <path d="M-12 -6 L-54 26 L-31 26 L-16 9 Z M12 -6 L54 26 L31 26 L16 9 Z" fill="#e3e6db" stroke="#687a82" strokeWidth=".6"/>
  <path d="M-17 7 L-41 26 M17 7 L41 26 M-25 14 L-26 27 M25 14 L26 27" stroke="#7c8c90" strokeWidth=".7"/>
  {[-1,1].map(side=><g key={side} transform={`translate(${side*17} 0)`}>
   <path d="M-7 5 L-8 31 Q-8 37 0 38 Q8 37 8 31 L7 5 Z" fill={`url(#${metal})`} stroke="#6d7d85" strokeWidth=".8"/>
   <ellipse cy="11" rx="6" ry="7" fill="#bcc6c6" stroke="#eef4e8" strokeWidth="1.5"/><ellipse cy="11" rx="3.5" ry="4.5" fill="#4b6573" stroke="#829eaa" strokeWidth="1"/>
   <path d="M-8 25 Q0 31 8 25 M-8 29 Q0 35 8 29" fill="none" stroke="#edf3e9" strokeWidth="1.6"/>
   <path d="M-5 34 L-3 39 L3 39 L5 34" fill="#273f4a" stroke="#93bfc8" strokeWidth=".8"/>
  </g>)}
  <path d="M0 -44 Q5 -42 5 -34 L6 -5 Q6 1 0 3 Q-6 1 -6 -5 L-5 -34 Q-5 -42 0 -44 Z" fill={`url(#${canopy})`} stroke={ship.critical.canopy<30?'#d95757':'#e7f1e8'} strokeWidth="1"/>
  <path d="M-2 -38 L-2 -10 M2 -38 L2 -10 M-5 -6 L5 -6" stroke="#f7fff5" strokeWidth=".6" opacity=".85"/>
  <path d="M-4 4 L-4 32 L0 42 L4 32 L4 4 Z" fill={`url(#${metal})`} stroke="#72858c" strokeWidth=".7"/>
  <path d="M0 5 V39" stroke="#f7fff0" strokeWidth="1"/>
  <rect x="-2" y="7" width="4" height="5" fill={ship.critical.core<30?'#d95757':'#eeaa72'}/>
  {ship.parts.filter(p=>p.hp>0).map(part=>{
   const cells=occupiedCells(part),x=(part.x-5)*6,y=(part.y-8)*6;
   if(part.type==='pipe')return <path key={part.id} d={`M${x-2} ${y}h4`} stroke={charge>0?'#d6ffff':'#a0b9bd'} strokeWidth=".9" opacity={charge>0?.9:.4}/>;
   if(part.type==='solar')return <g key={part.id}><rect x={x-2} y={y-2} width="8" height="12" fill="#355360" stroke="#c0d6d8" strokeWidth=".5"/><path d={`M${x+2} ${y-2}v12M${x-2} ${y+2}h8M${x-2} ${y+6}h8`} stroke="#79d2df" strokeWidth=".5"/></g>;
   return <g key={part.id}><rect x={x-1.5} y={y-1.5} width="3" height="3" fill={part.type==='observer'?'#79d2df':'#c2cdc9'} stroke="#526975" strokeWidth=".5"/>{cells.length>1&&<path d={`M${x} ${y+1}v${Math.min(8,cells.length)}`} stroke="#8faaa9" strokeWidth="1"/>}</g>;
  })}
  {[...ship.cells,...ship.parts].filter(c=>c.hp>0).map((cell,i)=>{const x=(cell.x-5)*6,y=(cell.y-8)*6,{dust=0,burn=0,scratch=0}=cell.appearance;return <g key={i}>{dust>0&&<rect x={x-1} y={y-1} width="2" height="2" fill="#a9987a" opacity={dust}/>} {burn>0&&<rect x={x-2} y={y-2} width="4" height="4" fill="#563f33" opacity={burn*.7}/>} {scratch>0&&<path d={`M${x-2} ${y+2}l4 -4`} stroke="#384d58" strokeWidth=".7" opacity={scratch}/>}</g>;})}
 </g>;
}
