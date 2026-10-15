import {enemySegmentHit,enemyCollisionGeometry} from './enemyBodies.js';
import {damageEnemy} from './enemyCombat.js';
export const TRAIL_DAMAGE={damage:2,interval:.5,radius:1.5};
// The retained, world-space flight polyline is also the visible dotted trail.
export function stepTrailDamage(game,dt){
 if(game.status!=='running'||dt<=0)return;
 const points=game.flight.trail;if(points.length<2)return;
 for(const enemy of game.enemies.units){
  if(enemy.hp<=0)continue;
  if(game.flight.elapsed<(enemy.trailNextHit??-1))continue;
  // Enemy pose stays fixed throughout this synchronous trail check. Reuse it
  // across every segment, and reject disjoint bounds before exact circle tests.
  const geometry=enemyCollisionGeometry(enemy);
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for(const body of geometry.core?[...geometry.bodies,geometry.core]:geometry.bodies){
   const r=body.radius+TRAIL_DAMAGE.radius;
   minX=Math.min(minX,body.position.x-r);maxX=Math.max(maxX,body.position.x+r);
   minY=Math.min(minY,body.position.y-r);maxY=Math.max(maxY,body.position.y+r);
  }
  for(let i=1;i<points.length;i++){
   const from=points[i-1],to=points[i];
   if(from.x<minX&&to.x<minX||from.x>maxX&&to.x>maxX||from.y<minY&&to.y<minY||from.y>maxY&&to.y>maxY)continue;
   if(enemySegmentHit(from,to,enemy,TRAIL_DAMAGE.radius,geometry)===null)continue;
   damageEnemy(game,enemy,TRAIL_DAMAGE.damage,enemy.position);enemy.trailNextHit=game.flight.elapsed+TRAIL_DAMAGE.interval;break;
  }
 }
}
