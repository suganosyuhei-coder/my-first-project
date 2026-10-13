import {damageSpaceObject} from './spaceLoot.js';
import {damageEnemy,enemyType} from './enemyCombat.js';
export const BIT_SHOOT={range:600,speed:420,damage:18,hits:8,interval:.2};
const isObject=target=>['impact','obstacle'].includes(target.type);
const targets=game=>[...game.enemies.units.filter(e=>e.hp>0),...game.hazards.filter(h=>isObject(h)&&h.material!=='container'&&!game.destroyedRocks.has(h.id))];
function nearest(game,position){return targets(game).filter(e=>Math.hypot(e.position.x-position.x,e.position.y-position.y)<=BIT_SHOOT.range).sort((a,b)=>Math.hypot(a.position.x-position.x,a.position.y-position.y)-Math.hypot(b.position.x-position.x,b.position.y-position.y))[0];}
export function launchBitShoot(game,count=3){
 let launched=0;
 for(const bit of game.bits){if(launched>=count)break;if(bit.state!=='orbiting')continue;const target=nearest(game,bit.position);if(!target)continue;bit.state='shooting';bit.shootHits=0;bit.shootCooldown=0;bit.targetEnemyId=target.id;launched++;}
}
export function stepBitShoot(game,dt){
 if(game.status!=='running'||game.paused)return;
 const shipSpeed=Math.hypot(game.flight.velocity.x,game.flight.velocity.y);
 for(const bit of game.bits){
  if(!['shooting','shoot-returning'].includes(bit.state))continue;
  bit.shootCooldown=Math.max(0,(bit.shootCooldown??0)-dt);
  let target=bit.state==='shooting'?targets(game).find(e=>e.id===bit.targetEnemyId):null;
  if(bit.state==='shooting'&&!target){target=nearest(game,bit.position);bit.targetEnemyId=target?.id;if(!target)bit.state='shoot-returning';}
  const destination=bit.state==='shoot-returning'?game.flight.position:target.position;
  const dx=destination.x-bit.position.x,dy=destination.y-bit.position.y,distance=Math.hypot(dx,dy),speed=BIT_SHOOT.speed+(bit.state==='shoot-returning'?shipSpeed:0),step=speed*dt;
  const reach=bit.state==='shoot-returning'?8:(isObject(target)?target.radius:enemyType(target).radius)+4;
  if(distance>reach){const move=Math.min(distance,step);bit.position.x+=dx/distance*move;bit.position.y+=dy/distance*move;}
  if(Math.hypot(destination.x-bit.position.x,destination.y-bit.position.y)>reach)continue;
  if(bit.state==='shoot-returning'){bit.state='orbiting';delete bit.targetEnemyId;continue;}
  if(bit.shootCooldown>0)continue;
  if(isObject(target))damageSpaceObject(game,target,BIT_SHOOT.damage);else damageEnemy(game,target,BIT_SHOOT.damage,target.position,4,'bit');bit.shootHits++;bit.shootCooldown=BIT_SHOOT.interval;
  // Re-evaluate from this impact, allowing repeated impacts on a surviving nearest enemy.
  const next=nearest(game,bit.position);bit.targetEnemyId=next?.id;
  const retreatAngle=Math.atan2(bit.position.y-target.position.y,bit.position.x-target.position.x);bit.position={x:target.position.x+Math.cos(retreatAngle)*(reach+22),y:target.position.y+Math.sin(retreatAngle)*(reach+22)};
  if(bit.shootHits>=BIT_SHOOT.hits||!next)bit.state='shoot-returning';
 }
}
