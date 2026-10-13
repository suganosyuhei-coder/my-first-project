import test from 'node:test';import assert from 'node:assert/strict';
import {createGame,snapshot} from '../src/prototype/game.js';
import {damageEnemy,enemyType,enemyWeakpoint} from '../src/prototype/enemyCombat.js';
import {bossMouth,bossParasite,bossTentacleTips,bossTailLocal} from '../src/prototype/enemyAnatomy.js';
import {launchBossAttack} from '../src/prototype/bossAttacks.js';
import {enemyBodies,enemySegmentHit} from '../src/prototype/enemyBodies.js';
test('parasite is concealed for two hits, emerges on third real damage, then only the abdominal face gets weakpoint damage',()=>{
 const g=createGame(),e=g.campaign.units.find(e=>e.id==='final-boss');e.heading=.4;const belly=bossParasite(e);assert.equal(enemyWeakpoint(e),null);
 damageEnemy(g,e,0,belly.position);assert.equal(e.parasiteHits,undefined);
 for(let i=1;i<=2;i++){assert.equal(damageEnemy(g,e,10,belly.position).damage,2);assert.equal(e.parasiteHits,i);assert.equal(enemyWeakpoint(e),null);}
 g.flight.elapsed=10;damageEnemy(g,e,10,belly.position);assert.equal(e.parasiteRevealed,true);assert.equal(e.parasiteRevealedAt,10);assert.deepEqual(enemyWeakpoint(e),belly);assert.equal(snapshot(g).campaign.boss.parasiteRevealed,true);
 assert.equal(damageEnemy(g,e,10,belly.position).damage,36);assert.equal(damageEnemy(g,e,10,bossMouth(e)).damage,2);
});
test('hidden boss fires seven mouth directions and four bit pods; revealed parasite fires three warned long thick lasers',()=>{
 const g=createGame(),e=g.campaign.units.find(e=>e.id==='final-boss'),type=enemyType(e),state={time:3,shots:[],nextShot:1};e.heading=.8;e.attackHeading=.2;launchBossAttack(state,e,type,1);assert.equal(state.shots.filter(s=>s.kind==='bossLaser').length,0);const mouth=state.shots.filter(s=>s.mouth);assert.equal(mouth.length,7);assert.equal(new Set(mouth.map(s=>Math.atan2(s.velocity.x,-s.velocity.y))).size,7);for(const s of mouth)assert.deepEqual(s.position,bossMouth(e));const tips=bossTentacleTips(e,3);for(const s of state.shots.filter(s=>s.tentacle!==undefined))assert.deepEqual(s.position,tips[s.tentacle]);
 e.parasiteRevealed=true;e.attackCycle=0;state.shots=[];launchBossAttack(state,e,type,1);const lasers=state.shots.filter(s=>s.kind==='bossLaser');assert.equal(lasers.length,3);assert.equal(new Set(lasers.map(s=>s.heading)).size,3);for(const s of lasers){assert.deepEqual(s.position,bossParasite(e).position);assert.equal(s.length,1150);assert.equal(s.radius,22);assert.ok(Math.abs(s.damage-type.damage*2.8)<1e-8);}assert.equal(state.shots.filter(s=>s.mouth).length,7);
});
test('long tail and oversized head share real collision bodies while weakpoint stays on the torso',()=>{
 const g=createGame(),e=g.campaign.units.find(e=>e.id==='final-boss');e.heading=0;e.bodyTime=2;const body=enemyBodies(e);assert.ok(body.length>15);assert.ok(Math.max(...bossTailLocal(2).map(p=>p.y))>200);for(const shape of [body[0],body.at(-1)])assert.equal(enemySegmentHit(shape.position,shape.position,e),0);
});

import {weakpointFeedback} from '../src/prototype/WeakpointFeedback.js';
import {drawGiantFaceBoss} from '../src/prototype/GiantFaceBoss.js';
import {drawCentipede,drawScorpion} from '../src/prototype/OrganicEnemyVisuals.js';
test('only real exposed weakpoint damage starts a small short-lived hit flash, without changing damage',()=>{
 const g=createGame(),e=g.campaign.units.find(e=>e.id==='final-boss'),belly=bossParasite(e);g.flight.elapsed=10;damageEnemy(g,e,10,belly.position);assert.equal(weakpointFeedback(e,10),null);e.parasiteRevealed=true;damageEnemy(g,e,10,bossMouth(e));assert.equal(weakpointFeedback(e,10),null);damageEnemy(g,e,0,belly.position);assert.equal(weakpointFeedback(e,10),null);const hit=damageEnemy(g,e,10,belly.position);assert.equal(hit.damage,36);assert.equal(e.weakHitSequence,1);assert.ok(weakpointFeedback(e,10).alpha>0);assert.ok(weakpointFeedback(e,10.16).alpha<weakpointFeedback(e,10).alpha);assert.equal(weakpointFeedback(e,10.33),null);
});
test('symbolic boss, centipede and scorpion retain identical anatomy across animation time',()=>{
 const record=(draw,time)=>{const log=[],ctx=new Proxy({}, {get:(_,key)=>(...args)=>log.push([key,...args]),set:(_,key,value)=>{log.push([key,value]);return true;}});draw(ctx,time);return log;};
 for(const draw of [(c,t)=>drawGiantFaceBoss(c,85,t,{parasiteRevealed:true}),(c,t)=>drawCentipede(c,1,t),(c,t)=>drawScorpion(c,24,t)])assert.deepEqual(record(draw,0),record(draw,30));
});
