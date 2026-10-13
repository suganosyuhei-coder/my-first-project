import {shipCells,CELL_METERS} from './ship.js';
// Provisional balance, exposed in the development tuning panel.
export const FORCE={spreadDegrees:30,chargedDamage:2,chargedWidth:1.8,normalInterval:.8,normalRange:700,normalDuration:.65};
export function forceTuning(game){return {...FORCE,...game.tuning?.force};}

// Separate equipment: never enters the collection/interception bit pool.
export function createForce(equipped=true){return {equipped};}
export function forceGeometry(ship){
 const cells=shipCells(ship),xs=cells.map(c=>(c.x-5)*CELL_METERS),ys=cells.map(c=>(c.y-8)*CELL_METERS);
 const width=cells.length?Math.max(...xs)-Math.min(...xs)+CELL_METERS:CELL_METERS;
 const radius=width/2,front=cells.length?Math.min(...ys)-CELL_METERS/2:-42;
 const y=front-12-radius;
 return {width,radius,x:0,y,muzzleDistance:-y+radius+1};
}
export function weaponMuzzleDistance(game,fallback){const geometry=forceGeometry(game.ship);return game.force?.equipped?-geometry.y-geometry.radius*.5:fallback;}

export function forceRotationTime(elapsed,reducedMotion=false){return elapsed*(reducedMotion?.3:1);}
export function forceSpinTransform(elapsed,reducedMotion=false){return `rotate(${forceRotationTime(elapsed,reducedMotion)*2.4*180/Math.PI})`;}

// Axial rotation: all four rods stay behind the circular core.
export function forceRods(elapsed){
 return Array.from({length:4},(_,index)=>{
  const angle=elapsed*2.4+index*Math.PI/2,depth=Math.cos(angle);
  return {index,depth,x:Math.sin(angle)*.78,y:depth*.45,scale:.85+depth*.15};
 }).sort((a,b)=>a.depth-b.depth);
}
export function forceBody(game){
 if(!game.force?.equipped)return null;
 const g=forceGeometry(game.ship),f=game.flight;
 return {position:{x:f.position.x-Math.sin(f.heading)*g.y,y:f.position.y+Math.cos(f.heading)*g.y},radius:g.radius*.85};
}
