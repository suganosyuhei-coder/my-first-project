import {enemySegmentHit} from './enemyBodies.js';
import {enemyType,damageEnemy} from './enemyCombat.js';
import {segmentHit} from './railgun.js';
export const TRAIL_DAMAGE={damage:2,interval:.5,radius:1.5};
// The retained, world-space flight polyline is also the visible dotted trail.
export function stepTrailDamage(game,dt){
 if(game.status!=='running'||dt<=0)return;
 const points=game.flight.trail;if(points.length<2)return;
 for(const enemy of game.enemies.units){
  if(enemy.hp<=0)continue;
  if(game.flight.elapsed<(enemy.trailNextHit??-1))continue;
  for(let i=1;i<points.length;i++){
   if(enemySegmentHit(points[i-1],points[i],enemy,TRAIL_DAMAGE.radius)===null)continue;
   damageEnemy(game,enemy,TRAIL_DAMAGE.damage,enemy.position);enemy.trailNextHit=game.flight.elapsed+TRAIL_DAMAGE.interval;break;
  }
 }
}
