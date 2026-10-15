import {worldToScreen} from './model.js';
import {renderCamera} from './camera.js';
export const STABLE_SPACE={centre:{x:0,y:0},radius:480,rockDistance:650,iceDistance:810,combatDistance:930,normalDistance:1300,defeatedExitDistance:1180};
export const STABLE_ANGEL_LINE='アンテイクウイキヲカクニン。ガイブノテキハンノウガ、セッキンシテイマス。';
export const STABLE_SUE_LINE='ここまで来られたら、戻る場所もなくなる。……外で止めよう。';
export const createStableSpace=()=>({phase:'quiet',furthest:0,route:{x:0,y:-1},routeSet:false,enemy:null});
export function stableBoundaryRadius(angle){return STABLE_SPACE.radius*(.88+.07*Math.cos(3*angle)+.05*Math.sin(5*angle));}
export function stableBoundaryPoints(){return Array.from({length:120},(_,i)=>{const angle=i/120*Math.PI*2,r=stableBoundaryRadius(angle);return {x:Math.cos(angle)*r,y:Math.sin(angle)*r};});}
export function insideStableSpace(game,point=game.flight.position,padding=0){return !!game.stableSpace&&Math.hypot(point.x,point.y)<stableBoundaryRadius(Math.atan2(point.y,point.x))+padding;}
export function stableIntroduction(game){return !!game.stableSpace&&game.stableSpace.phase!=='normal';}
export function updateStableSpace(game){
 const state=game.stableSpace;if(!state)return;
 const distance=Math.hypot(game.flight.position.x,game.flight.position.y);state.furthest=Math.max(state.furthest,distance);
 if(!state.routeSet&&!insideStableSpace(game)){state.route={x:game.flight.position.x/distance,y:game.flight.position.y/distance};state.routeSet=true;}
 if(state.furthest>=STABLE_SPACE.normalDistance||state.enemy?.hp===0&&state.furthest>=STABLE_SPACE.defeatedExitDistance)state.phase='normal';
 else if(state.furthest>=STABLE_SPACE.combatDistance)state.phase='combat';
 else if(state.routeSet)state.phase='shooting';
 if(state.routeSet&&!state.enemy){const reach=Math.max(1120,distance+Math.hypot(game.viewport.width,game.viewport.height)/game.viewport.scale+160),position={x:state.route.x*reach,y:state.route.y*reach};state.enemy={id:'stable-training-enemy',type:'gunner',tutorialEnemy:true,campaign:true,hp:24,maxHp:24,position,home:{...position},heading:Math.atan2(-state.route.x,state.route.y),cooldown:2.8,ramCooldown:0,detected:false};}
}
export function stableTrainingObjects(game){
 if(!game.stableSpace)return [];
 // Fixed world positions, visible from the beginning; never relocate on exit.
 const route={x:0,y:-1};
 return [{id:'stable-training-rock',type:'impact',material:'rock',radius:14,position:{x:route.x*650-route.y*35,y:route.y*650+route.x*35}},{id:'stable-training-ice',type:'impact',material:'ice',radius:19,position:{x:route.x*810+route.y*30,y:route.y*810-route.x*30}}].filter(o=>!game.destroyedRocks.has(o.id));
}
export function stableSpaceSnapshot(game){return game.stableSpace?{phase:game.stableSpace.phase,inside:insideStableSpace(game),radius:STABLE_SPACE.radius,enemyRemaining:game.stableSpace.enemy?.hp>0?1:0}:null;}

// Intro suppression must not reveal an already-visible normal enemy at the switch.
// Pending units retain identity and HP and become eligible only beyond the viewport.
export function enterStableEnemies(game){
 const state=game.stableSpace;if(!state||state.phase!=='normal'||game.trueBoss)return;
 const seen=state.seenEnemies??=new Set(),pending=state.pendingEnemies??=new Map();
 const units=new Map([...pending,...game.enemies.units.map(e=>[e.id,e])]);
 game.enemies.units=[];
 for(const [id,enemy] of units){
  if(enemy.hp<=0){pending.delete(id);continue;}
  const p=worldToScreen(enemy.position,renderCamera(game),game.viewport.width,game.viewport.height,game.viewport.scale),margin=160*game.viewport.scale;
  const outside=p.x < -margin||p.y < -margin||p.x>game.viewport.width+margin||p.y>game.viewport.height+margin;
  if(!seen.has(id)&&!outside&&!enemy.tutorialEnemy){pending.set(id,enemy);continue;}
  seen.add(id);pending.delete(id);game.enemies.units.push(enemy);
 }
}

export function stableVisibleHazards(game,hazards){
 if(!game.stableSpace)return hazards;
 const seen=game.stableSpace.seenHazards??=new Set();
 return hazards.filter(h=>{
  if(h.id.startsWith('stable-training-')||seen.has(h.id))return true;
  const p=worldToScreen(h.position,renderCamera(game),game.viewport.width,game.viewport.height,game.viewport.scale),margin=(h.radius+30)*game.viewport.scale;
  if(p.x>=-margin&&p.y>=-margin&&p.x<=game.viewport.width+margin&&p.y<=game.viewport.height+margin)return false;
  seen.add(h.id);return true;
 });
}
