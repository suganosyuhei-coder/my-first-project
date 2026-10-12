import React from 'react';
import {shipCells} from './ship.js';
// 2D faces only. World-fixed light is transformed into the rotating ship's local axes.
export default function BlockShip({ship,heading=0,charge=0}) {
 const lightX=-Math.cos(heading)-Math.sin(heading),lightY=Math.sin(heading)-Math.cos(heading);
 return <g data-renderer="pseudo-2d">{shipCells(ship).sort((a,b)=>a.y-b.y||a.x-b.x).map(cell=>{
  const x=cell.x*20,y=cell.y*20,canopy=cell.role==='canopy',top=canopy?'#bbebed':cell.part?.type==='solar'?'#43596a':'#f2f1e9';
  const {dust=0,burn=0,scratch=0}=cell.appearance;
  return <g key={`${cell.x},${cell.y}`}>
   <path d={`M${x+20} ${y}l5 5v20l-5 -5z`} fill={lightX>0?'#bbbdb8':'#697780'}/>
   <path d={`M${x} ${y+20}l5 5h20l-5 -5z`} fill={lightY>0?'#a9afa8':'#77828a'}/>
   <path d={`M${x+2} ${y}h16l2 2v16l-2 2h-16l-2 -2v-16z`} fill={top} stroke="#33414b" strokeWidth=".6"/>
   <path d={`M${x+3} ${y+3}h14M${x+3} ${y+3}v14`} fill="none" stroke={canopy?'#efffff':'#ffffff'} strokeWidth="1.5"/>
   {canopy&&<path d={`M${x+7} ${y+1}v18M${x+15} ${y+1}v18`} stroke="#78b8c5" strokeWidth="1.5"/>}
   {cell.part?.type==='solar'&&<path d={`M${x+1} ${y+7}h18M${x+1} ${y+14}h18M${x+7} ${y+1}v18M${x+14} ${y+1}v18`} stroke="#79d2df" strokeWidth="1"/>}
   {cell.part?.type==='pipe'&&charge>0&&<rect x={x+5} y={y+5} width='10' height='10' fill='#b5f3ff' opacity={charge*.5}/>}
   {cell.part?.type==='railgun'&&<path d={`M${x+7} ${y+3}h6v14h-6z`} fill='#536d7e'/>}
   {cell.part?.type==='engine'&&<rect x={x+5} y={y+6} width="10" height="8" fill="#7f8990"/>}
   {cell.part?.type==='observer'&&<circle cx={x+10} cy={y+10} r="6" fill="#79d2df" stroke="#33414b"/>}
   {cell.part?.type==='pipe'&&<path d={`M${x+6} ${y+10}h8`} stroke="#79d2df" strokeWidth="3"/>}
   {cell.role==='core'&&<rect x={x+6} y={y+6} width="8" height="8" fill="#eeaa72"/>}
   {dust>0&&<path d={`M${x+3} ${y+13}h4v3h-4zM${x+13} ${y+5}h3v3h-3z`} fill="#977d5e" opacity={dust}/>}
   {burn>0&&<rect x={x+3} y={y+3} width="14" height="14" fill="#61483b" opacity={burn*.7}/>}
   {scratch>0&&<path d={`M${x+2} ${y+16}l11 -12M${x+8} ${y+18}l8 -7`} stroke="#4b5660" strokeWidth="1" opacity={scratch}/>}
  </g>;
 })}</g>;
}
