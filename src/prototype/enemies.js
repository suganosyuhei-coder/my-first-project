import data from './enemyTypes.json' with {type:'json'};
import {shipCells,cellToWorld} from './ship.js';
import {applyContact} from './damage.js';
import {segmentHit} from './railgun.js';
export const ENEMY_TYPES=data.types,ENEMY_CONFIG=data.config,BIT_DEFENSE=data.defense;
export function createEnemies(){return {units:[],spawned:new Map(),shots:[],beams:[],nextShot:1,kills:0,bitCooldown:{},time:0};}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function spawnEnemies(game){
 const state=game.enemies;
 for(const region of game.nebula.regions){
  if(region.type!=='energetic'||state.spawned.has(region.id)||state.units.length+ENEMY_CONFIG.perNebula>ENEMY_CONFIG.maxEnemies)continue;
  state.spawned.set(region.id,{...region.position});
  for(let i=0;i<ENEMY_CONFIG.perNebula;i++){const type=ENEMY_TYPES[i%ENEMY_TYPES.length],angle=i*Math.PI*2/ENEMY_CONFIG.perNebula,reach=Math.min(region.extent.x,region.extent.y)*.35;
   state.units.push({id:`${region.id}-${type.id}-${i}`,type:type.id,regionId:region.id,hp:type.hp,position:{x:region.position.x+Math.cos(angle)*reach,y:region.position.y+Math.sin(angle)*reach},heading:0,cooldown:.8+i*.35,ramCooldown:0,supported:false,detected:false});
  }
 }
 // Preserve killed-region history nearby, bound the endless-world journal.
 for(const [id,p] of state.spawned)if(distance(p,game.flight.position)>ENEMY_CONFIG.maxRange*2)state.spawned.delete(id);
 state.units=state.units.filter(e=>e.hp>0&&distance(e.position,game.flight.position)<=ENEMY_CONFIG.maxRange);
}
export function stepEnemies(game,dt){
 if(game.status!=='running'){game.enemies.shots=[];game.enemies.beams=[];return;}
 const state=game.enemies,config=game.tuning?.enemies,stateTime=game.flight.elapsed;
 const speedScale=config?.speedMultiplier??1,damageScale=config?.damageMultiplier??1;
 spawnEnemies(game);state.time=stateTime;state.beams=state.beams.map(b=>({...b,age:b.age+dt})).filter(b=>b.age<BIT_DEFENSE.beamSeconds);
 const leaders=state.units.filter(e=>e.hp>0&&ENEMY_TYPES.find(t=>t.id===e.type).supportRange);
 for(const enemy of state.units){
  const type=ENEMY_TYPES.find(t=>t.id===enemy.type),support=leaders.find(e=>e.id!==enemy.id&&distance(e.position,enemy.position)<=ENEMY_TYPES.find(t=>t.id===e.type).supportRange),boost=support?ENEMY_TYPES.find(t=>t.id===support.type):null;
  enemy.supported=Boolean(support);enemy.ramCooldown=Math.max(0,enemy.ramCooldown-dt);enemy.cooldown=Math.max(0,enemy.cooldown-dt*(boost?.fireRateBoost??1));
  const dx=game.flight.position.x-enemy.position.x,dy=game.flight.position.y-enemy.position.y,d=Math.hypot(dx,dy);enemy.detected ||= d<=game.observation+type.radius;
  if(d>0&&d<=ENEMY_CONFIG.chaseRange&&type.speed>0){const move=Math.min(type.speed*speedScale*(boost?.speedBoost??1)*dt,Math.max(0,d-12));enemy.position.x+=dx/d*move;enemy.position.y+=dy/d*move;enemy.heading=Math.atan2(dx,-dy);}
  if(type.shootRange>0&&d<=type.shootRange&&enemy.cooldown<=0&&d>0){state.shots.push({id:state.nextShot++,position:{...enemy.position},velocity:{x:dx/d*type.shotSpeed,y:dy/d*type.shotSpeed},damage:type.damage*damageScale,remaining:4});enemy.cooldown=type.cooldown;}
 }
 // Recovery owns bit state. Only idle orbiting bits intercept; no jobs are cancelled.
 for(const bit of game.bits){state.bitCooldown[bit.id]=Math.max(0,(state.bitCooldown[bit.id]||0)-dt);if(bit.state!=='orbiting'||state.bitCooldown[bit.id]>0)continue;
  const target=state.units.filter(e=>e.hp>0&&distance(e.position,bit.position)<=BIT_DEFENSE.range).sort((a,b)=>distance(a.position,bit.position)-distance(b.position,bit.position))[0];if(!target)continue;
  target.hp=Math.max(0,target.hp-BIT_DEFENSE.damage*(config?.bitDamageMultiplier??1));state.bitCooldown[bit.id]=BIT_DEFENSE.cooldown;state.beams.push({bitId:bit.id,from:{...bit.position},to:{...target.position},age:0});if(target.hp===0)state.kills++;
 }
 const cells=shipCells(game.ship).map(c=>cellToWorld(c,game.flight));
 state.shots=state.shots.filter(shot=>{const from={...shot.position},to={x:from.x+shot.velocity.x*dt,y:from.y+shot.velocity.y*dt};shot.remaining-=dt;
  let contact=null;for(const position of cells){const t=segmentHit(from,to,position,5);if(t!==null&&(!contact||t<contact.t))contact={position,t};}
  shot.position=to;if(contact){applyContact(game,{type:'enemyAttack',position:contact.position,damage:shot.damage});return false;}return shot.remaining>0;
 }).slice(-48);
 for(const enemy of state.units){const type=ENEMY_TYPES.find(t=>t.id===enemy.type);if(enemy.hp<=0||type.ramDamage===0||enemy.ramCooldown>0)continue;const cell=cells.find(p=>distance(p,enemy.position)<=type.radius+3);if(cell){applyContact(game,{type:'enemyAttack',position:cell,damage:type.ramDamage*damageScale});enemy.ramCooldown=type.cooldown;}}
 if(game.status!=='running'){state.shots=[];state.beams=[];}
}
export function enemySnapshot(state){return {...state,spawned:undefined,units:state.units.map(e=>({...e,position:{...e.position}})),shots:state.shots.map(s=>({...s,position:{...s.position},velocity:{...s.velocity}})),beams:state.beams.map(b=>({...b,from:{...b.from},to:{...b.to}})),bitCooldown:{...state.bitCooldown}};}
