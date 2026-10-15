import {segmentHit,enemySegmentHit} from './enemyBodies.js';
export {segmentHit} from './enemyBodies.js';
import {launchMissiles} from './missiles.js';
import {destroySpaceObject} from './spaceLoot.js';
import {launchBitShoot} from './bitShoot.js';
import {diffusionPath,convergencePath,stepDiffusion} from './diffusion.js';
import {weaponDamageMultiplier,solarChargeMultiplier} from './equipment.js';
import {enemyType,damageEnemy} from './enemyCombat.js';
import {weaponMuzzleDistance,forceTuning} from './force.js';
import {aimTarget} from './targeting.js';
import {supplyGraph} from './energy.js';
import {occupiedCells} from './model.js';
// Provisional Issue #5 tuning. Not approved final balance. Units: seconds, metres, E.
export const RAILGUN={minHoldSeconds:.4,maxChargeSeconds:3.6,convergenceHoldSeconds:2.8,baseChargeSeconds:2.4,maxCharge:1.5,thresholds:[0,.35,.85,1.4],costs:[2,12,32,64],damage:[12.5,35,100,400/9],damageGrowth:.5,speeds:[900,220,260,260],ranges:[588,560,700,650],radii:[2,5,9,1.5],initialStored:40,muzzleDistance:42,effectSeconds:.38,beamSeconds:.32,flashSeconds:.09,trailSeconds:.1,tracerLength:12,corePort:{x:5,y:9}};
export function normalShotSpeed(heading){return RAILGUN.speeds[0]*(-Math.cos(heading)>1e-9?1.25:1);}
export function createRailgun(){return {subspaceGrace:0,autoFire:false,autoClock:0,holding:false,heldSeconds:0,diffusionHeldSeconds:0,convergenceReady:false,charge:0,limit:0,limitStage:0,forceCooldown:0,shots:0,hits:0,nextId:1,projectiles:[],effects:[],lastShot:null,lastHit:null,totalSpent:0,baseGenerated:0};}
export function railgunTanks(ship){
 const components=supplyGraph(ship.parts),port=RAILGUN.corePort;
 return components.filter(group=>group.some(p=>p.type==='pipe'&&occupiedCells(p).some(c=>Math.abs(c.x-port.x)+Math.abs(c.y-port.y)===1))).flatMap(group=>group.filter(p=>p.type==='tank'&&p.hp>0));
}
export function railgunLimits(ship){
 const tanks=railgunTanks(ship),available=tanks.reduce((n,p)=>n+Math.max(0,p.stored||0),0);
 const ids=new Set(supplyGraph(ship.parts).filter(group=>group.some(p=>tanks.some(t=>t.id===p.id))).flatMap(g=>g.map(p=>p.id)));
 const count=ship.parts.filter(p=>p.type==='railgun'&&p.hp>0&&ids.has(p.id)).length;
 const enhanced=ship.parts.some(p=>p.type==='railgun'&&p.hp>0&&ids.has(p.id));
 const stage=3,limit=RAILGUN.maxCharge; // Base weapon supply keeps charged fire available.
 return {tanks,available,enhanced,count,stage,limit};
}
export function chargeStage(charge){return charge>=RAILGUN.thresholds[3]?3:charge>=RAILGUN.thresholds[2]?2:charge>0?1:0;}
export function cancelRailgun(weapon){weapon.holding=false;weapon.heldSeconds=0;weapon.charge=0;weapon.diffusionHeldSeconds=0;weapon.convergenceReady=false;}
function fire(game,heading){
 const w=game.weapon,limits=railgunLimits(game.ship),charge=Math.min(w.charge,limits.limit),stage=w.heldSeconds+1e-9<RAILGUN.minHoldSeconds?0:Math.min(chargeStage(charge),limits.stage);
 const enhanced=!!game.force?.equipped,tuning=forceTuning(game),normalForce=enhanced&&stage===1;
 const converging=stage===3&&w.convergenceReady;
 const range=RAILGUN.ranges[stage];
 const cost=RAILGUN.costs[stage];let remaining=Math.min(cost,limits.available),paid=remaining;
 for(const tank of limits.tanks){const take=Math.min(tank.stored,remaining);tank.stored-=take;remaining-=take;}
 const base=cost-paid; // Base supply covers any shortfall without filling storage.
 const low=RAILGUN.thresholds[stage],high=stage===3?RAILGUN.maxCharge:stage===2?1:RAILGUN.thresholds[stage+1],u=Math.max(0,Math.min(1,(charge-low)/(high-low)));
 const muzzleDistance=weaponMuzzleDistance(game,RAILGUN.muzzleDistance);
 const target=aimTarget(game,heading,range,muzzleDistance);if(target)heading=target.heading;
 const damage=RAILGUN.damage[stage]*(1+RAILGUN.damageGrowth*u*u)*(enhanced&&stage>0?tuning.chargedDamage:1)*weaponDamageMultiplier(game.ship.parts);
 // Origin stays on the physical nozzle even when forward aim assistance changes direction.
 const origin=target?.origin||{x:game.flight.position.x+Math.sin(heading)*muzzleDistance,y:game.flight.position.y-Math.cos(heading)*muzzleDistance};
 const patterns=stage===3?[-1.2,-.9,-.6,-.3,0,.3,.6,.9,1.2].map(offset=>({offset,laser:enhanced})):normalForce?[{offset:0,lateral:0,laser:false,halfWave:true},...[-10,10].map(lateral=>({offset:0,lateral,laser:false,forceBullet:true}))] :stage===0?(enhanced?[0,-10,10].map(lateral=>({offset:0,lateral,laser:false,forceBullet:true})):[{offset:0,laser:false}]):[{offset:0,laser:enhanced}];
 const volley=stage===3?{kills:0,notified:false}:undefined;
 const shots=patterns.map(({offset,laser,lateral=0,halfWave=false,forceBullet=false})=>{
  const angle=heading+offset,direction={x:Math.sin(angle),y:-Math.cos(angle)},shotOrigin={x:origin.x+Math.cos(heading)*lateral,y:origin.y+Math.sin(heading)*lateral};
  if(halfWave){shotOrigin.x=game.flight.position.x+Math.sin(heading)*RAILGUN.muzzleDistance;shotOrigin.y=game.flight.position.y-Math.cos(heading)*RAILGUN.muzzleDistance;}
  const shotStage=halfWave?1:forceBullet?0:stage,speed=shotStage===0?normalShotSpeed(angle):RAILGUN.speeds[shotStage];
  return {volley,converging,halfWave,forceBullet,path:stage===3?(converging?convergencePath:diffusionPath)(origin,heading,offset,range):undefined,id:`shot-${w.nextId++}`,stage:shotStage,charge,damage:halfWave?RAILGUN.damage[2]*1.5*tuning.chargedDamage*.5*weaponDamageMultiplier(game.ship.parts):forceBullet?RAILGUN.damage[0]*weaponDamageMultiplier(game.ship.parts):damage,cost,paid,base,enhanced:laser,duration:stage>0&&stage<3?1.4:RAILGUN.beamSeconds,position:{...shotOrigin},origin:{...shotOrigin},heading:angle,velocity:{x:direction.x*speed,y:direction.y*speed},targetId:offset===0?target?.rock.id||null:null,radius:halfWave?RAILGUN.radii[2]*.5:forceBullet?RAILGUN.radii[0]:laser?(stage===0?1.5:RAILGUN.radii[stage]*tuning.chargedWidth):RAILGUN.radii[stage],remaining:halfWave?RAILGUN.ranges[2]:forceBullet?RAILGUN.ranges[0]:range};
 });
 if(enhanced)for(const bit of game.bits??[]){
  if(bit.state!=='orbiting'||Math.hypot(bit.position.x-game.flight.position.x,bit.position.y-game.flight.position.y)>90)continue;
  const position={x:bit.position.x+Math.sin(heading)*4,y:bit.position.y-Math.cos(heading)*4};
  shots.push({id:`shot-${w.nextId++}`,sourceBit:bit.id,stage:0,charge:0,enhanced:false,position:{...position},origin:{...position},heading,damage:RAILGUN.damage[0],cost:0,paid:0,base:0,targetId:null,radius:RAILGUN.radii[0],remaining:RAILGUN.ranges[0],velocity:{x:Math.sin(heading)*normalShotSpeed(heading),y:-Math.cos(heading)*normalShotSpeed(heading)}});
  w.effects.push({type:'muzzle',position:{...position},heading,stage:0,enhanced:false,age:0});
 }
 w.projectiles.push(...shots);w.effects.push({type:'muzzle',position:{...origin},heading,stage,enhanced,age:0});w.shots++;w.lastShot={id:shots[0].id,stage,converging,damage,cost,paid,base,enhanced,projectileCount:shots.length,assisted:!!target};w.totalSpent+=cost;w.baseGenerated+=base;
 game.energy.stored=game.ship.parts.filter(p=>p.type==='tank'&&p.hp>0).reduce((n,p)=>n+p.stored,0);
 // Only a fired charged wave opens the one-use dash window. Holding Space and normal shots do not.
 if(stage>0)w.subspaceGrace=(game.tuning?.boost.diveGraceFrames??5)/60;
 launchMissiles(game,heading);
 if(stage>0)launchBitShoot(game,stage);
 cancelRailgun(w);
}
export function stepRailgun(game,commands,dt){
 const w=game.weapon;if(game.status!=='running'){cancelRailgun(w);w.subspaceGrace=0;w.autoFire=false;return;}
 if(game.paused)return;
 if(game.trueBoss?.phase==='absorption'){cancelRailgun(w);w.autoFire=false;w.subspaceGrace=0;return;}
 w.subspaceGrace=Math.max(0,(w.subspaceGrace??0)-dt);
 w.forceCooldown=Math.max(0,(w.forceCooldown??0)-dt);
 const limits=railgunLimits(game.ship);w.limit=limits.limit;w.limitStage=limits.stage;
 for(const action of commands){
  if(action.type==='weapon-cancel'){cancelRailgun(w);w.subspaceGrace=0;w.autoFire=false;}
  if(action.type==='weapon-auto-toggle'){cancelRailgun(w);w.subspaceGrace=0;w.autoFire=!w.autoFire;w.autoClock=0;}
  if(action.type==='weapon-press'&&!w.autoFire&&!w.holding){w.holding=true;w.heldSeconds=0;w.charge=0;w.diffusionHeldSeconds=0;w.convergenceReady=false;}
  if(action.type==='weapon-release'&&!w.autoFire&&w.holding)fire(game,action.heading??game.flight.heading);
 }
 if(w.autoFire){w.autoClock-=dt;while(w.autoClock< -1e-9){cancelRailgun(w);fire(game,game.flight.heading);w.autoClock+=1/6;}}
 if(w.holding){const rate=solarChargeMultiplier(game.ship.parts),untilDiffusion=Math.max(0,(RAILGUN.thresholds[3]-w.charge)*RAILGUN.baseChargeSeconds/rate);w.heldSeconds=Math.min(RAILGUN.maxChargeSeconds/rate,w.heldSeconds+dt);w.charge=Math.min(w.heldSeconds/RAILGUN.baseChargeSeconds*rate,railgunLimits(game.ship).limit);if(w.charge+1e-9>=RAILGUN.thresholds[3])w.diffusionHeldSeconds=(w.diffusionHeldSeconds??0)+Math.max(0,dt-untilDiffusion);else w.diffusionHeldSeconds=0;w.convergenceReady=w.diffusionHeldSeconds+1e-9>=RAILGUN.convergenceHoldSeconds;}
 const after=railgunLimits(game.ship);w.limit=after.limit;w.limitStage=after.stage;
}
// Swept segment/circle test prevents fast shots tunnelling through rocks between ticks.

export function stepProjectiles(game,dt){
 const w=game.weapon;if(game.status!=='running'){w.projectiles=[];w.effects=[];return;}
 w.effects=w.effects.map(e=>({...e,age:e.age+dt})).filter(e=>e.age<(e.duration??(e.type==='beam'?RAILGUN.beamSeconds:e.type==='muzzle'?RAILGUN.flashSeconds:e.type==='trail'?RAILGUN.trailSeconds:RAILGUN.effectSeconds)));
 // Small shots travel with swept collision; medium/max preserve their charged beams.
 w.projectiles=w.projectiles.filter(shot=>{
  if(shot.stage===3)return stepDiffusion(game,shot,dt,segmentHit);
  const laser=shot.enhanced||shot.stage!==0;
  const from=laser?shot.origin:{...shot.position},direction={x:Math.sin(shot.heading),y:-Math.cos(shot.heading)},travel=laser?shot.remaining:Math.min(Math.hypot(shot.velocity.x,shot.velocity.y)*dt,shot.remaining),end={x:from.x+direction.x*travel,y:from.y+direction.y*travel};
  const hits=[];
  for(const obstacle of game.hazards.filter(h=>['impact','obstacle'].includes(h.type)&&!game.destroyedRocks.has(h.id))){const t=segmentHit(from,end,obstacle.position,obstacle.radius+shot.radius);if(t!==null)hits.push({t,obstacle});}
  for(const enemy of game.enemies?.units??[]){if(enemy.hp<=0)continue;const t=enemySegmentHit(from,end,enemy,shot.radius);if(t!==null)hits.push({t,enemy});}
  hits.sort((a,b)=>a.t-b.t);const hit=hits[0];
  const point=hit?{x:from.x+(end.x-from.x)*hit.t,y:from.y+(end.y-from.y)*hit.t}:end;
  w.effects.push({type:laser?'beam':'trail',duration:laser?shot.duration:undefined,enhanced:shot.enhanced,position:{...from},end:shot.stage>0?end:point,heading:shot.heading,stage:shot.stage,radius:shot.radius,age:0});
  for(const hit of shot.stage>0?hits:hits.slice(0,1)){
   const point={x:from.x+(end.x-from.x)*hit.t,y:from.y+(end.y-from.y)*hit.t};
   if(hit.enemy){
    const result=damageEnemy(game,hit.enemy,shot.damage,point,shot.radius,shot.sourceBit?'bit':shot.stage>0?'wave':'normal');
    w.hits++;w.lastHit={enemyId:hit.enemy.id,...result,position:point};
   }else{
    destroySpaceObject(game,hit.obstacle);
    w.hits++;w.lastHit={obstacleId:hit.obstacle.id,damage:shot.damage,position:point,destroyed:true};
   }
   w.effects.push({type:'hit',position:{...point},heading:shot.heading,stage:shot.stage,age:0});
  }
  if(hit||laser)return false;shot.position=end;shot.remaining-=travel;return shot.remaining>0;
 });
 game.hazards=game.hazards.filter(h=>!game.destroyedRocks.has(h.id));
}
