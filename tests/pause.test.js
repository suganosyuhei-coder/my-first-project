import {createEquippedGame} from './helpers/equippedGame.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {createGame,stepGame,applyCommand} from '../src/prototype/game.js';
test('pause freezes all simulation state, rejects crafting and resumes without elapsed catchup',()=>{
 const g=createEquippedGame();g.commands.push({type:'pause-toggle'});stepGame(g,0,1/60);assert.equal(g.paused,true);const before=JSON.stringify(g);for(let i=0;i<120;i++)stepGame(g,1,1/60);assert.equal(JSON.stringify(g),before);applyCommand(g,{type:'remove',x:3,y:6});assert.equal(JSON.stringify(g),before);g.commands.push({type:'pause-toggle'});stepGame(g,0,1/60);assert.equal(g.paused,false);const elapsed=g.flight.elapsed;stepGame(g,0,1/60);assert.equal(g.flight.elapsed,elapsed+1/60);
});
test('pausing cancels held charges without firing and preserves launched projectiles',()=>{const g=createEquippedGame();g.weapon.holding=true;g.weapon.charge=.5;g.boost.holding=true;g.weapon.projectiles=[{id:'existing',position:{x:0,y:0}}];g.commands.push({type:'pause-toggle'},{type:'weapon-release'});stepGame(g,0,.1);assert.equal(g.weapon.holding,false);assert.equal(g.boost.holding,false);assert.equal(g.weapon.shots,0);assert.equal(g.weapon.projectiles.length,1);});
test('ended games cannot be paused or resumed',()=>{const g=createEquippedGame();g.status='ended';g.commands.push({type:'pause-toggle'});stepGame(g,0,0);assert.equal(g.paused,false);assert.equal(g.status,'ended');});
