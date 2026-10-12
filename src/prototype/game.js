import {createFlight,stepFlight,initialParts,validatePlacement,partAt,shipStats} from './model.js';
import {createShip} from './ship.js';
import {stepEnergy} from './energy.js';
import {createBits,requestCollection,stepCollection} from './collection.js';
import {initialResources,updateWorld} from './world.js';
import {checkContacts} from './damage.js';
export const TUNING={minimumSpeed:12,maxSpeed:36,observation:140};
function equipment() {
 const parts=initialParts();parts.push({id:'observer-0',type:'observer',x:7,y:4});
 for(const [x,y] of [[3,6],[3,7],[5,8],[6,4],[6,5],[6,6],[6,7],[6,10],[6,11],[6,12]])parts.push({id:`pipe-${x}-${y}`,type:'pipe',x,y});
 return parts;
}
export function createGame() {
 const flight=createFlight(),ship=createShip(equipment());
 const game={flight,ship,status:'running',bits:createBits(flight.position),resources:initialResources(),jobs:[],inventory:{wire:0,plate:0,tank:0,solar:0},nextJob:1,commands:[],viewport:{width:800,height:600,scale:1.55},energy:null,observation:0,notice:'資材をクリックしてビットへ指示。近距離は自動回収します。',hazards:[],contacts:new Set(),depleted:new Set(),discovered:new Set()};
 game.energy=stepEnergy(ship,0);game.observation=ship.parts.some(p=>p.type==='observer')?TUNING.observation:0;
 updateWorld(game);return game;
}
export function applyCommand(game,command) {
 if(game.status!=='running')return;
 if(command.type==='collect'){const result=requestCollection(game,command.id,'click');game.notice=result.reason;return;}
 if(command.type==='place'){
  const result=validatePlacement(game.ship.parts.filter(p=>p.hp>0),command.partType,command.x,command.y);
  if(!result.valid){game.notice=result.reason;return;}
  game.ship.parts.push({id:command.id,type:command.partType,x:command.x,y:command.y,hp:100,stored:0,appearance:{}});game.ship.revision++;game.notice='パーツを配置しました';
 }
 if(command.type==='remove'){
  const part=partAt(game.ship.parts,command.x,command.y);if(!part){game.notice='重要部分・船体は取り外せません';return;}
  game.ship.parts=game.ship.parts.filter(p=>p.id!==part.id);game.ship.revision++;game.notice='パーツを取り外しました';
 }
}
export function stepGame(game,steering,dt) {
 if(game.status!=='running')return game;
 const commands=game.commands.splice(0);
 for(const command of commands.filter(c=>c.type!=='collect'))applyCommand(game,command);
 game.energy=stepEnergy(game.ship,dt);
 game.observation=game.ship.parts.some(p=>p.type==='observer'&&game.energy.active[p.id])?TUNING.observation:0;
 const engines=game.ship.parts.filter(p=>p.type==='engine'&&game.energy.active[p.id]).length;
 stepFlight(game.flight,steering,dt,Math.min(TUNING.maxSpeed,TUNING.minimumSpeed+engines*12));
 updateWorld(game);
 for(const resource of game.resources)if(Math.hypot(resource.position.x-game.flight.position.x,resource.position.y-game.flight.position.y)<=game.observation){resource.discovered=true;game.discovered.add(resource.id);}
 // Explicit clicks reserve both the target and bits before proximity automation.
 for(const command of commands.filter(c=>c.type==='collect'))applyCommand(game,command);
 for(const resource of game.resources.filter(r=>r.state==='available').sort((a,b)=>Math.hypot(a.position.x-game.flight.position.x,a.position.y-game.flight.position.y)-Math.hypot(b.position.x-game.flight.position.x,b.position.y-game.flight.position.y)))requestCollection(game,resource.id,'auto');
 checkContacts(game);
 if(game.status==='running')stepCollection(game,dt);
 return game;
}
export function snapshot(game) {
 return {flight:{...game.flight,position:{...game.flight.position}},ship:{...game.ship,cells:game.ship.cells.map(c=>({...c,appearance:{...c.appearance}})),parts:game.ship.parts.map(p=>({...p,appearance:{...p.appearance}})),critical:{...game.ship.critical}},stats:{...shipStats(game.ship.parts.filter(p=>p.hp>0)),thrust:game.ship.parts.filter(p=>p.type==='engine'&&game.energy.active[p.id]).length*12},energy:game.energy,observation:game.observation,bits:game.bits.map(b=>({...b,position:{...b.position}})),jobs:game.jobs.map(j=>({...j})),resources:game.resources.map(r=>({...r})),inventory:{...game.inventory},status:game.status,notice:game.notice,end:game.end};
}
