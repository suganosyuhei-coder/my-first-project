import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultTuning,validateTuning,readTuning,saveTuning,TUNING_KEY} from '../src/prototype/devTuning.js';
import {createGame,stepGame,snapshot} from '../src/prototype/game.js';
import {flightScale} from '../src/prototype/camera.js';
import {createFlight,stepFlight} from '../src/prototype/model.js';
import {updateNebula} from '../src/prototype/nebula.js';

test('settings round trip with version, strict numeric bounds, no unknown keys or partial data',()=>{
 const value=defaultTuning();assert.deepEqual(validateTuning(JSON.parse(JSON.stringify(value))),value);
 for(const n of [NaN,Infinity,'1',0,10]){const invalid=defaultTuning();invalid.camera.zoom=n;assert.throws(()=>validateTuning(invalid));}
 assert.throws(()=>validateTuning({...value,version:2}));assert.throws(()=>validateTuning({...value,extra:1}));
 const invalid=defaultTuning();delete invalid.ui.opacity;assert.throws(()=>validateTuning(invalid));
});
test('confirmed settings persist, corruption and denied storage safely use defaults',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)};
 const value=defaultTuning();value.camera.zoom=1.5;saveTuning(storage,value);assert.deepEqual(readTuning(storage).value,value);
 data.set(TUNING_KEY,'{bad');assert.deepEqual(readTuning(storage).value,defaultTuning());assert.ok(readTuning(storage).error);
 assert.throws(()=>saveTuning({setItem(){throw new Error('denied')}},value));
 assert.deepEqual(readTuning({getItem(){throw new Error('denied')}}).value,defaultTuning());
});
test('live movement and observation adjustments preserve voyage, craft and recovery data',()=>{
 const g=createGame();stepGame(g,0,.1);const position=g.flight.position,ship=g.ship,jobs=g.jobs,max=g.flight.maxDistance;
 g.tuning=defaultTuning();g.tuning.ship.speedMultiplier=2;g.tuning.observation.radius=280;
 stepGame(g,1,.1);assert.equal(g.flight.position,position);assert.equal(g.ship,ship);assert.ok(g.flight.maxDistance>max);assert.ok(g.flight.elapsed>.1);assert.equal(g.baseObservation,280);assert.ok(Math.hypot(g.flight.velocity.x,g.flight.velocity.y)>30);assert.ok(snapshot(g).tuning);assert.ok(Array.isArray(jobs));
 const a=createFlight(),b=createFlight();stepFlight(a,1,1,24,null,null,.1);stepFlight(b,1,1,24,null,null,.8);assert.ok(b.heading>a.heading*7);
});
test('display zoom does not change physical observation and density has no cumulative multiplication',()=>{
 const g=createGame();g.tuning=defaultTuning();const radius=g.observation,scale=flightScale(g.tuning);g.tuning.camera.zoom=1.5;assert.equal(flightScale(g.tuning),scale*1.5);assert.equal(g.observation,radius);
 updateNebula(g);const original=g.nebula.regions.map(r=>r.density);g.tuning.nebula.densityMultiplier=.5;updateNebula(g);assert.deepEqual(g.nebula.regions.map(r=>r.density),original.map(d=>d*.5));updateNebula(g);assert.deepEqual(g.nebula.regions.map(r=>r.density),original.map(d=>d*.5));
});
test('default adjustment settings keep existing simulation equivalent',()=>{
 const a=createGame(),b=createGame();b.tuning=defaultTuning();for(let i=0;i<20;i++){stepGame(a,.25,1/60);stepGame(b,.25,1/60);}assert.deepEqual(a.flight,b.flight);assert.equal(a.observation,b.observation);assert.deepEqual(a.inventory,b.inventory);
});
