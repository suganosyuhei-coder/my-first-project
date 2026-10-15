import {createEquippedGame} from './helpers/equippedGame.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,stepGame} from '../src/prototype/game.js';
import {requestCollection,stepCollection} from '../src/prototype/collection.js';
import {createShip,cellToWorld,worldToCell} from '../src/prototype/ship.js';
import {stepEnergy,ENERGY} from '../src/prototype/energy.js';
import {applyContact} from '../src/prototype/damage.js';
import {stepFlight} from '../src/prototype/model.js';
const runUntil=(g,predicate,max=3000)=>{for(let i=0;i<max&&!predicate();i++)stepGame(g,0,1/60);assert.ok(predicate(),'simulation condition did not complete');};
test('v0.7 initial supply powers observation and propulsion and charges storage',()=>{
 const g=createEquippedGame();stepGame(g,0,1/60);assert.equal(g.observation,140);assert.equal(g.energy.active['engine-0'],true);assert.ok(Math.hypot(g.flight.velocity.x,g.flight.velocity.y)>35&&Math.hypot(g.flight.velocity.x,g.flight.velocity.y)<36);assert.ok(g.energy.stored>0);
 assert.equal(new Set(g.ship.parts.map(p=>p.id)).size,g.ship.parts.length);
});
test('two-bit collection reserves atomically, survives leaving viewport, credits only after both returns',()=>{
 const g=createEquippedGame();g.viewport={width:1600,height:1200,scale:1.55};const r=g.resources.find(r=>r.id==='resource-tank');r.discovered=true;
 assert.equal(requestCollection(g,r.id).ok,true);assert.equal(requestCollection(g,r.id).ok,false);assert.equal(g.bits.filter(b=>b.state==='outbound').length,2);assert.equal(g.inventory.tank,0);
 const job=g.jobs[0];g.viewport.width=1;g.observation=0;g.ship.parts.find(p=>p.type==='observer').hp=0;g.ship.revision++;
 runUntil(g,()=>job.stage==='returning');assert.equal(g.inventory.tank,0);
 g.bits[0].arrived=true;g.bits[1].position={x:g.flight.position.x+200,y:g.flight.position.y};stepGame(g,0,1/60);
 assert.equal(g.bits[0].state,'returning');assert.equal(g.inventory.tank,0);assert.equal(requestCollection(g,'resource-plate').ok,false);
 runUntil(g,()=>job.stage==='complete');assert.equal(g.inventory.tank,0);assert.equal(job.credited,true);
 for(let i=0;i<20;i++)stepGame(g,0,1/60);assert.equal(g.inventory.tank,0);
});
test('single-bit jobs can run independently; clicked cooperative jobs beat same-tick automatic work',()=>{
 const g=createEquippedGame();g.resources=[{id:'a',type:'wire',position:{x:20,y:0},state:'available',discovered:true},{id:'b',type:'plate',position:{x:-20,y:0},state:'available',discovered:true}];
 assert.equal(requestCollection(g,'a').ok,true);assert.equal(requestCollection(g,'b').ok,true);assert.equal(g.jobs.length,2);assert.notEqual(g.jobs[0].bitIds[0],g.jobs[1].bitIds[0]);
 const h=createEquippedGame();h.resources=[{id:'near',type:'wire',position:{x:5,y:0},state:'available',discovered:true},{id:'coop',type:'tank',position:{x:50,y:0},state:'available',discovered:true}];h.commands.push({type:'collect',id:'coop'});stepGame(h,0,1/60);assert.equal(h.jobs.length,2);assert.equal(h.jobs[0].resourceId,'coop');
});
test('collection enforces start observation and screen bounds; vanished uncaptured cargo is not credited',()=>{
 const g=createEquippedGame();const r=g.resources[1];r.discovered=true;const oldPosition=r.position;r.position={x:300,y:0};g.viewport.width=100;assert.equal(requestCollection(g,r.id).ok,false);
 r.position=oldPosition;g.viewport.width=1000;g.observation=10;assert.equal(requestCollection(g,r.id).ok,false);
 g.observation=140;assert.equal(requestCollection(g,r.id).ok,true);r.state='vanished';const job=g.jobs[0];
 for(let i=0;i<1000&&job.stage!=='cancelled';i++)stepCollection(g,1/60);
 assert.equal(job.stage,'cancelled');assert.equal(g.inventory.plate,0);assert.ok(g.bits.every(b=>b.state==='orbiting'));
});
test('energy direct supply works without storage; priority protects observation and energy is conserved',()=>{
 const ship=createShip([{id:'s',type:'solar',x:0,y:0},{id:'p',type:'pipe',x:2,y:1},{id:'o',type:'observer',x:3,y:1},{id:'e1',type:'engine',x:2,y:2},{id:'e2',type:'engine',x:4,y:2},{id:'p2',type:'pipe',x:4,y:1}]);
 const power=stepEnergy(ship,1);assert.equal(power.active.o,true);assert.equal(power.active.e1,true);assert.equal(power.active.e2,false);assert.equal(power.status.e2,'供給不足');assert.equal(power.stored,0);assert.ok(power.consumption<=power.generation);
 const storage=createShip([{id:'s',type:'solar',x:0,y:0},{id:'p',type:'pipe',x:2,y:1},{id:'t',type:'tank',x:3,y:0}]);
 let state=stepEnergy(storage,5);assert.equal(state.stored,80);storage.parts=storage.parts.filter(p=>p.id!=='p');storage.revision++;state=stepEnergy(storage,5);assert.equal(state.stored,80);
 storage.parts.push({id:'p',type:'pipe',x:2,y:1,hp:100});storage.revision++;state=stepEnergy(storage,5);assert.equal(state.stored,160);
 state=stepEnergy(storage,100);assert.equal(state.stored,ENERGY.capacity);
});
test('alternative pipe route survives a cut; broken pipes and reconnection update supply',()=>{
 const ship=createShip([{id:'s',type:'solar',x:0,y:0},{id:'a',type:'pipe',x:2,y:0},{id:'b',type:'pipe',x:3,y:0},{id:'c',type:'pipe',x:2,y:2},{id:'d',type:'pipe',x:3,y:2},{id:'o',type:'observer',x:3,y:1}]);
 assert.equal(stepEnergy(ship,.1).active.o,true);ship.parts.find(p=>p.id==='a').hp=0;ship.revision++;assert.equal(stepEnergy(ship,.1).active.o,true);
 ship.parts.find(p=>p.id==='c').hp=0;ship.revision++;assert.equal(stepEnergy(ship,.1).active.o,false);
 ship.parts.find(p=>p.id==='c').hp=100;ship.revision++;assert.equal(stepEnergy(ship,.1).active.o,true);
});
test('empty energy maintains minimum flight; either critical part destruction stops and cancels jobs',()=>{
 for(const role of ['canopy','core']){
  const g=createEquippedGame({force:false});g.ship.parts=[];g.ship.revision++;stepGame(g,0,1/60);assert.ok(g.flight.velocity.x*Math.sin(g.flight.heading)-g.flight.velocity.y*Math.cos(g.flight.heading)>=12);assert.equal(g.status,'running');
  const r=g.resources[0];r.discovered=true;g.observation=140;requestCollection(g,r.id);assert.ok(g.jobs.length);
  const point=cellToWorld({x:5,y:role==='core'?9:4},g.flight);applyContact(g,{type:'impact',position:point,damage:125});
  assert.equal(g.status,'ended');assert.ok(g.jobs.every(j=>j.stage==='cancelled'));assert.equal(g.ship.critical[role],0);assert.equal(g.ship.critical[role==='core'?'canopy':'core'],100);
  const before=JSON.stringify(g.flight);for(let i=0;i<100;i++)stepGame(g,1,1/60);assert.equal(JSON.stringify(g.flight),before);assert.ok(Object.values(g.inventory).every(v=>v===0));
 }
});
test('appearance is contact-driven, independent from durability, with rotated cell mapping',()=>{
 const g=createEquippedGame(),before=JSON.stringify(g.ship);
 for(let i=0;i<600;i++)stepFlight(g.flight,0,1/60);assert.equal(JSON.stringify(g.ship),before);
 g.flight.heading=Math.PI/3;const point=cellToWorld({x:4,y:6},g.flight);assert.deepEqual(worldToCell(point,g.flight),{x:4,y:6});
 applyContact(g,{type:'dustContact',position:point,damage:0});const cell=g.ship.cells.find(c=>c.x===4&&c.y===6);assert.ok(cell.appearance.dust>0);assert.equal(cell.hp,100);
 applyContact(g,{type:'impact',position:point,damage:15});assert.equal(cell.hp,88.36);assert.ok(cell.appearance.scratch>0);assert.equal(g.ship.critical.canopy,100);
});
