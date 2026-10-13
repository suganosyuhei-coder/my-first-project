import {enemySegmentHit} from './enemyBodies.js';
import {advanceMissile,MISSILE_PHASES} from './missileFlight.js';
import {shipCells,CELL_METERS} from './ship.js';
import {enemyType,damageEnemy} from './enemyCombat.js';
// Metres, seconds, radians. No ammunition or energy is consumed by this launcher.
export const MISSILE={damage:10,speed:180,turnRate:4,range:600,cooldown:1.5,lifetime:8,lostLifetime:1.2,radius:3};
export const createMissiles=()=>({units:[],effects:[],cooldown:0,nextId:1,volleys:0,hits:0});
function nearest(game,position){return game.enemies.units.filter(e=>e.hp>0&&e.detected&&Math.hypot(e.position.x-position.x,e.position.y-position.y)<=MISSILE.range).sort((a,b)=>Math.hypot(a.position.x-position.x,a.position.y-position.y)-Math.hypot(b.position.x-position.x,b.position.y-position.y))[0];}
export function launchMissiles(game,heading=game.flight.heading){
 const state=game.missiles??=createMissiles();
 if(game.status!=='running'||game.paused||state.units.length||state.cooldown>0||!game.ship.parts.some(p=>p.type==='missile'&&p.hp>0))return false;
 const target=nearest(game,game.flight.position);if(!target)return false;
 const lateral=Math.max(18,...shipCells(game.ship).map(c=>Math.abs((c.x-5)*CELL_METERS)+6));
 for(const side of [-1,1]){const position={x:game.flight.position.x+Math.cos(heading)*lateral*side+Math.sin(heading)*6,y:game.flight.position.y+Math.sin(heading)*lateral*side-Math.cos(heading)*6};state.units.push({id:`missile-${state.nextId++}`,side,targetId:target.id,position,heading:heading+side*.22,age:0,phase:'drop',releaseVelocity:{...game.flight.velocity},lostSeconds:0,trail:[]});}
 state.cooldown=MISSILE.cooldown;state.volleys++;return true;
}

export function stepMissiles(game,dt){
 const state=game.missiles??=createMissiles();
 if(game.status!=='running'){state.units=[];state.effects=[];return;}
 if(game.paused)return;
 state.cooldown=Math.max(0,state.cooldown-dt);state.effects=state.effects.map(e=>({...e,age:e.age+dt})).filter(e=>e.age<MISSILE_PHASES.effectSeconds);
 state.units=state.units.filter(missile=>{
  missile.age+=dt;const target=game.enemies.units.find(e=>e.id===missile.targetId&&e.hp>0);
  if(!target)missile.lostSeconds+=dt;
  const {from,to:end,armed}=advanceMissile(missile,dt,target,MISSILE.speed,MISSILE.turnRate);
  const contact=armed&&target?enemySegmentHit(from,end,target,MISSILE.radius):null,hit=contact!==null;
  missile.position=hit?{x:from.x+(end.x-from.x)*contact,y:from.y+(end.y-from.y)*contact}:end;missile.trail.push({...missile.position});if(missile.trail.length>32)missile.trail.shift();
  if(hit||missile.age>=MISSILE.lifetime||missile.lostSeconds>=MISSILE.lostLifetime){
   if(hit){damageEnemy(game,target,MISSILE.damage,missile.position,MISSILE.radius,'missile');state.hits++;}
   state.effects.push({position:{...missile.position},age:0,hit:!!hit});return false;
  }
  return true;
 });
}
export function missileSnapshot(state){return {...state,units:state.units.map(m=>({...m,position:{...m.position},releaseVelocity:m.releaseVelocity?{...m.releaseVelocity}:undefined,trail:m.trail.map(p=>({...p}))})),effects:state.effects.map(e=>({...e,position:{...e.position}}))};}
