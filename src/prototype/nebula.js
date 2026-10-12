import {shipCells,cellToWorld} from './ship.js';
import {applyContact} from './damage.js';

// Issue #4 provisional balance/analysis policy, not final product tuning.
export const NEBULA={seed:7309,chunk:720,spawnChance:.48,analysisSeconds:4,contactInterval:.5,minimumVisibility:.3,observerBonus:60,drag:8,lateralForce:3,turnRate:.045,damagePerSecond:.4};
export const NEBULA_TYPES=[
 {id:'diffuse',name:'拡散型',color:[.18,.64,.76],density:.5,turbulence:.25,occlusion:.25,heat:0,abrasion:.15},
 {id:'dark',name:'暗黒型',color:[.18,.17,.29],density:.8,turbulence:.4,occlusion:.9,heat:0,abrasion:.3},
 {id:'energetic',name:'高エネルギー型',color:[.94,.34,.12],density:.7,turbulence:.6,occlusion:.45,heat:1,abrasion:.3},
 {id:'dense',name:'高密度型',color:[.53,.37,.64],density:1,turbulence:.9,occlusion:.65,heat:.15,abrasion:1},
];
export const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
const mix=(a,b,t)=>a+(b-a)*t,mod=(v,n)=>((v%n)+n)%n;
// Small integer polynomial hash is also used verbatim in the WebGL field shader.
export function fieldHash(x,y,seed){const a=mod(x+mod(seed,241),289),b=mod(y,289),p=mod((a*34+1)*a+b,289);return mod((p*34+1)*p,289)/289;}
export function noise(x,y,seed){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);return mix(mix(fieldHash(ix,iy,seed),fieldHash(ix+1,iy,seed),u),mix(fieldHash(ix,iy+1,seed),fieldHash(ix+1,iy+1,seed),u),v);}
export function fbm(x,y,seed){let value=0,amplitude=.5;for(let i=0;i<3;i++){value+=amplitude*noise(x,y,seed);x=x*2.03+13.1;y=y*2.03+7.7;amplitude*=.5;}return value/.875;}
export function generateNebula(seed,cx,cy){
 const r=n=>fieldHash(cx*17+n*31,cy*23+n*7,seed);
 // Leave the departure sector empty; a gentle first cloud introduces the system.
 if(cx===0&&cy===0)return null;
 const intro=cx===0&&cy===-1;if(!intro&&r(0)>NEBULA.spawnChance)return null;
 const type=NEBULA_TYPES[intro?0:Math.floor(r(1)*4)],variation=n=>.7+r(n)*.6;
 return {id:`nebula-${seed}-${cx}-${cy}`,seed:Math.floor(r(2)*240),position:intro?{x:80,y:-360}:{x:(cx+.25+r(3)*.5)*NEBULA.chunk,y:(cy+.25+r(4)*.5)*NEBULA.chunk},extent:intro?{x:240,y:190}:{x:160+r(5)*140,y:180+r(6)*140},shape:intro?2:Math.floor(r(7)*5),type:type.id,color:[...type.color],density:type.density*variation(8),turbulence:type.turbulence*variation(9),occlusion:clamp(type.occlusion*variation(10)),heat:type.heat*variation(11),abrasion:type.abrasion*variation(12)};
}
export function nebulaRegions(seed,position,radius){const out=[],span=NEBULA.chunk,padding=420;for(let y=Math.floor((position.y-radius-padding)/span);y<=Math.floor((position.y+radius+padding)/span);y++)for(let x=Math.floor((position.x-radius-padding)/span);x<=Math.floor((position.x+radius+padding)/span);x++){const region=generateNebula(seed,x,y);if(region&&Math.hypot(position.x-region.position.x,position.y-region.position.y)<radius+Math.max(region.extent.x,region.extent.y)*1.6)out.push(region);}return out;}
// The shader shares this low-frequency density equation. Fine visual detail has no physics.
export function regionDensity(region,point,time){
 let x=(point.x-region.position.x)/region.extent.x,y=(point.y-region.position.y)/region.extent.y;
 if(Math.abs(x)>1.6||Math.abs(y)>1.6)return 0;
 const seed=region.seed,t=time*.018;
 const wx=fbm(x*1.7+t,y*1.7,seed)-.5,wy=fbm(x*1.7,y*1.7-t,seed+17)-.5;
 x+=wx*.32;y+=wy*.32;
 let radius=Math.hypot(x,y);
 if(region.shape===0)radius=Math.hypot(x*1.4,y*.8);
 if(region.shape===1)radius=Math.hypot(x*.8,y*1.4);
 if(region.shape===3){const angle=Math.atan2(y,x);radius*=1+Math.sin(angle*3+radius*4)*.14;}
 if(region.shape===4)radius=Math.min(Math.hypot(x-.23,y+.2),Math.hypot(x+.24,y-.15))*1.12;
 const edge=clamp((1.2-radius)/.85),envelope=edge*edge*(3-2*edge);
 return clamp(envelope*(.42+.8*fbm(x*3.1+t*.65,y*3.1-t*.4,seed+31))*region.density);
}
export function environmentAt(regions,point,time){
 const field={density:0,turbulence:0,occlusion:0,heat:0,abrasion:0,flow:{x:0,y:0}};
 for(const r of regions){const d=regionDensity(r,point,time);if(d===0)continue;const x=(point.x-r.position.x)/r.extent.x,y=(point.y-r.position.y)/r.extent.y,t=time*.03;
  field.density+=d;field.turbulence+=d*r.turbulence;field.occlusion+=d*r.occlusion;field.heat+=d*r.heat;field.abrasion+=d*r.abrasion;
  field.flow.x+=d*(noise(x*4+t,y*4,r.seed+73)*2-1);field.flow.y+=d*(noise(x*4,y*4-t,r.seed+97)*2-1);
 }
 field.visibility=Math.max(NEBULA.minimumVisibility,1-clamp(field.occlusion));return field;
}
export function createNebula(seed=NEBULA.seed){return {seed,regions:[],field:environmentAt([],{x:0,y:0},0),observations:{},selected:null,contactClock:0};}
export function updateNebula(game){const {width,height,scale}=game.viewport;game.nebula.regions=nebulaRegions(game.nebula.seed,game.flight.position,Math.max(500,Math.hypot(width,height)/scale/2));if(game.tuning)game.nebula.regions=game.nebula.regions.map(r=>({...r,density:r.density*game.tuning.nebula.densityMultiplier}));game.nebula.field=environmentAt(game.nebula.regions,game.flight.position,game.flight.elapsed);}
export function environmentForFlight(field,heading=0){return {drag:Math.min(NEBULA.drag,field.density*NEBULA.drag),lateral:(field.flow.x*Math.cos(heading)+field.flow.y*Math.sin(heading))*NEBULA.lateralForce,turn:field.turbulence*field.flow.y*NEBULA.turnRate,minimumSpeed:12};}
export function observableRegion(region,game){return game.observation>0&&Math.hypot(region.position.x-game.flight.position.x,region.position.y-game.flight.position.y)<=game.observation+Math.max(region.extent.x,region.extent.y)*1.2;}
export function requestAnalysis(game,id){const r=game.nebula.regions.find(r=>r.id===id),record=game.nebula.observations[id];if(!r||!record||!observableRegion(r,game))return {ok:false,reason:'解析には稼働中の観測装置と観測範囲内の対象が必要です'};game.nebula.selected=id;return {ok:true,reason:'星雲を解析中です（暫定4秒・範囲外では一時停止）'};}
export function stepNebulaObservation(game,dt){
 const state=game.nebula;
 for(const r of state.regions)if(observableRegion(r,game)){
  const record=state.observations[r.id]??={id:r.id,state:'detected',position:{...r.position},progress:0,lastSeen:game.flight.elapsed};record.lastSeen=game.flight.elapsed;
  if(state.selected===r.id&&record.state!=='analyzed'){record.progress=Math.min(1,record.progress+dt/NEBULA.analysisSeconds);if(record.progress>=1){record.state='analyzed';record.details={type:r.type,density:r.density,turbulence:r.turbulence,occlusion:r.occlusion,load:r.heat+r.abrasion};}}
 }
 // A bounded journal avoids memory growth on endless voyages; keep the selected target.
 const entries=Object.values(state.observations).sort((a,b)=>b.lastSeen-a.lastSeen);for(const record of entries.slice(24))if(record.id!==state.selected)delete state.observations[record.id];
}
export function stepNebulaContacts(game,dt){
 const state=game.nebula;state.contactClock+=dt;if(state.contactClock+1e-9<NEBULA.contactInterval)return;const duration=state.contactClock;state.contactClock=0;
 const touched=new Set();
 for(const cell of shipCells(game.ship)){
  const point=cellToWorld(cell,game.flight),field=environmentAt(state.regions,point,game.flight.elapsed);if(field.density<.15)continue;
  const key=cell.role||cell.part?.id||`${cell.x},${cell.y}`;if(touched.has(key))continue;touched.add(key);
  applyContact(game,{type:'nebulaContact',position:point,appearance:{dust:field.density*.055*duration,scratch:field.abrasion*.035*duration,burn:field.heat*.045*duration},damage:field.density>.5?field.heat*NEBULA.damagePerSecond*duration:0});
  if(game.status!=='running')break;
 }
}
export function nebulaSnapshot(state,game){return {seed:state.seed,field:{...state.field,flow:{...state.field.flow}},selected:state.selected,observations:Object.values(state.observations).sort((a,b)=>b.lastSeen-a.lastSeen).slice(0,8).map(record=>({...record,position:{...record.position},details:record.details?{...record.details}:undefined})),observableIds:state.regions.filter(r=>observableRegion(r,game)).map(r=>r.id)};}
