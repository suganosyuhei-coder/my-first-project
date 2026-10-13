const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export const ABERRANT_TYPES=['berserk','centipede','scorpion'];
function turnTo(enemy,target,rate,dt){const angle=Math.atan2(target.x-enemy.position.x,-(target.y-enemy.position.y)),delta=Math.atan2(Math.sin(angle-enemy.heading),Math.cos(angle-enemy.heading));enemy.heading+=Math.max(-rate*dt,Math.min(rate*dt,delta));}
export function stepAberrant(game,enemy,type,dt,speedScale,damageScale){
 if(!ABERRANT_TYPES.includes(enemy.type))return false;
 const time=game.flight.elapsed,near=distance(enemy.position,game.flight.position)<850;enemy.bodyTime=time;
 if(enemy.type==='berserk'){
  // Deterministic, bounded wandering; one phase attacks another berserk unit.
  const slot=enemy.slot??0,wander={x:enemy.home.x+Math.sin(time*.7+slot*1.7)*90,y:enemy.home.y+Math.cos(time*.9+slot)*90};turnTo(enemy,wander,3.2,dt);
  if(near&&enemy.cooldown<=0){const fighting=(Math.floor(time/3)+slot)%3===1,target=fighting?game.enemies.units.filter(e=>e.type==='berserk'&&e.id!==enemy.id&&e.hp>0&&distance(e.position,enemy.position)<340).sort((a,b)=>distance(a.position,enemy.position)-distance(b.position,enemy.position))[0]:null;
   let heading=target?Math.atan2(target.position.x-enemy.position.x,-(target.position.y-enemy.position.y)):time*1.9+slot*2.4;
   if(!target){const playerAngle=Math.atan2(game.flight.position.x-enemy.position.x,-(game.flight.position.y-enemy.position.y));if(Math.cos(heading-playerAngle)>.5)heading=playerAngle+Math.PI*.65;}
   game.enemies.shots.push({id:game.enemies.nextShot++,enemyType:enemy.type,sourceEnemyId:enemy.id,friendlyFire:true,targetEnemyId:target?.id,position:{...enemy.position},velocity:{x:Math.sin(heading)*type.shotSpeed,y:-Math.cos(heading)*type.shotSpeed},damage:type.damage*damageScale,remaining:3,color:'#ff75cc'});enemy.cooldown=type.cooldown;enemy.attackHeading=heading;enemy.attackAt=time;
  }
  const reach=distance(enemy.position,wander),step=Math.min(type.speed*speedScale*dt,reach);if(reach>0){enemy.position.x+=Math.sin(enemy.heading)*step;enemy.position.y-=Math.cos(enemy.heading)*step;}
 }else{
  const target=near?game.flight.position:enemy.home;turnTo(enemy,target,enemy.type==='centipede'?1.25:3.1,dt);
  const step=Math.min(type.speed*speedScale*dt,Math.max(0,distance(enemy.position,target)-(near?0:2)));enemy.position.x+=Math.sin(enemy.heading)*step;enemy.position.y-=Math.cos(enemy.heading)*step;
  if(enemy.type==='scorpion'&&near&&distance(enemy.position,game.flight.position)<type.shootRange&&enemy.cooldown<=0){const a=Math.atan2(game.flight.position.x-enemy.position.x,-(game.flight.position.y-enemy.position.y));for(const spread of [-.1,0,.1])game.enemies.shots.push({id:game.enemies.nextShot++,enemyType:enemy.type,position:{...enemy.position},velocity:{x:Math.sin(a+spread)*type.shotSpeed,y:-Math.cos(a+spread)*type.shotSpeed},damage:type.damage*damageScale,remaining:4});enemy.cooldown=type.cooldown;}
 }
 return true;
}
