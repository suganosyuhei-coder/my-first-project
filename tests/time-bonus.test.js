import test from 'node:test';import assert from 'node:assert/strict';
import {timeBonus,finishVictory} from '../src/prototype/victory.js';import {createGame,stepGame,snapshot} from '../src/prototype/game.js';
test('time bonus is bounded at 20000, decreases by 20 per second and never becomes negative',()=>{
 for(const [seconds,points] of [[0,20000],[1,19980],[300,14000],[600,8000],[999.9,2],[1000,0],[5000,0],[-1,20000]])assert.equal(timeBonus(seconds),points);
});
test('final boss death awards time bonus exactly once and exposes result breakdown',()=>{
 const g=createGame();g.score=10500;g.flight.elapsed=300;g.campaign.units.find(e=>e.id==='final-boss').hp=0;assert.equal(finishVictory(g),true);assert.equal(g.score,24500);assert.equal(g.end.timeBonus,14000);assert.equal(g.end.baseScore,10500);assert.equal(snapshot(g).end.clearSeconds,300);assert.equal(finishVictory(g),false);assert.equal(g.score,24500);assert.equal(createGame().score,0);
});
test('pause time does not decrease bonus, and ordinary game over awards no bonus',()=>{
 const g=createGame();g.flight.elapsed=120;g.commands.push({type:'pause-toggle'});stepGame(g,0,1/60);stepGame(g,0,30);assert.equal(g.flight.elapsed,120);g.campaign.units.find(e=>e.id==='final-boss').hp=0;finishVictory(g);assert.equal(g.end.timeBonus,17600);
 const h=createGame();h.status='ended';h.score=500;h.campaign.units.find(e=>e.id==='final-boss').hp=0;assert.equal(finishVictory(h),false);assert.equal(h.score,500);
});
