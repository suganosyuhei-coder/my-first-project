import test from 'node:test';import assert from 'node:assert/strict';
import {createGame,stepGame,snapshot} from '../src/prototype/game.js';import {stepVital,recoverVital} from '../src/prototype/vital.js';import {destroySpaceObject} from '../src/prototype/spaceLoot.js';import {createPilotController} from '../src/prototype/pilotExpressions.js';
test('vital starts at 80/100 and loses exactly one per whole simulated second',()=>{
 const g=createGame();assert.equal(g.vital.value,80);for(let i=0;i<59;i++)stepVital(g,1/60);assert.equal(g.vital.value,80);stepVital(g,1/60);assert.equal(g.vital.value,79);stepVital(g,2.5);assert.equal(g.vital.value,77);stepVital(g,.5);assert.equal(g.vital.value,76);assert.equal(g.status,'running');
});
test('pause and finished voyages freeze vital, recovery does not reset the drain phase',()=>{
 const g=createGame({campaign:false});g.paused=true;stepGame(g,0,2);assert.equal(g.vital.value,80);g.paused=false;stepVital(g,.8);recoverVital(g);stepVital(g,.2);assert.equal(g.vital.value,84);g.status='ended';stepVital(g,10);assert.equal(g.vital.value,84);assert.equal(recoverVital(g),0);
});
test('ice grants water and restores five vital once, caps at 100, and other objects do not restore vital',()=>{
 const g=createGame({campaign:false});g.hazards=[];const ice={id:'vital-ice',material:'ice',position:{x:200,y:0},radius:10};destroySpaceObject(g,ice);assert.equal(g.inventory.water,1);assert.equal(g.vital.value,85);assert.equal(g.vital.recoveries,1);destroySpaceObject(g,ice);assert.equal(g.inventory.water,1);assert.equal(g.vital.value,85);
 g.vital.value=98;destroySpaceObject(g,{...ice,id:'vital-ice-2'});assert.equal(g.vital.value,100);assert.equal(g.vital.lastRecovery.amount,2);const count=g.vital.recoveries;destroySpaceObject(g,{...ice,id:'vital-ice-3'});assert.equal(g.vital.recoveries,count);destroySpaceObject(g,{...ice,id:'rock-vital',material:'rock'});assert.equal(g.vital.value,100);assert.equal(createGame().vital.value,80);
 const t=snapshot(g);t.vital.lastRecovery.amount=99;assert.equal(g.vital.lastRecovery.amount,2);
});
test('zero vital ends the voyage and cancels combat, boost and collections without damaging the hull',()=>{
 const g=createGame({campaign:false});g.vital.value=1;g.weapon.holding=true;g.weapon.projectiles=[{id:'p'}];g.boost.holding=true;g.enemies.shots=[{id:'e'}];g.jobs=[{stage:'returning'}];g.flight.maxDistance=123;stepVital(g,1);assert.equal(g.status,'ended');assert.equal(g.end.reason,'vital');assert.equal(g.end.maxDistance,123);assert.equal(g.ship.critical.core,100);assert.equal(g.ship.critical.canopy,100);assert.equal(g.weapon.holding,false);assert.equal(g.boost.holding,false);assert.equal(g.weapon.projectiles.length,0);assert.equal(g.enemies.shots.length,0);assert.equal(g.jobs[0].stage,'cancelled');assert.ok(g.bits.every(b=>b.state==='disabled'));assert.deepEqual(g.flight.velocity,{x:0,y:0});assert.equal(recoverVital(g),0);
});
test('recovery selects relieved portrait and can wait until a damage reaction has finished',()=>{
 const g=createGame({campaign:false}),t=snapshot(g),select=createPilotController();t.flight.elapsed=10;select(t);t.ship.cells[0].hp-=10;t.flight.elapsed=11;const hurt=select(t);assert.equal(hurt.id,'damage');t.vital.recoveries++;t.flight.elapsed=11.1;assert.equal(select(t).id,'damage');t.flight.elapsed=hurt.until+.1;const relief=select(t);assert.equal(relief.id,'vitalRecovered');assert.equal(relief.expression,'relieved');
});
