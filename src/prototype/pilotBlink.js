const src=new URL('../assets/pilot/expressions-blink-ten-user.png',import.meta.url).href;
const bounds=[[12,231],[240,453],[462,671],[680,892],[901,1108],[1117,1318],[1326,1525],[1533,1732],[1740,1947],[1956,2165]];
// Retain native pixels; a common view box prevents differently sized sheet cells
// from changing head size. The individual clip excludes borders and neighbours.
export const PILOT_BLINK_ROWS=Array.from({length:3},(_,row)=>bounds.map(([x,right],index)=>({src,index,row,seconds:row===1?.06:.05,crop:{x,y:[5,244,485][row],width:right-x,height:[228,230,233][row],sourceWidth:2172,sourceHeight:724,viewportWidth:224,viewportHeight:234,referenceWidth:219,fit:'meet'}})));
const surpriseSrc=new URL('../assets/pilot/expressions-surprised-ten-user.png',import.meta.url).href;
const surpriseXs=[18,235,452,669,887,1103,1320,1536,1752,1968];
export const PILOT_SURPRISE_ROWS=Array.from({length:3},(_,row)=>surpriseXs.map((x,index)=>({src:surpriseSrc,index,row,seconds:row===1?.06:.05,crop:{x,y:[14,249,489][row],width:190,height:[209,211,211][row],sourceWidth:2172,sourceHeight:724,viewportWidth:224,viewportHeight:234,referenceWidth:190,fit:'meet'}})));
const painSrc=new URL('../assets/pilot/expressions-pain-nine-user.png',import.meta.url).href;
const painXs=[14,254,495,735,975,1213,1453,1693,1933];
export const PILOT_PAIN_ROWS=Array.from({length:3},(_,row)=>painXs.map((x,index)=>({src:painSrc,index,row,seconds:row===2?.04:.06,crop:{x,y:[12,253,494][row],width:224,height:216,sourceWidth:2172,sourceHeight:724,referenceWidth:224,fit:'meet'}})));
export function pilotBlinkFrame(expression,time,reducedMotion=false){
 if(expression==='pain'){
  const period=4.6,phase=((time%period)+period)%period,start=period-.68,step=reducedMotion||phase<start?0:Math.min(16,Math.floor((phase-start+1e-8)/.04));
  return PILOT_PAIN_ROWS[2][step<=8?step:16-step];
 }
 if(expression==='surprised'){
  if(reducedMotion)return PILOT_SURPRISE_ROWS[0][0];
  const period=4.6,phase=((time%period)+period)%period,row=Math.floor(Math.max(0,time)/period)%2===0?0:2,index=phase<4.1?0:Math.min(9,Math.floor((phase-4.1+1e-8)/.05));
  return PILOT_SURPRISE_ROWS[row][index];
 }
 const row=['neutral','stoic'].includes(expression)?0:expression==='worried'?2:null;
 if(row===null)return null;
 const frames=PILOT_BLINK_ROWS[row],period=row===0?4.8:4.3,phase=((time%period)+period)%period,start=period-.5;
 const index=reducedMotion||phase<start?0:Math.min(9,Math.floor((phase-start+1e-8)/.05));
 return frames[index];
}
