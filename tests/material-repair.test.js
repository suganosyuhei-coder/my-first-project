import test from 'node:test';import assert from 'node:assert/strict';
import {createGame,snapshot} from '../src/prototype/game.js';import {repairFromMaterial} from '../src/prototype/repair.js';import {stepCollection} from '../src/prototype/collection.js';
const setup=()=>{const g=createGame({campaign:false,initialEquipment:false});g.ship.parts=[];return g;};
const cell=(g,x,y)=>g.ship.cells.find(c=>c.x===x&&c.y===y);
test('wire and plate repair the most damaged position by 8 and vertical neighbors by 5, capped at 100',()=>{
 for(const type of ['wire','plate']){const g=setup();cell(g,2,8).hp=10;cell(g,2,7).hp=98;cell(g,2,9).hp=30;cell(g,3,8).hp=50;const effects=repairFromMaterial(g,type);assert.equal(cell(g,2,8).hp,18);assert.equal(cell(g,2,7).hp,100);assert.equal(cell(g,2,9).hp,35);assert.equal(cell(g,3,8).hp,50);assert.deepEqual(effects.map(e=>e.amount),[8,2,5]);assert.equal(snapshot(g).repairEffects.length,3);g.flight.elapsed=2.3;assert.equal(snapshot(g).repairEffects.length,0);}
});
test('multi-cell equipment is repaired only once at its damaged cell and critical health stays synchronized',()=>{
 const g=createGame({campaign:false}),tank=g.ship.parts.find(p=>p.type==='tank');tank.hp=10;tank.lastDamageCell={x:4,y:9};repairFromMaterial(g,'wire');assert.equal(tank.hp,18);
 const h=setup(),core=cell(h,5,9);core.hp=40;h.ship.critical.core=40;repairFromMaterial(h,'plate');assert.equal(core.hp,48);assert.equal(h.ship.critical.core,48);
});
test('destroyed equipment may recover unless replacement occupies it; ended voyages and other parts cannot repair',()=>{
 const g=createGame({campaign:false}),tank=g.ship.parts.find(p=>p.type==='tank');tank.hp=0;repairFromMaterial(g,'wire');assert.equal(tank.hp,8);tank.hp=0;g.ship.parts.push({...tank,id:'replacement',hp:100});repairFromMaterial(g,'wire');assert.equal(tank.hp,0);
 const h=setup();cell(h,2,8).hp=20;repairFromMaterial(h,'tank');assert.equal(cell(h,2,8).hp,20);h.status='ended';repairFromMaterial(h,'wire');assert.equal(cell(h,2,8).hp,20);
});
test('material repairs only after cargo return, once per credited job',()=>{
 const g=setup();cell(g,2,8).hp=10;g.resources=[{id:'repair-wire',type:'wire',state:'captured',position:{x:0,y:0}}];g.jobs=[{id:'j',type:'wire',resourceId:'repair-wire',bitIds:[g.bits[0].id],cargo:true,credited:false,stage:'returning',startedAt:0}];g.bits[0].position={...g.flight.position};g.bits[0].state='returning';g.bits[0].jobId='j';stepCollection(g,.1);assert.equal(cell(g,2,8).hp,18);assert.equal(g.inventory.wire,1);stepCollection(g,.1);assert.equal(cell(g,2,8).hp,18);assert.deepEqual(snapshot(createGame()).repairEffects,[]);
});
import {stepForceContact} from '../src/prototype/forceContact.js';import {forceBody} from '../src/prototype/force.js';
test('Force pickup also repairs materials once, without waiting for a collection job',()=>{
 const g=setup();g.hazards=[];g.enemies.units=[];cell(g,2,8).hp=20;g.resources=[{id:'force-plate',type:'plate',state:'available',position:{...forceBody(g).position}}];stepForceContact(g);assert.equal(cell(g,2,8).hp,28);assert.equal(g.inventory.plate,1);stepForceContact(g);assert.equal(cell(g,2,8).hp,28);
});
