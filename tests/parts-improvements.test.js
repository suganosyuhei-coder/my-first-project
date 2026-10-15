import {createEquippedGame} from './helpers/equippedGame.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createShip} from '../src/prototype/ship.js';
import {ENERGY,stepEnergy,supplyGraph,tankCapacity,connectionPorts} from '../src/prototype/energy.js';
import {pipeConnectionMask} from '../src/prototype/model.js';
import {createGame,stepGame,applyCommand,snapshot} from '../src/prototype/game.js';
import {stepBoost,BOOST} from '../src/prototype/boost.js';
import {stepRailgun,RAILGUN} from '../src/prototype/railgun.js';
import {defaultTuning,validateTuning} from '../src/prototype/devTuning.js';
import {PILOT_ACTIONS,PILOT_EXPRESSIONS,createPilotController} from '../src/prototype/pilotExpressions.js';

function manifold(){return createShip([{id:'a',type:'tank',x:0,y:0},{id:'b',type:'tank',x:2,y:0},{id:'p',type:'pipe',x:0,y:2},{id:'s',type:'solar',x:0,y:3},{id:'q',type:'pipe',x:2,y:2},{id:'e',type:'engine',x:3,y:2}]);}
function liveStep(g,seconds){for(let t=0;t<seconds-1e-9;t+=1/60)stepGame(g,0,1/60);}

test('side-adjacent tanks get one bounded capacity bonus and supply via their shared manifold',()=>{
 const s=manifold(),state=stepEnergy(s,1);assert.equal(state.capacity,400);assert.equal(state.tanks.a.linked,true);assert.equal(state.tanks.b.linked,true);assert.equal(state.active.e,true);assert.equal(state.stored,8.16);assert.equal(state.generation,16);assert.equal(state.consumption,7.84);
 assert.ok(supplyGraph(s.parts).some(c=>['a','b','s','e'].every(id=>c.some(p=>p.id===id))));
 const corner=createShip([{id:'a',type:'tank',x:0,y:0},{id:'b',type:'tank',x:2,y:2}]);assert.equal(stepEnergy(corner,1).capacity,320);
 s.parts.push({id:'c',type:'tank',x:4,y:0,hp:100,stored:0});s.revision++;assert.equal(tankCapacity(s.parts[1],s.parts).capacity,200);
});
test('tank disconnection or destruction restores capacity, releases only overflow and never creates energy',()=>{
 const s=manifold();s.parts.filter(p=>p.type==='tank').forEach(p=>p.stored=195);stepEnergy(s,0);s.parts=s.parts.filter(p=>p.id!=='b');s.revision++;const state=stepEnergy(s,0);assert.equal(state.tanks.a.linked,false);assert.equal(state.capacity,160);assert.equal(state.stored,160);assert.equal(state.overflow,35);
 const t=manifold();t.parts[1].hp=0;t.revision++;assert.equal(stepEnergy(t,0).capacity,160);assert.equal(stepEnergy(t,0).stored,0);
 const r=manifold();const result=stepEnergy(r,0,{tankLinkBonus:.5});assert.equal(result.capacity,480);assert.equal(result.stored,0);
});
test('pipe endpoints include all valid device ports; cuts and damaged parts remove real supply',()=>{
 const s=manifold();assert.equal(pipeConnectionMask(s.parts,0,2),5);assert.ok(connectionPorts(s.parts.find(p=>p.id==='s'),s.parts).some(p=>p.dy===-1));assert.equal(stepEnergy(s,1).active.e,true);
 s.parts.find(p=>p.id==='q').hp=0;s.revision++;assert.equal(pipeConnectionMask(s.parts,2,2),3); // neighbors remain visible, own damaged pipe is not drawn
 assert.equal(stepEnergy(s,1).active.e,false);assert.equal(stepEnergy(s,0).active.e,false);assert.equal(stepEnergy(s,1).status.e,'未接続');
 s.parts.find(p=>p.id==='q').hp=100;s.revision++;assert.equal(stepEnergy(s,1).active.e,true);
});
test('additional connected solar generation scales, replenishes shot energy during movement, and permits another max shot',()=>{
 const g=createEquippedGame();g.bits=[];g.ship.parts.find(p=>p.type==='tank').stored=40;
 stepRailgun(g,[{type:'weapon-press'}],RAILGUN.maxChargeSeconds);stepRailgun(g,[{type:'weapon-release'}],0);assert.equal(g.weapon.lastShot.stage,3);g.weapon.projectiles=[];
 const elapsed=g.flight.elapsed,position={...g.flight.position};applyCommand(g,{type:'place',partType:'solar',x:0,y:8,id:'solar-extra'});applyCommand(g,{type:'place',partType:'pipe',x:2,y:8,id:'solar-port'});
 liveStep(g,2);assert.equal(g.energy.generation,33.6);assert.ok(g.flight.elapsed>elapsed);assert.notDeepEqual(g.flight.position,position);assert.ok(g.energy.stored>=32);
 stepRailgun(g,[{type:'weapon-press'}],RAILGUN.maxChargeSeconds);stepRailgun(g,[{type:'weapon-release'}],0);assert.equal(g.weapon.lastShot.stage,3);assert.equal(g.weapon.shots,2);
 const isolated=createShip([{id:'s',type:'solar',x:0,y:0},{id:'t',type:'tank',x:5,y:5}]);assert.equal(stepEnergy(isolated,5).stored,0);
});
test('added powered engines change thrust and travel, loss of supply keeps only minimum flight',()=>{
 const g=createEquippedGame();applyCommand(g,{type:'place',partType:'engine',x:7,y:11,id:'extra'});g.ship.parts.find(p=>p.type==='tank').stored=160;stepGame(g,0,1/60);assert.equal(g.energy.active.extra,true);assert.ok(Math.abs(snapshot(g).stats.thrust-13.2)<1e-9);assert.ok(Math.hypot(g.flight.velocity.x,g.flight.velocity.y)>34);
 applyCommand(g,{type:'remove',x:6,y:11});stepGame(g,0,1/60);assert.equal(g.energy.active.extra,false);assert.equal(snapshot(g).stats.thrust,13.200000000000001);assert.ok(Math.hypot(g.flight.velocity.x,g.flight.velocity.y)>=12);
});
test('boost tuning increases actual impulse without extra energy, retains eligibility and resets',()=>{
 const g=createEquippedGame();applyCommand(g,{type:'place',partType:'engine',x:7,y:11,id:'extra'});g.ship.parts.find(p=>p.type==='tank').stored=160;g.energy=stepEnergy(g.ship,1/60);
 stepBoost(g,[{type:'boost-press'}],BOOST.chargeSeconds);stepBoost(g,[{type:'boost-release'}],0);assert.equal(g.boost.lastBurst.impulse,132*1.05*1.1);assert.equal(g.boost.lastBurst.cost,0);
 const h=createEquippedGame();h.tuning=defaultTuning();h.tuning.boost.impulseMultiplier=2;h.tuning.boost.duration=1.5;applyCommand(h,{type:'place',partType:'engine',x:7,y:11,id:'extra'});h.ship.parts.find(p=>p.type==='tank').stored=160;h.energy=stepEnergy(h.ship,1/60);stepBoost(h,[{type:'boost-press'}],BOOST.chargeSeconds);stepBoost(h,[{type:'boost-release'}],0);assert.equal(h.boost.lastBurst.impulse,160*1.05*1.1);assert.equal(h.boost.remaining,1.5);assert.equal(h.boost.lastBurst.cost,0);
});
test('previous v1 JSON settings migrate without losing adjusted values; invalid new values reject',()=>{
 const old=defaultTuning();delete old.energy;delete old.boost;old.camera.zoom=1.4;const migrated=validateTuning(old);assert.equal(migrated.camera.zoom,1.4);assert.equal(migrated.boost.impulseMultiplier,1.65);assert.equal(migrated.energy.generation,16);migrated.boost.duration=99;assert.throws(()=>validateTuning(migrated));
});
test('pilot JSON supplies poses, priority, conditions and dialogue; a custom known condition is usable',()=>{
 for(const a of PILOT_ACTIONS){assert.ok(PILOT_EXPRESSIONS[a.expression]);assert.equal(typeof a.line,'string');assert.ok(a.line.length);assert.equal(typeof a.condition,'string');}
 const select=createPilotController([{id:'new-speech',condition:'charging',expression:'thinking',line:'準備中'}]);const t=snapshot(createEquippedGame());t.weapon.holding=true;assert.equal(select(t).line,'準備中');assert.equal(select(t).expression,'thinking');
});
