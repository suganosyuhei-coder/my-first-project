import {enemySegmentHit} from './enemyBodies.js';
import {destroySpaceObject} from './spaceLoot.js';
import {enemyType,damageEnemy} from './enemyCombat.js';
// Match the bright head's outer width; the faint halo remains decorative.
export const diffusionVisualRadius=radius=>Math.max(0,radius)*1.4;
export const diffusionHitRadius=radius=>diffusionVisualRadius(radius)*1.15*1.82*2.016;
export function diffusionPath(origin,heading,offset,range=650){
 const points=[],angle=offset/1.2*2.2,side=offset/1.2;
 for(let i=0;i<=48;i++){const t=i/48,u=1-t;
  const x=(3*u*u*t*Math.sin(angle)*190+3*u*t*t*side*range*.55+t*t*t*side*range*.65)*.7;
  const y=3*u*u*t*(-Math.cos(angle)*190)+3*u*t*t*(-range*.42)+t*t*t*(-range*.85);
  points.push({x:origin.x+x*Math.cos(heading)-y*Math.sin(heading),y:origin.y+x*Math.sin(heading)+y*Math.cos(heading)});
 }return points;
}
// Fan out first, then join at the same forward centre for every ray.
export function convergencePath(origin,heading,offset,range=650){
 const points=[],angle=offset/1.2*2.2,side=offset/1.2;
 for(let i=0;i<=48;i++){const t=i/48,u=1-t,x=(3*u*u*t*Math.sin(angle)*190+3*u*t*t*side*range*.8)*.7,y=3*u*u*t*(-Math.cos(angle)*190)+3*u*t*t*(-range*.42)+t*t*t*(-range*.85);points.push({x:origin.x+x*Math.cos(heading)-y*Math.sin(heading),y:origin.y+x*Math.sin(heading)+y*Math.cos(heading)});}
 return points;
}
export function stepDiffusion(game,shot,dt,segmentHit){
 const hitRadius=diffusionHitRadius(shot.radius);
 const w=game.weapon,old=shot.curveStep??0,next=Math.min(48,old+dt*48/.65);shot.curveStep=next;shot.struck??=new Set();
 const pointAt=n=>{const i=Math.min(47,Math.floor(n)),u=n-i;return {x:shot.path[i].x+(shot.path[i+1].x-shot.path[i].x)*u,y:shot.path[i].y+(shot.path[i+1].y-shot.path[i].y)*u};};
 const path=[pointAt(old)];for(let i=Math.floor(old)+1;i<next;i++)path.push(shot.path[i]);path.push(pointAt(next));
 const targets=[...game.hazards.filter(h=>['impact','obstacle'].includes(h.type)&&!game.destroyedRocks.has(h.id)).map(obstacle=>({obstacle})),...(game.enemies?.units??[]).filter(e=>e.hp>0).map(enemy=>({enemy}))];
 for(const target of targets){const object=target.enemy??target.obstacle,key=(target.enemy?'enemy:':'rock:')+object.id;if(shot.struck.has(key))continue;
  for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],t=target.enemy?enemySegmentHit(a,b,object,hitRadius):segmentHit(a,b,object.position,object.radius+hitRadius);if(t===null)continue;
   const point={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};shot.struck.add(key);w.hits++;
   if(target.enemy){w.lastHit={enemyId:object.id,...damageEnemy(game,object,shot.damage,point,hitRadius,'wave'),position:point};if(w.lastHit.destroyed&&shot.volley){shot.volley.kills++;if(shot.volley.kills>=2&&!shot.volley.notified){shot.volley.notified=true;w.diffusionMultiKills=(w.diffusionMultiKills??0)+1;}}}else{destroySpaceObject(game,object);w.lastHit={obstacleId:object.id,damage:shot.damage,position:point,destroyed:true};}
   w.effects.push({type:'hit',position:point,heading:shot.heading,stage:3,age:0});break;
  }
 }
 const visible=shot.path.slice(Math.max(0,Math.floor(next)-19),Math.floor(next)+1);visible.push(pointAt(next));
 w.effects=w.effects.filter(e=>e.shotId!==shot.id);w.effects.push({type:'beam',shotId:shot.id,path:visible,position:visible[0],end:pointAt(next),radius:shot.radius,heading:shot.heading,stage:3,converging:shot.converging,enhanced:shot.enhanced,age:0,duration:.24});shot.position=pointAt(next);if(next===48&&shot.converging&&!shot.volley.convergenceShown){shot.volley.convergenceShown=true;w.effects.push({type:'convergence',position:{...shot.position},heading:shot.heading,age:0,duration:.38});}return next<48;
}
