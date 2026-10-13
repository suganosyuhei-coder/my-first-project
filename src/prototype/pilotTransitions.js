import {PILOT_BLINK_ROWS,PILOT_SURPRISE_ROWS,PILOT_PAIN_ROWS} from './pilotBlink.js';
export const TRANSITION_FRAME_SECONDS=.1;
const src=new URL('../assets/pilot/expressions-transition-user.png',import.meta.url).href;
const columns=[9,170,331,493,654,818,979,1141,1303,1465];
export const PILOT_TRANSITIONS=Object.fromEntries(['worried','surprised','confused','thinking','averted','questioning'].map((key,i)=>{
 const row=Math.floor(i/2),start=i%2*5,y=[75,397,720][row];
 return [key,Array.from({length:5},(_,n)=>({src,index:n,crop:{x:columns[start+n],y,width:146,height:194,sourceWidth:1619,sourceHeight:971}}))];
}));
const secondSrc=new URL('../assets/pilot/expressions-transition-user-2.png',import.meta.url).href;
const secondColumns=[13,181,345,510,674,846,1014,1178,1343,1507];
['shaken','exasperated','determined','lonely','eyesClosed','shocked'].forEach((key,i)=>{
 const row=Math.floor(i/2),start=i%2*5,y=[115,403,691][row];
 PILOT_TRANSITIONS[key]=Array.from({length:5},(_,n)=>({src:secondSrc,index:n,crop:{x:secondColumns[start+n],y,width:153,height:197,sourceWidth:1672,sourceHeight:941}}));
});
PILOT_TRANSITIONS.worried=PILOT_BLINK_ROWS[1];
PILOT_TRANSITIONS.pain=PILOT_PAIN_ROWS[1];
export const PILOT_EXPRESSION_PAIRS={'worried:surprised':PILOT_SURPRISE_ROWS[1],'worried:pain':PILOT_PAIN_ROWS[0]};
// One-shot transitions run only on a matching expression change, not each line.
export function createExpressionTransition(){
 let previous='neutral',active=null;
 return (expression,time,reducedMotion=false)=>{
  if(expression!==previous){
   const frames=PILOT_EXPRESSION_PAIRS[`${previous}:${expression}`]??(['neutral','stoic'].includes(previous)?PILOT_TRANSITIONS[expression]:null);
   active=!reducedMotion&&frames?{frames,start:time}:null;
   previous=expression;
  }
  if(reducedMotion||!active)return null;
  const frames=active.frames,index=Math.floor((time-active.start+1e-8)/(frames[0].seconds??TRANSITION_FRAME_SECONDS));
  if(index<0||index>=frames.length){active=null;return null;}
  return frames[index];
 };
}
