import React from 'react';
// A shared 20x20 overlay keeps the craft grid and the in-flight silhouette consistent.
export default function EquipmentMark({type}){
 const color=type==='solar'?'#eacb75':type==='engine'?'#f0ae75':type==='railgun'?'#c2a5ef':'#a5f2df';
 return <g data-equipment-mark={type} fill="none" stroke={color} strokeWidth="1.2">
  {type==='solar'?<path d="M1 5V1H5M15 1H19V5M19 15V19H15M5 19H1V15M1 10H19"/>:
   type==='observer'?<><circle cx="10" cy="10" r="8.5"/><path d="M1 3H5M15 17H19"/></>:
   type==='engine'?<path d="M1 5V15M19 5V15M6 18V20M10 18V20M14 18V20"/>:
   type==='railgun'?<path d="M1 2V18M10 2V18M19 2V18"/>:
   type==='pipe'?<path d="M5 6H15V14H5ZM7 6V14M13 6V14"/>:<path d="M1 8H19M1 12H19"/>}
 </g>;
}
