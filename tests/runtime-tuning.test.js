import test from 'node:test';import assert from 'node:assert/strict';
import preset from '../src/prototype/productionTuning.json' with {type:'json'};
import {productionTuning,loadRuntimeTuning} from '../src/prototype/runtimeTuning.js';
import {validateTuning} from '../src/prototype/devTuning.js';
import {createGame,stepGame,snapshot} from '../src/prototype/game.js';
import {continueVoyage,finishVictory} from '../src/prototype/victory.js';
test('public tuning preserves every exported JSON value and fills old v1 omissions through the existing validator',()=>{
 const value=productionTuning();assert.deepEqual(value,validateTuning(preset));for(const [group,fields] of Object.entries(preset)){if(group==='version')continue;for(const [key,n] of Object.entries(fields))assert.equal(value[group][key],n);}
 assert.equal(value.ship.speedMultiplier,1.6);assert.equal(value.ship.visualScale,.9);assert.equal(value.ship.rotationRate,.31);assert.equal(value.observation.radius,115);assert.equal(value.nebula.dotMultiplier,.7);value.ship.speedMultiplier=2;assert.equal(productionTuning().ship.speedMultiplier,1.6);assert.deepEqual(loadRuntimeTuning(),productionTuning());
});
test('configured games use adopted movement, size and observation immediately, including the start guide',()=>{
 const base=createGame(),g=createGame({tuning:productionTuning()});assert.equal(g.observation,115);assert.equal(g.baseObservation,115);assert.equal(snapshot(g).tuning.ship.visualScale,.9);assert.ok(Math.abs(g.flight.velocity.y/base.flight.velocity.y-1.6)<1e-10);g.introduction=true;const initial=structuredClone(g.flight);stepGame(g,0,10);assert.deepEqual(g.flight,initial);assert.equal(g.observation,115);g.introduction=false;stepGame(g,0,1/60);assert.equal(g.baseObservation,115);assert.equal(g.tuning.ship.rotationRate,.31);
});
test('new voyages and boss continuation retain the adopted settings without altering the preset',()=>{
 const tuning=productionTuning(),g=createGame({tuning});g.campaign.units.find(e=>e.id==='final-boss').hp=0;finishVictory(g);continueVoyage(g);assert.equal(g.tuning,tuning);const retry=createGame({tuning});assert.equal(retry.tuning,tuning);assert.equal(retry.observation,115);assert.equal(retry.vital.value,80);assert.deepEqual(preset.ship,{speedMultiplier:1.6,rotationRate:.31,visualScale:.9});
});
