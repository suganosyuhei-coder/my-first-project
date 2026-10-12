import {aimTarget} from './targeting.js';
import {supplyGraph} from './energy.js';
import {occupiedCells} from './model.js';
// Provisional Issue #5 tuning. Not approved final balance. Units: seconds, metres, E.
export const RAILGUN={maxChargeSeconds:2.4,thresholds:[0,.35,.85],costs:[2,12,32],damage:[10,35,100],damageGrowth:.5,speeds:[900,220,260],ranges:[420,560,700],radii:[2,5,9],initialStored:40,muzzleDistance:42,effectSeconds:.38,beamSeconds:.32,flashSeconds:.09,trailSeconds:.1,tracerLength:12,corePort:{x:5,y:9}};
export function createRailgun(){return {holding:false,heldSeconds:0,charge:0,limit:0,limitStage:0,shots:0,hits:0,nextId:1,projectiles:[],effects:[],lastShot:null,lastHit:null,totalSpent:0,baseGenerated:0};}
export function railgunTanks(ship){
 const components=supplyGraph(ship.parts),port=RAILGUN.corePort;
 return components.filter(group=>group.some(p=>p.type==='pipe'&&occupiedCells(p).some(c=>Math.abs(c.x-port.x)+Math.abs(c.y-port.y)===1))).flatMap(group=>group.filter(p=>p.type==='tank'&&p.hp>0));
}
export function railgunLimits(ship){
 const tanks=railgunTanks(ship),available=tanks.reduce((n,p)=>n+Math.max(0,p.stored||0),0);
 const ids=new Set(supplyGraph(ship.parts).filter(group=>group.some(p=>tanks.some(t=>t.id===p.id))).flatMap(g=>g.map(p=>p.id)));
 const enhanced=ship.parts.some(p=>p.type==='railgun'&&p.hp>0&&ids.has(p.id));
 let stage=0;if(enhanced)for(let i=1;i<3;i++)if(available+1e-9>=RAILGUN.costs[i])stage=i;
 const limit=available<RAILGUN.costs[0]||!enhanced?0:stage===2?1:RAILGUN.thresholds[stage+1]-.0001;
 return {tanks,available,enhanced,stage,limit};
}
export function chargeStage(charge){return charge>=RAILGUN.thresholds[2]?2:charge>=RAILGUN.thresholds[1]?1:0;}
export function cancelRailgun(weapon){weapon.holding=false;weapon.heldSeconds=0;weapon.charge=0;}
function fire(game,heading){
 const w=game.weapon,limits=railgunLimits(game.ship),charge=Math.min(w.charge,limits.limit),stage=Math.min(chargeStage(charge),limits.stage);
 const cost=RAILGUN.costs[stage];let remaining=Math.min(cost,limits.available),paid=remaining;
 for(const tank of limits.tanks){const take=Math.min(tank.stored,remaining);tank.stored-=take;remaining-=take;}
 const base=cost-paid; // Only the small shot can require ephemeral base supply; never fills storage.
 const low=RAILGUN.thresholds[stage],high=stage===2?1:RAILGUN.thresholds[stage+1],u=Math.max(0,Math.min(1,(charge-low)/(high-low)));
 const target=aimTarget(game,heading,RAILGUN.ranges[stage],RAILGUN.muzzleDistance);if(target)heading=target.heading;
 const damage=RAILGUN.damage[stage]*(1+RAILGUN.damageGrowth*u*u),direction={x:Math.sin(heading),y:-Math.cos(heading)},origin=target?.origin||{x:game.flight.position.x+direction.x*RAILGUN.muzzleDistance,y:game.flight.position.y+direction.y*RAILGUN.muzzleDistance};
 const shot={id:`shot-${w.nextId++}`,stage,charge,damage,cost,paid,base,position:{...origin},origin,heading,velocity:{x:direction.x*RAILGUN.speeds[stage],y:direction.y*RAILGUN.speeds[stage]},targetId:target?.rock.id||null,radius:RAILGUN.radii[stage],remaining:RAILGUN.ranges[stage]};
 w.projectiles.push(shot);w.effects.push({type:'muzzle',position:{...origin},heading,stage,age:0});w.shots++;w.lastShot={id:shot.id,stage,damage,cost,paid,base,assisted:!!target};w.totalSpent+=cost;w.baseGenerated+=base;
 game.energy.stored=game.ship.parts.filter(p=>p.type==='tank'&&p.hp>0).reduce((n,p)=>n+p.stored,0);
 cancelRailgun(w);
}
export function stepRailgun(game,commands,dt){
 const w=game.weapon;if(game.status!=='running'){cancelRailgun(w);return;}
 const limits=railgunLimits(game.ship);w.limit=limits.limit;w.limitStage=limits.stage;
 for(const action of commands){
  if(action.type==='weapon-cancel')cancelRailgun(w);
  if(action.type==='weapon-press'&&!w.holding){w.holding=true;w.heldSeconds=0;w.charge=0;}
  if(action.type==='weapon-release'&&w.holding)fire(game,action.heading??game.flight.heading);
 }
 if(w.holding){w.heldSeconds=Math.min(RAILGUN.maxChargeSeconds,w.heldSeconds+dt);w.charge=Math.min(w.heldSeconds/RAILGUN.maxChargeSeconds,railgunLimits(game.ship).limit);}
 const after=railgunLimits(game.ship);w.limit=after.limit;w.limitStage=after.stage;
}
// Swept segment/circle test prevents fast shots tunnelling through rocks between ticks.
export function segmentHit(from,to,center,radius){
 const dx=to.x-from.x,dy=to.y-from.y,fx=from.x-center.x,fy=from.y-center.y,a=dx*dx+dy*dy,c=fx*fx+fy*fy-radius*radius;
 if(c<=0)return 0;if(a===0)return null;
 const b=2*(fx*dx+fy*dy),disc=b*b-4*a*c;if(disc<0)return null;
 const t=(-b-Math.sqrt(disc))/(2*a);return t>=0&&t<=1?t:null;
}
export function stepProjectiles(game,dt){
 const w=game.weapon;if(game.status!=='running'){w.projectiles=[];w.effects=[];return;}
 w.effects=w.effects.map(e=>({...e,age:e.age+dt})).filter(e=>e.age<(e.type==='beam'?RAILGUN.beamSeconds:e.type==='muzzle'?RAILGUN.flashSeconds:e.type==='trail'?RAILGUN.trailSeconds:RAILGUN.effectSeconds));
 // Small shots travel with swept collision; medium/max preserve their charged beams.
 w.projectiles=w.projectiles.filter(shot=>{
  const from=shot.stage===0?{...shot.position}:shot.origin,direction={x:Math.sin(shot.heading),y:-Math.cos(shot.heading)},travel=shot.stage===0?Math.min(Math.hypot(shot.velocity.x,shot.velocity.y)*dt,shot.remaining):shot.remaining,end={x:from.x+direction.x*travel,y:from.y+direction.y*travel};
  let hit=null;
  for(const obstacle of game.hazards.filter(h=>['impact','obstacle'].includes(h.type)&&!game.destroyedRocks.has(h.id))){const t=segmentHit(from,end,obstacle.position,obstacle.radius+shot.radius);if(t!==null&&(!hit||t<hit.t))hit={t,obstacle};}
  const point=hit?{x:from.x+(end.x-from.x)*hit.t,y:from.y+(end.y-from.y)*hit.t}:end;
  w.effects.push({type:shot.stage===0?'trail':'beam',position:{...from},end:point,heading:shot.heading,stage:shot.stage,radius:shot.radius,age:0});
  if(hit){
   game.destroyedRocks.add(hit.obstacle.id);game.contacts.delete(hit.obstacle.id);game.rockAlerts.delete(hit.obstacle.id);
   w.hits++;w.lastHit={obstacleId:hit.obstacle.id,damage:shot.damage,position:point,destroyed:true};w.effects.push({type:'hit',position:{...hit.obstacle.position},heading:shot.heading,stage:shot.stage,age:0});
  }
  if(hit||shot.stage!==0)return false;shot.position=end;shot.remaining-=travel;return shot.remaining>0;
 });
 game.hazards=game.hazards.filter(h=>!game.destroyedRocks.has(h.id));
}
