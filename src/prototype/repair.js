import {occupiedCells} from './model.js';
export const REPAIR_SECONDS=2.2;
const same=(a,b)=>a.x===b.x&&a.y===b.y;
// Hidden old equipment must not be revived over a newly installed device.
export function repairFromMaterial(game,type){
 if(!['wire','plate'].includes(type))return [];
 return repairShip(game);
}
export function repairFromPickup(game,type){
 if(['tank','engine','railgun','solar','observer','missile'].includes(type))return repairShip(game,8,4);
 return repairFromMaterial(game,type);
}
export function repairShip(game,centerAmount=8,neighborAmount=5){
 if(game.status!=='running')return [];
 const ship=game.ship,live=ship.parts.filter(p=>p.hp>0),covered=point=>live.some(p=>occupiedCells(p).some(c=>same(c,point)));
 const eligible=ship.parts.filter(p=>p.hp>0||!occupiedCells(p).some(covered));
 const owners=[...ship.cells.filter(c=>!covered(c)),...eligible];
 const target=owners.filter(o=>o.hp<100).sort((a,b)=>a.hp-b.hp)[0];
 if(!target)return [];
 const center=target.lastDamageCell??target;
 const ownerAt=point=>eligible.find(p=>occupiedCells(p).some(c=>same(c,point)))??ship.cells.find(c=>same(c,point));
 const requests=new Map([[target,{point:center,amount:centerAmount}]]);
 for(const dy of [-1,1]){const point={x:center.x,y:center.y+dy},owner=ownerAt(point);if(owner&&!requests.has(owner))requests.set(owner,{point,amount:neighborAmount});}
 const effects=[];
 for(const [owner,{point,amount}] of requests){
  const before=owner.hp;owner.hp=Math.min(100,owner.hp+amount);const healed=owner.hp-before;if(healed<=0)continue;
  if(owner.role)ship.critical[owner.role]=Math.min(100,ship.critical[owner.role]+healed);
  effects.push({x:point.x,y:point.y,amount:healed,at:game.flight.elapsed});
 }
 if(effects.length){ship.revision++;game.repairEffects=[...(game.repairEffects??[]).filter(e=>game.flight.elapsed-e.at<REPAIR_SECONDS),...effects].slice(-30);}
 return effects;
}
