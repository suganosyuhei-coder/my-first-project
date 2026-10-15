import {createEquippedGame} from './helpers/equippedGame.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,stepGame,applyCommand} from '../src/prototype/game.js';
import {stepBoost,BOOST} from '../src/prototype/boost.js';
import {stepEnergy} from '../src/prototype/energy.js';

test('initial single engine immediately unlocks level one and releases a capped boost without overcharging',()=>{
 const g=createEquippedGame();assert.equal(g.boost.enabled,true);assert.equal(g.boost.level,1);
 const tank=g.ship.parts.find(p=>p.type==='tank');tank.stored=160;
 stepBoost(g,[{type:'boost-press'}],3);assert.equal(g.boost.charge,.6);assert.equal(tank.stored,160);
 stepBoost(g,[{type:'boost-release',heading:Math.PI/2}],0);assert.equal(g.boost.bursts,1);assert.equal(g.boost.lastBurst.level,1);assert.equal(g.boost.lastBurst.cost,0);assert.ok(Math.abs(g.boost.lastBurst.impulse-79.2*1.05*1.05)<1e-9);assert.equal(tank.stored,160);assert.ok(g.boost.velocity.x>79);
 const time=g.flight.elapsed;stepGame(g,0,1/60);assert.ok(g.flight.elapsed>time);assert.ok(Math.hypot(g.flight.velocity.x,g.flight.velocity.y)>24);
});
test('second powered engine unlocks full output and loss of all engines cancels every boost',()=>{
 const g=createEquippedGame();applyCommand(g,{type:'place',partType:'engine',x:7,y:11,id:'extra'});g.energy=stepEnergy(g.ship,0);g.ship.parts.find(p=>p.type==='tank').stored=160;
 stepBoost(g,[{type:'boost-press'}],BOOST.chargeSeconds);assert.equal(g.boost.level,2);assert.equal(g.boost.charge,1);stepBoost(g,[{type:'boost-release'}],0);assert.equal(g.boost.lastBurst.impulse,132*1.05*1.1);
 for(const part of g.ship.parts.filter(p=>p.type==='engine'))part.hp=0;g.ship.revision++;g.energy=stepEnergy(g.ship,0);stepBoost(g,[],0);assert.equal(g.boost.enabled,true);assert.ok(g.boost.remaining>0);assert.ok(Math.hypot(g.boost.velocity.x,g.boost.velocity.y)>0);
});
test('level one still rejects energy shortage and short taps and resets on retry',()=>{
 const g=createEquippedGame();g.ship.parts.find(p=>p.type==='tank').stored=0;stepBoost(g,[{type:'boost-press'}],1);stepBoost(g,[{type:'boost-release'}],0);assert.equal(g.boost.bursts,1);assert.equal(g.boost.lastBurst.cost,0);
 g.ship.parts.find(p=>p.type==='tank').stored=40;stepBoost(g,[{type:'boost-press'},{type:'boost-release'}],0);assert.equal(g.boost.bursts,1);assert.equal(createEquippedGame().boost.level,1);
});
