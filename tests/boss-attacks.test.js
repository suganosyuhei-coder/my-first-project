import {createEquippedGame} from './helpers/equippedGame.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {createGame} from '../src/prototype/game.js';import {stepEnemies} from '../src/prototype/enemies.js';import {launchBossAttack} from '../src/prototype/bossAttacks.js';
test('Force halves wide laser damage but allows it through',()=>{
 const losses=[];
 for(const force of [true,false]){const g=createEquippedGame({campaign:false,force});g.nebula.regions=[];g.bits=[];const hp=()=>[...g.ship.cells,...g.ship.parts].reduce((n,p)=>n+p.hp,0),before=hp();g.enemies.shots=[{kind:'bossLaser',position:{x:0,y:-300},heading:Math.PI,velocity:{x:0,y:0},radius:22,length:600,damage:20,remaining:1.2,hitCooldown:0}];stepEnemies(g,.1);losses.push(before-hp());assert.equal(g.enemies.shots[0].visibleEnd.y,300);if(force)assert.ok(g.enemies.shots[0].shieldPoint);}
 assert.ok(losses[0]>0);assert.ok(Math.abs(losses[0]*2-losses[1])<1e-7);

});
test('miniboss also alternates laser and two spread rows',()=>{const state={shots:[],nextShot:1},enemy={type:'miniboss',position:{x:0,y:0},heading:0},type={shootRange:520,damage:10,shotSpeed:110};launchBossAttack(state,enemy,type,1);assert.equal(state.shots[0].radius,14);state.shots=[];launchBossAttack(state,enemy,type,1);assert.equal(state.shots.length,22);assert.equal(new Set(state.shots.map(s=>Math.atan2(s.velocity.x,-s.velocity.y))).size,22);});

test('wide boss lasers deal 2.8 times damage while spread orbs keep their damage',()=>{
 for(const typeId of ['miniboss','finalBoss']){const state={shots:[],nextShot:1},enemy={parasiteRevealed:true,type:typeId,position:{x:0,y:0},heading:0},type={shootRange:700,damage:10,shotSpeed:110};launchBossAttack(state,enemy,type,1.5);assert.ok(Math.abs(state.shots[0].damage-42)<1e-10);state.shots=[];launchBossAttack(state,enemy,type,1.5);assert.equal(state.shots.length,typeId==='finalBoss'?27:22);assert.ok(state.shots.every(s=>s.damage===15));}
});
