import React,{useId} from 'react';
import {shipCells,CELL_METERS} from './ship.js';
import {PARTS,pipeMask} from './model.js';
// Every visible cell is the same live hull/part cell used for crafting and contacts.
export default function FlightShip({ship,energy,heading=0,charge=0}){
 const id=useId().replaceAll(':',''),metal=`${id}-metal`,glass=`${id}-glass`,cells=shipCells(ship),occupied=new Set(cells.map(c=>`${c.x},${c.y}`));
 const lightX=-Math.cos(heading)-Math.sin(heading),lightY=Math.sin(heading)-Math.cos(heading);
 return <g data-renderer="craft-flight">
  <defs><linearGradient id={metal} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fffdf0"/><stop offset=".6" stopColor="#c8d1cf"/><stop offset="1" stopColor="#7e929a"/></linearGradient><linearGradient id={glass}><stop stopColor="#28576d"/><stop offset=".4" stopColor="#c3f2ed"/><stop offset=".65" stopColor="#81c4cb"/><stop offset="1" stopColor="#29556d"/></linearGradient></defs>
  {cells.sort((a,b)=>a.y-b.y||a.x-b.x).map(cell=>{
   const x=(cell.x-5)*CELL_METERS,y=(cell.y-8)*CELL_METERS,type=cell.part?.type,powered=cell.part&&energy?.active[cell.part.id],kind=cell.part&&PARTS[type];
   const fill=cell.role==='canopy'?`url(#${glass})`:type==='solar'?'#34515f':`url(#${metal})`;
   const mask=type==='pipe'?pipeMask(ship.parts.filter(p=>p.hp>0),cell.x,cell.y):0;
   const {dust=0,burn=0,scratch=0}=cell.appearance;
   return <g key={`${cell.x},${cell.y}`} data-flight-cell={`${cell.x},${cell.y}`} data-flight-part={cell.part?.id} data-flight-type={type||cell.role||'hull'} data-flight-power={powered?'on':'off'}>
    <path d={`M${x-3} ${y-3}h6v6h-6z`} fill={fill} stroke="#637781" strokeWidth=".2"/>
    <path d={`M${x+3} ${y-3}l.6 .6v6l-.6 -.6z`} fill={lightX>0?'#bec9c6':'#607583'}/><path d={`M${x-3} ${y+3}l.6 .6h6l-.6 -.6z`} fill={lightY>0?'#adbfb9':'#74858e'}/>
    <path d={`M${x-2.5} ${y-2.5}h5M${x-2.5} ${y-2.5}v5`} fill="none" stroke="#f3faf0" strokeWidth=".4"/>
    {[[0,-1],[1,0],[0,1],[-1,0]].map(([dx,dy],i)=>occupied.has(`${cell.x+dx},${cell.y+dy}`)?null:<path key={i} d={i===0?`M${x-3} ${y-3}h6`:i===1?`M${x+3} ${y-3}v6`:i===2?`M${x-3} ${y+3}h6`:`M${x-3} ${y-3}v6`} stroke="#e7f5ed" strokeWidth=".45"/>)}
    {cell.role==='canopy'&&<path d={`M${x-1.5} ${y-3}v6M${x+1.5} ${y-3}v6`} stroke="#e1fcf3" strokeWidth=".35"/>}
    {cell.role==='core'&&<rect x={x-1.1} y={y-1.1} width="2.2" height="2.2" fill="#eeaa72"/>}
    {type==='solar'&&<path d={`M${x-3} ${y-1}h6M${x-3} ${y+1}h6M${x-1} ${y-3}v6M${x+1} ${y-3}v6`} stroke="#79d2df" strokeWidth=".35"/>}
    {type==='pipe'&&<g fill="none" stroke={powered?'#a7ebec':'#70848a'} strokeWidth={charge>0?1:.7}>{[[1,`M${x} ${y}v-3`],[2,`M${x} ${y}h3`],[4,`M${x} ${y}v3`],[8,`M${x} ${y}h-3`]].filter(([bit])=>mask&bit).map(([bit,d])=><path key={bit} d={d}/>)}{!mask&&<rect x={x-1} y={y-1} width="2" height="2"/>}</g>}
    {type==='engine'&&<><rect x={x-1.8} y={y-1.5} width="3.6" height="3" fill="#405966"/>{cell.y===cell.part.y+kind.height-1&&<path d={`M${x-2} ${y+2}h4v1.5h-4z`} fill={powered?'#90e1e7':'#6d7f87'}/>}</>}
    {type==='tank'&&<path d={`M${x-1.5} ${y-2}v4M${x+1.5} ${y-2}v4`} stroke="#758e98" strokeWidth=".6"/>}
    {type==='observer'&&<><circle cx={x} cy={y} r="1.8" fill={powered?'#79d2df':'#68808b'}/><path d={`M${x} ${y-2}v4M${x-2} ${y}h4`} stroke="#30576b" strokeWidth=".35"/></>}
    {type==='railgun'&&<path d={`M${x-1} ${y-2}v4M${x+1} ${y-2}v4`} stroke={charge>0?'#e0ffff':'#516e7e'} strokeWidth=".7"/>}
    {dust>0&&<rect x={x-2} y={y+1} width="2" height="1" fill="#ac9879" opacity={dust}/>}{burn>0&&<rect x={x-2} y={y-2} width="4" height="4" fill="#563f33" opacity={burn*.7}/>}{scratch>0&&<path d={`M${x-2} ${y+2}l4 -4`} stroke="#384d58" strokeWidth=".4" opacity={scratch}/>}
   </g>;
  })}
 </g>;
}
