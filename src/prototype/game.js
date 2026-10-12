import {createEnemies,stepEnemies,enemySnapshot} from './enemies.js';
import {nearbyPlanets,planetEnvironment,PLANET_FLOW} from './planetFlow.js';
import {flightScale} from './camera.js';
import {createBoost,stepBoost,decayBoost,boostTurnMultiplier} from './boost.js';
import {rockWarnings} from './targeting.js';
import {createNebula,updateNebula,environmentForFlight,stepNebulaContacts,stepNebulaObservation,requestAnalysis,nebulaSnapshot,NEBULA} from './nebula.js';
import {createFlight,stepFlight,initialParts,validatePlacement,partAt,shipStats} from './model.js';
import {createShip,shipCells,CELL_METERS} from './ship.js';
import {stepEnergy} from './energy.js';
import {createBits,requestCollection,stepCollection} from './collection.js';
import {initialResources,updateWorld} from './world.js';
import {createRailgun,stepRailgun,stepProjectiles,RAILGUN} from './railgun.js';
import {checkContacts} from './damage.js';
export const TUNING={minimumSpeed:12,maxSpeed:60,observation:140};
function equipment() {
 const parts=initialParts();parts.push({id:'railgun-0',type:'railgun',x:7,y:8});parts.push({id:'observer-0',type:'observer',x:7,y:4});
 for(const [x,y] of [[3,6],[3,7],[5,8],[6,4],[6,5],[6,6],[6,7],[6,10],[6,11],[6,12]])parts.push({id:`pipe-${x}-${y}`,type:'pipe',x,y});
 return parts;
}
export function createGame({seed=NEBULA.seed}={}) {
 const flight=createFlight(),ship=createShip(equipment());
 ship.parts.find(p=>p.type==='tank').stored=RAILGUN.initialStored;
 const game={flight,ship,enemies:createEnemies(),nebula:createNebula(seed),weapon:createRailgun(),boost:createBoost(),status:'running',bits:createBits(flight.position),resources:initialResources(),jobs:[],inventory:{wire:0,plate:0,tank:0,solar:0},nextJob:1,commands:[],viewport:{width:800,height:600,scale:flightScale()},energy:null,observation:0,notice:'資材をクリックしてビットへ指示。観測範囲内の素材は空きビットが自動回収します。',hazards:[],destroyedRocks:new Set(),warnedRocks:new Set(),rockAlerts:new Map(),contacts:new Set(),depleted:new Set(),discovered:new Set()};
 game.energy=stepEnergy(ship,0);game.observation=ship.parts.some(p=>p.type==='observer')?TUNING.observation:0;
 updateWorld(game);rockWarnings(game);updateNebula(game);return game;
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
 if(game.status!=='running'){stepRailgun(game,[],0);stepBoost(game,[],0);stepProjectiles(game,0);stepEnemies(game,0);game.commands.length=0;return game;}
 const commands=game.commands.splice(0);
 for(const command of commands.filter(c=>!['collect','analyze'].includes(c.type)))applyCommand(game,command);
 updateNebula(game);
 game.energy=stepEnergy(game.ship,dt,{...game.tuning?.energy,nebulaRate:game.nebula.field.density*(game.tuning?.environment.nebulaRecovery??NEBULA.recoveryPerDensity)});
 if(game.energy.overflow>0)game.notice=`タンク容量縮小：超過 ${game.energy.overflow.toFixed(1)} E を放出` ;
 stepRailgun(game,commands,dt);
 stepBoost(game,commands,dt);
 stepProjectiles(game,dt); // Instant beams resolve before this tick's rock contacts.
 updateNebula(game);
 const observers=game.ship.parts.filter(p=>p.type==='observer'&&game.energy.active[p.id]).length;
 game.baseObservation=observers?(game.tuning?.observation.radius??TUNING.observation)+(observers-1)*NEBULA.observerBonus:0;
 game.observation=game.baseObservation*game.nebula.field.visibility;
 const hullRadius=Math.max(50,...shipCells(game.ship).map(c=>Math.hypot((c.x-5)*CELL_METERS,(c.y-8)*CELL_METERS)+4));
 const environment=planetEnvironment(environmentForFlight(game.nebula.field,game.flight.heading,game.tuning?.environment.nebulaStrength??PLANET_FLOW.nebulaStrength),game.flight,nearbyPlanets(game.flight.position),hullRadius,game.tuning?.environment.planetStrength??PLANET_FLOW.strength,game.tuning?.environment.galaxyStrength??PLANET_FLOW.galaxyStrength);
 game.environment={hullRadius,planetId:environment.planetId||null,influence:environment.weight,controlFactor:environment.controlFactor,galaxyFlow:Math.hypot(environment.galaxyVelocity.x,environment.galaxyVelocity.y)};
 const engines=game.ship.parts.filter(p=>p.type==='engine'&&game.energy.active[p.id]).length;
 stepFlight(game.flight,steering,dt,Math.max(TUNING.minimumSpeed,Math.min(TUNING.maxSpeed,TUNING.minimumSpeed+engines*12)*(game.tuning?.ship.speedMultiplier??1)),environment,game.boost.velocity,(game.tuning?.ship.rotationRate??.32)*boostTurnMultiplier(game));
 decayBoost(game,dt);
 updateWorld(game);rockWarnings(game);updateNebula(game);
 game.observation=game.baseObservation*game.nebula.field.visibility;
 for(const command of commands.filter(c=>c.type==='analyze'))applyCommand(game,command);
 stepNebulaObservation(game,dt);
 stepNebulaContacts(game,dt);
 if(game.status!=='running'){stepEnemies(game,0);return game;}
 for(const resource of game.resources)if(Math.hypot(resource.position.x-game.flight.position.x,resource.position.y-game.flight.position.y)<=game.observation){resource.discovered=true;game.discovered.add(resource.id);}
 // Explicit clicks reserve both the target and bits before proximity automation.
 for(const command of commands.filter(c=>c.type==='collect'))applyCommand(game,command);
 for(const resource of game.resources.filter(r=>r.state==='available').sort((a,b)=>Math.hypot(a.position.x-game.flight.position.x,a.position.y-game.flight.position.y)-Math.hypot(b.position.x-game.flight.position.x,b.position.y-game.flight.position.y)))requestCollection(game,resource.id,'auto');
 checkContacts(game);
 if(game.status==='running')stepCollection(game,dt);
 stepEnemies(game,dt);
 if(game.status!=='running')stepRailgun(game,[],0);
 return game;
}
export function snapshot(game) {
 return {enemies:enemySnapshot(game.enemies),environment:game.environment,tuning:game.tuning,boost:{...game.boost,velocity:{...game.boost.velocity},lastBurst:game.boost.lastBurst?{...game.boost.lastBurst}:null},nebula:nebulaSnapshot(game.nebula,game),baseObservation:game.baseObservation??game.observation,weapon:{...game.weapon,projectiles:game.weapon.projectiles.map(p=>({...p,position:{...p.position}})),effects:game.weapon.effects.map(e=>({...e}))},flight:{...game.flight,position:{...game.flight.position}},ship:{...game.ship,cells:game.ship.cells.map(c=>({...c,appearance:{...c.appearance}})),parts:game.ship.parts.map(p=>({...p,appearance:{...p.appearance}})),critical:{...game.ship.critical}},stats:{...shipStats(game.ship.parts.filter(p=>p.hp>0)),thrust:game.ship.parts.filter(p=>p.type==='engine'&&game.energy.active[p.id]).length*12},energy:game.energy,observation:game.observation,bits:game.bits.map(b=>({...b,position:{...b.position}})),jobs:game.jobs.map(j=>({...j})),resources:game.resources.map(r=>({...r})),inventory:{...game.inventory},status:game.status,notice:game.notice,end:game.end};
}
