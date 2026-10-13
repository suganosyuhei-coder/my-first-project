import {createEquippedGame} from './helpers/equippedGame.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/prototype/game.js';
import {stepBoost,decayBoost,cancelBoost} from '../src/prototype/boost.js';
import {stepRailgun} from '../src/prototype/railgun.js';
import {applyContact} from '../src/prototype/damage.js';
import {cellToWorld} from '../src/prototype/ship.js';
function chargeDash(g){stepBoost(g,[{type:'boost-press'}],.6);}
function fireWave(g,charge=.5){g.weapon.holding=true;g.weapon.charge=charge;g.weapon.heldSeconds=charge*2.4;stepRailgun(g,[{type:'weapon-release'}],0);}
function burst(charge=.5){const g=createEquippedGame();chargeDash(g);fireWave(g,charge);stepBoost(g,[{type:'boost-release'}],0);return g;}
test('a fired wave followed by a charged dash grants immunity only for the dash duration',()=>{
 for(const charge of [.5,.9,1.5])assert.equal(burst(charge).boost.subspace,true);
 const g=burst(),point=cellToWorld({x:5,y:9},g.flight);for(const type of ['enemyAttack','impact','heatContact'])applyContact(g,{type,position:point,damage:1000});assert.equal(g.ship.critical.core,100);assert.equal(g.status,'running');decayBoost(g,2);assert.equal(g.boost.subspace,false);applyContact(g,{type:'enemyAttack',position:point,damage:1000});assert.equal(g.status,'ended');
});
test('holding Space, normal shots and automatic fire cannot grant dive immunity',()=>{
 for(const mode of ['held','normal','auto']){const g=createEquippedGame();chargeDash(g);g.weapon.holding=true;g.weapon.charge=1.5;g.weapon.heldSeconds=3.6;
 if(mode==='normal'){g.weapon.charge=0;g.weapon.heldSeconds=.1;stepRailgun(g,[{type:'weapon-release'}],0);}
 if(mode==='auto')stepRailgun(g,[{type:'weapon-auto-toggle'}],.02);
 stepBoost(g,[{type:'boost-release'}],0);assert.equal(g.boost.subspace,false,mode);}
 assert.equal(createGame().boost.subspace,false);
});
test('the five-frame window includes the firing frame and expires without being refreshed by holding',()=>{
 for(const [frames,expected] of [[0,true],[1,true],[4,true],[5,false],[6,false]]){const g=createEquippedGame();chargeDash(g);fireWave(g);for(let i=0;i<frames;i++)stepRailgun(g,[],1/60);stepBoost(g,[{type:'boost-release'}],0);assert.equal(g.boost.subspace,expected,`${frames} elapsed frames`);}
});
test('one wave can trigger only one dive and a new wave is required for another',()=>{
 const g=burst();assert.equal(g.weapon.subspaceGrace,0);chargeDash(g);stepBoost(g,[{type:'boost-release'}],0);assert.equal(g.boost.subspace,false);chargeDash(g);fireWave(g);stepBoost(g,[{type:'boost-release'}],0);assert.equal(g.boost.subspace,true);cancelBoost(g.boost,true);assert.equal(g.boost.subspace,false);
});
test('custom grace works, cancellation and pause clear it, and too-short dash cannot activate it',()=>{
 const g=createEquippedGame();g.tuning={boost:{diveGraceFrames:18}};fireWave(g);assert.equal(g.weapon.subspaceGrace,.3);stepRailgun(g,[{type:'weapon-cancel'}],0);assert.equal(g.weapon.subspaceGrace,0);
 const h=createEquippedGame();fireWave(h);h.commands.push({type:'pause-toggle'});stepGame(h,0,1/60);assert.equal(h.weapon.subspaceGrace,0);
 const short=createEquippedGame();stepBoost(short,[{type:'boost-press'}],.1);fireWave(short);stepBoost(short,[{type:'boost-release'}],0);assert.equal(short.boost.subspace,false);
});
import {stepGame} from '../src/prototype/game.js';
import {defaultTuning} from '../src/prototype/devTuning.js';
test('dive grace tuning does not change ordinary speed, acceleration, turning, energy or physical size',()=>{
 const a=createEquippedGame({campaign:false}),b=createEquippedGame({campaign:false});for(const g of [a,b]){g.tuning=defaultTuning();g.tuning.ship.speedMultiplier=1.4;g.tuning.ship.visualScale=.75;g.tuning.boost.impulseMultiplier=2.1;g.tuning.boost.duration=1.7;g.hazards=[];g.enemies.units=[];}
 a.tuning.boost.diveGraceFrames=0;b.tuning.boost.diveGraceFrames=30;
 for(let i=0;i<50;i++){for(const g of [a,b]){if(i===1)g.commands.push({type:'boost-press'});if(i===30)g.commands.push({type:'boost-release'});stepGame(g,.3,1/60);}}
 assert.deepEqual(a.flight,b.flight);assert.deepEqual(a.boost,b.boost);assert.deepEqual(a.energy,b.energy);assert.deepEqual(a.ship,b.ship);
});
