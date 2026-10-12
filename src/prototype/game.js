import {createNebula,updateNebula,environmentForFlight,stepNebulaContacts,stepNebulaObservation,requestAnalysis,nebulaSnapshot,NEBULA} from './nebula.js';
import {createFlight,stepFlight,initialParts,validatePlacement,partAt,shipStats} from './model.js';
import {createShip} from './ship.js';
import {stepEnergy} from './energy.js';
import {createBits,requestCollection,stepCollection} from './collection.js';
import {initialResources,updateWorld} from './world.js';
import {createRailgun,stepRailgun,stepProjectiles,RAILGUN} from './railgun.js';
import {checkContacts} from './damage.js';
export const TUNING={minimumSpeed:12,maxSpeed:36,observation:140};
function equipment() {
 const parts=initialParts();parts.push({id:'railgun-0',type:'railgun',x:7,y:8});parts.push({id:'observer-0',type:'observer',x:7,y:4});
 for(const [x,y] of [[3,6],[3,7],[5,8],[6,4],[6,5],[6,6],[6,7],[6,10],[6,11],[6,12]])parts.push({id:`pipe-${x}-${y}`,type:'pipe',x,y});
 return parts;
}
export function createGame({seed=NEBULA.seed}={}) {
 const flight=createFlight(),ship=createShip(equipment());
 ship.parts.find(p=>p.type==='tank').stored=RAILGUN.initialStored;
 const game={flight,ship,nebula:createNebula(seed),weapon:createRailgun(),status:'running',bits:createBits(flight.position),resources:initialResources(),jobs:[],inventory:{wire:0,plate:0,tank:0,solar:0},nextJob:1,commands:[],viewport:{width:800,height:600,scale:1.55},energy:null,observation:0,notice:'資材をクリックしてビットへ指示。近距離は自動回収します。',hazards:[],contacts:new Set(),depleted:new Set(),discovered:new Set()};
 game.energy=stepEnergy(ship,0);game.observation=ship.parts.some(p=>p.type==='observer')?TUNING.observation:0;
 updateWorld(game);updateNebula(game);return game;
}
export function applyCommand(game,command) {
 if(game.status!=='running')return;
 if(command.type==='analyze'){const result=requestAnalysis(game,command.id);game.notice=result.reason;return;}
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
 if(game.status!=='running'){stepRailgun(game,[],0);stepProjectiles(game,0);game.commands.length=0;return game;}
 const commands=game.commands.splice(0);
 for(const command of commands.filter(c=>!['collect','analyze'].includes(c.type)))applyCommand(game,command);
 game.energy=stepEnergy(game.ship,dt);
 stepRailgun(game,commands,dt);
 updateNebula(game);
 const observers=game.ship.parts.filter(p=>p.type==='observer'&&game.energy.active[p.id]).length;
 game.baseObservation=observers?TUNING.observation+(observers-1)*NEBULA.observerBonus:0;
 game.observation=game.baseObservation*game.nebula.field.visibility;
 const engines=game.ship.parts.filter(p=>p.type==='engine'&&game.energy.active[p.id]).length;
 stepFlight(game.flight,steering,dt,Math.min(TUNING.maxSpeed,TUNING.minimumSpeed+engines*12),environmentForFlight(game.nebula.field,game.flight.heading));
 updateWorld(game);updateNebula(game);
 game.observation=game.baseObservation*game.nebula.field.visibility;
 for(const command of commands.filter(c=>c.type==='analyze'))applyCommand(game,command);
 stepNebulaObservation(game,dt);
 stepNebulaContacts(game,dt);
 if(game.status!=='running')return game;
 for(const resource of game.resources)if(Math.hypot(resource.position.x-game.flight.position.x,resource.position.y-game.flight.position.y)<=game.observation){resource.discovered=true;game.discovered.add(resource.id);}
 // Explicit clicks reserve both the target and bits before proximity automation.
 for(const command of commands.filter(c=>c.type==='collect'))applyCommand(game,command);
 for(const resource of game.resources.filter(r=>r.state==='available').sort((a,b)=>Math.hypot(a.position.x-game.flight.position.x,a.position.y-game.flight.position.y)-Math.hypot(b.position.x-game.flight.position.x,b.position.y-game.flight.position.y)))requestCollection(game,resource.id,'auto');
 checkContacts(game);
 if(game.status==='running')stepCollection(game,dt);
 stepProjectiles(game,dt);if(game.status!=='running')stepRailgun(game,[],0);
 return game;
}
export function snapshot(game) {
 return {nebula:nebulaSnapshot(game.nebula,game),baseObservation:game.baseObservation??game.observation,weapon:{...game.weapon,projectiles:game.weapon.projectiles.map(p=>({...p,position:{...p.position}})),effects:game.weapon.effects.map(e=>({...e}))},flight:{...game.flight,position:{...game.flight.position}},ship:{...game.ship,cells:game.ship.cells.map(c=>({...c,appearance:{...c.appearance}})),parts:game.ship.parts.map(p=>({...p,appearance:{...p.appearance}})),critical:{...game.ship.critical}},stats:{...shipStats(game.ship.parts.filter(p=>p.hp>0)),thrust:game.ship.parts.filter(p=>p.type==='engine'&&game.energy.active[p.id]).length*12},energy:game.energy,observation:game.observation,bits:game.bits.map(b=>({...b,position:{...b.position}})),jobs:game.jobs.map(j=>({...j})),resources:game.resources.map(r=>({...r})),inventory:{...game.inventory},status:game.status,notice:game.notice,end:game.end};
}
