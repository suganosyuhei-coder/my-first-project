import {shipCells,cellToWorld} from './ship.js';
import {grantPart,LOOT_PARTS} from './spaceLoot.js';
import {recoverVital} from './vital.js';
// One supply robot per 5 km band, versus one normal PAW per 1 km band.
export const SUPPLY_PAW={spacing:5000,radius:14,water:1,vital:8,speed:8};
export const createSupplyPaws=()=>({units:[],supplied:new Set(),effects:[],lastReceipt:null});
export function supplyPawHome(index,seed=7309){return {x:Math.sin(index*2.71+seed*.013)*160,y:index*SUPPLY_PAW.spacing+SUPPLY_PAW.spacing/2+Math.sin(index*1.37+seed*.017)*400};}
export function deliverSupply(game,unit){
 const state=game.supplyPaws;
 if(!state||game.status!=='running'||game.paused||state.supplied.has(unit.id))return false;
 state.supplied.add(unit.id);
 const type=LOOT_PARTS[((unit.index%LOOT_PARTS.length)+LOOT_PARTS.length)%LOOT_PARTS.length],before=game.repairEffects??[],part=grantPart(game,type),repairs=(game.repairEffects??[]).filter(e=>!before.includes(e));
 game.inventory.water=(game.inventory.water??0)+SUPPLY_PAW.water;const recovered=recoverVital(game,SUPPLY_PAW.vital);
 const count=game.ship.parts.filter(p=>p.type===type&&p.hp>0).length;
 game.equipmentPickup={source:'supply',sequence:(game.equipmentPickup?.sequence??0)+1,type,partId:part?.id??null,x:part?.x,y:part?.y,count,installed:!!part,at:game.flight.elapsed};
 state.lastReceipt={sequence:(state.lastReceipt?.sequence??0)+1,at:game.flight.elapsed,partType:type,installed:!!part,vitalRecovered:recovered,repairCount:repairs.length,position:{...unit.position}};
 state.effects.push({position:{...unit.position},at:game.flight.elapsed});
 game.notice=`補給PAW：パーツ＋1・水＋1 / VITAL＋${recovered}`+(repairs.length?' / 船体を修復しました':'');return true;
}
export function stepSupplyPaws(game,dt){
 if(game.status!=='running'||game.paused)return;
 const state=game.supplyPaws??=createSupplyPaws(),band=Math.floor(game.flight.position.y/SUPPLY_PAW.spacing),units=[];
 for(let index=band-1;index<=band+1;index++){
  const id=`supply-paw-${game.nebula.seed}-${index}`;if(state.supplied.has(id))continue;
  const home=supplyPawHome(index,game.nebula.seed),previous=state.units.find(u=>u.id===id),position=previous?{...previous.position}:{...home};
  const dx=game.flight.position.x-position.x,dy=game.flight.position.y-position.y,distance=Math.hypot(dx,dy),move=Math.min(Math.max(0,dt)*SUPPLY_PAW.speed,distance);
  if(distance>0){position.x+=dx/distance*move;position.y+=dy/distance*move;}
  if(Math.hypot(position.x-game.flight.position.x,position.y-game.flight.position.y)>game.viewport.height/game.viewport.scale+400)continue;
  units.push({id,index,position,radius:SUPPLY_PAW.radius,variant:'green'});
 }
 const cells=shipCells(game.ship).map(c=>cellToWorld(c,game.flight));
 for(const unit of units)if(cells.some(p=>Math.hypot(p.x-unit.position.x,p.y-unit.position.y)<=unit.radius+3))deliverSupply(game,unit);
 state.units=units.filter(u=>!state.supplied.has(u.id));state.effects=state.effects.filter(e=>game.flight.elapsed-e.at<1);
}
export function supplyPawSnapshot(state){return {units:state.units.map(u=>({...u,position:{...u.position}})),suppliedCount:state.supplied.size,lastReceipt:state.lastReceipt?{...state.lastReceipt,position:{...state.lastReceipt.position}}:null};}
