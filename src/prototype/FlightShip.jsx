import EquipmentMark from './EquipmentMark.jsx';
import {partCount} from './equipment.js';
import {connectionPorts} from './energy.js';
import React,{useId} from 'react';
import {shipCells,CELL_METERS} from './ship.js';
import {PARTS,pipeConnectionMask} from './model.js';
import {forceGeometry,forceRods,forceRotationTime,forceSpinTransform} from './force.js';
// Every visible cell is the same live hull/part cell used for crafting and contacts.
export default function FlightShip({ship,energy,heading=0,charge=0,boost=null,force=null,elapsed=0,reducedMotion=false}){
 const id=useId().replaceAll(':',''),metal=`${id}-metal`,glass=`${id}-glass`,sphere=`${id}-force-metal`,cells=shipCells(ship),occupied=new Set(cells.map(c=>`${c.x},${c.y}`));
 const portMap=new Map(ship.parts.filter(p=>p.hp>0).map(p=>[p.id,connectionPorts(p,ship.parts)]));
 const lightX=-Math.cos(heading)-Math.sin(heading),lightY=Math.sin(heading)-Math.cos(heading),geometry=forceGeometry(ship),rods=forceRods(forceRotationTime(elapsed,reducedMotion));
 const rod=({index,x,y,scale})=><g key={index} data-force-rod={index} transform={`translate(${x} ${y}) scale(${scale})`}><path d="M-.12 -.38H.12L.17 .1L.13 1.18L.06 1.28H-.06L-.13 1.18L-.17 .1Z" fill={`url(#${metal})`} stroke="#46535d" strokeWidth=".035"/><path d="M-.12 .18H.12V.29H-.12ZM-.115 .34H.115V.42H-.115Z" fill="#a13731"/><path d="M-.07 .48V1.15" stroke="#f2ead0" strokeWidth=".035"/><path d="M-.14 -.35H.14V-.02H-.14Z" fill="#535b61" stroke="#b9c6c6" strokeWidth=".035"/></g>;
 return <g data-renderer="craft-flight">
  <defs><radialGradient id={sphere} cx=".3" cy=".2" r=".85"><stop stopColor="#fff8b3"/><stop offset=".3" stopColor="#ffdc45"/><stop offset=".7" stopColor="#ff8e0e"/><stop offset=".93" stopColor="#ff501d"/><stop offset="1" stopColor="#fff39b"/></radialGradient><linearGradient id={metal} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fffdf0"/><stop offset=".6" stopColor="#c8d1cf"/><stop offset="1" stopColor="#7e929a"/></linearGradient><linearGradient id={glass}><stop stopColor="#28576d"/><stop offset=".4" stopColor="#c3f2ed"/><stop offset=".65" stopColor="#81c4cb"/><stop offset="1" stopColor="#29556d"/></linearGradient></defs>
  {force?.equipped&&<g data-testid="force" aria-label="フォース：前方固定装備" data-width={geometry.width} data-muzzle-distance={-geometry.y-geometry.radius*.5} transform={`translate(0 ${geometry.y}) scale(${geometry.radius})`}>
   <g data-force-antennas="4">
    {rods.filter(r=>r.depth<0).map(rod)}
    <circle r=".94" fill="#ff701d" opacity=".12"/>
    <circle data-force-body="sphere" r=".85" fill={`url(#${sphere})`} stroke="#fff3ab" strokeWidth=".025"/>
    <circle r=".72" fill="#ffcf45" opacity={.1+Math.min(1,charge)*.2}/>
    <g transform="scale(1 .55)"><g data-force-spin="true" transform={forceSpinTransform(elapsed,reducedMotion)} fill="none" strokeWidth=".09"><path d="M.65 0A.65 .65 0 0 1 0 .65M-.65 0A.65 .65 0 0 1 0 -.65" stroke="#fff2bb"/><path d="M.4 0A.4 .4 0 0 1 0 .4" stroke="#a84e2b"/></g></g>
    {rods.filter(r=>r.depth>=0).map(rod)}
   </g>

  </g>}
  {cells.sort((a,b)=>a.y-b.y||a.x-b.x).map(cell=>{
   const x=(cell.x-5)*CELL_METERS,y=(cell.y-8)*CELL_METERS,type=cell.part?.type,powered=cell.part&&energy?.active[cell.part.id],kind=cell.part&&PARTS[type];
   const fill=cell.role==='canopy'?`url(#${glass})`:type==='solar'?'#34515f':`url(#${metal})`;
   const mask=type==='pipe'?pipeConnectionMask(ship.parts.filter(p=>p.hp>0),cell.x,cell.y):0;
   const {dust=0,burn=0,scratch=0}=cell.appearance;
   return <g key={`${cell.x},${cell.y}`} data-flight-cell={`${cell.x},${cell.y}`} data-flight-part={cell.part?.id} data-flight-type={type||cell.role||'hull'} data-multiple={type&&partCount(ship.parts,type)>1?'true':'false'} data-flight-power={powered?'on':'off'} data-flight-linked={energy?.tanks?.[cell.part?.id]?.linked?'true':'false'}>
    <path d={`M${x-3} ${y-3}h6v6h-6z`} fill={type==='tank'&&energy?.tanks?.[cell.part?.id]?.linked?'#ddc68d':fill} stroke="#637781" strokeWidth=".2"/>
    <path d={`M${x+3} ${y-3}l.6 .6v6l-.6 -.6z`} fill={lightX>0?'#bec9c6':'#607583'}/><path d={`M${x-3} ${y+3}l.6 .6h6l-.6 -.6z`} fill={lightY>0?'#adbfb9':'#74858e'}/>
    <path d={`M${x-2.5} ${y-2.5}h5M${x-2.5} ${y-2.5}v5`} fill="none" stroke="#f3faf0" strokeWidth=".4"/>
    {[[0,-1],[1,0],[0,1],[-1,0]].map(([dx,dy],i)=>occupied.has(`${cell.x+dx},${cell.y+dy}`)?null:<path key={i} d={i===0?`M${x-3} ${y-3}h6`:i===1?`M${x+3} ${y-3}v6`:i===2?`M${x-3} ${y+3}h6`:`M${x-3} ${y-3}v6`} stroke="#e7f5ed" strokeWidth=".45"/>)}
    {cell.role==='canopy'&&<path d={`M${x-1.5} ${y-3}v6M${x+1.5} ${y-3}v6`} stroke="#e1fcf3" strokeWidth=".35"/>}
    {cell.role==='core'&&<rect x={x-1.1} y={y-1.1} width="2.2" height="2.2" fill="#eeaa72"/>}
    {type==='solar'&&<path d={`M${x-3} ${y-1}h6M${x-3} ${y+1}h6M${x-1} ${y-3}v6M${x+1} ${y-3}v6`} stroke="#79d2df" strokeWidth=".35"/>}
    {type==='pipe'&&<g fill="none" stroke={powered?'#a7ebec':'#70848a'} strokeWidth={charge>0?1:.7}>{[[1,`M${x} ${y}v-3`],[2,`M${x} ${y}h3`],[4,`M${x} ${y}v3`],[8,`M${x} ${y}h-3`]].filter(([bit])=>mask&bit).map(([bit,d])=><path key={bit} d={d}/>)}{!mask&&<rect x={x-1} y={y-1} width="2" height="2"/>}</g>}
    {type==='engine'&&<><rect x={x-1.8} y={y-1.5} width="3.6" height="3" fill="#405966"/>{cell.y===cell.part.y+kind.height-1&&<><path d={`M${x-2} ${y+2}h4v1.5h-4z`} fill={powered?'#90e1e7':'#6d7f87'}/>{powered&&<g data-engine-exhaust={cell.part.id} data-boosting={boost?.remaining>0?'true':'false'} className="proto-engine-exhaust"><path d={`M${x-2} ${y+3.5}h4l1 ${boost?.remaining>0?9:3}l-3 ${boost?.remaining>0?10:3}l-3 -${boost?.remaining>0?10:3}z`} fill={boost?.remaining>0?'#70d6f2':'#79d2df'} opacity=".85"/><path d={`M${x-1} ${y+3.5}h2v${boost?.remaining>0?10:3}l-1 3l-1 -3z`} fill="#f1ffff"/></g>}</>}</>}
    {type==='tank'&&energy?.tanks?.[cell.part?.id]?.linked&&<path d={`M${x-3} ${y}h6`} stroke="#79d2df" strokeWidth=".8"/>}{cell.part&&type!=='pipe'&&(portMap.get(cell.part.id)||[]).filter(p=>p.x===cell.x&&p.y===cell.y).map(port=><path key={`${port.dx},${port.dy}`} data-flight-port={cell.part.id} d={`M${x+port.dx*3} ${y+port.dy*3}l${-port.dx*1.5} ${-port.dy*1.5}`} stroke={powered||type==='tank'?'#79d2df':'#607583'} strokeWidth=".7"/>)}{type==='tank'&&<path d={`M${x-1.5} ${y-2}v4M${x+1.5} ${y-2}v4`} stroke="#758e98" strokeWidth=".6"/>}
    {type==='observer'&&<><circle cx={x} cy={y} r="1.8" fill={powered?'#79d2df':'#68808b'}/><path d={`M${x} ${y-2}v4M${x-2} ${y}h4`} stroke="#30576b" strokeWidth=".35"/></>}
    {type==='missile'&&<><path d={`M${x} ${y-2.5}l1.6 2h-3.2z`} fill='#f29b7c'/><path d={`M${x-1} ${y-.5}h2v3h-2z`} fill='#d8e6e9'/></>}
    {type==='railgun'&&<path d={`M${x-1} ${y-2}v4M${x+1} ${y-2}v4`} stroke={charge>0?'#e0ffff':'#516e7e'} strokeWidth=".7"/>}
    {type&&partCount(ship.parts,type)>1&&<g transform={`translate(${x-3} ${y-3}) scale(.3)`}><EquipmentMark type={type}/></g>}
    {dust>0&&<rect x={x-2} y={y+1} width="2" height="1" fill="#ac9879" opacity={dust}/>}{burn>0&&<rect x={x-2} y={y-2} width="4" height="4" fill="#563f33" opacity={burn*.7}/>}{scratch>0&&<path d={`M${x-2} ${y+2}l4 -4`} stroke="#384d58" strokeWidth=".4" opacity={scratch}/>}
   </g>;
  })}
 </g>;
}
