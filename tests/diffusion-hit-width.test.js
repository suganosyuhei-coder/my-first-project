import test from 'node:test';import assert from 'node:assert/strict';
import {createGame} from '../src/prototype/game.js';import {stepDiffusion,diffusionHitRadius,diffusionVisualRadius} from '../src/prototype/diffusion.js';import {segmentHit} from '../src/prototype/railgun.js';import {enemyType} from '../src/prototype/enemyCombat.js';
const beam=()=>({id:'width',stage:3,radius:1.5,damage:10,heading:0,position:{x:0,y:0},path:Array.from({length:49},(_,i)=>({x:0,y:-i*5}))});
test('diffusion hits enemies at the bright head edge, misses beyond it and damages once per ray',()=>{
 const g=createGame({campaign:false}),shot=beam(),radius=enemyType({type:'soldier'}).radius,hitRadius=diffusionHitRadius(shot.radius);assert.ok(Math.abs(diffusionVisualRadius(1.5)-2.1)<1e-8);assert.ok(hitRadius>8.8&&hitRadius<8.9);
 g.hazards=[];const near={id:'near',type:'soldier',hp:100,position:{x:radius+hitRadius-.1,y:-100}},far={id:'far',type:'soldier',hp:100,position:{x:radius+hitRadius+.1,y:-100}};g.enemies.units=[near,far];stepDiffusion(g,shot,.4,segmentHit);assert.equal(near.hp,90);assert.equal(far.hp,100);stepDiffusion(g,shot,.1,segmentHit);assert.equal(near.hp,90);assert.equal(shot.radius,1.5);
});
test('the widened head also hits rocks at its edge without extending collision to the full afterglow',()=>{
 const g=createGame({campaign:false}),shot=beam(),r=diffusionHitRadius(shot.radius);g.enemies.units=[];g.hazards=[{id:'near-rock',type:'impact',material:'rock',radius:2,position:{x:2+r-.1,y:-100}},{id:'far-rock',type:'impact',material:'rock',radius:2,position:{x:2+r+.1,y:-100}}];stepDiffusion(g,shot,.4,segmentHit);assert.ok(g.destroyedRocks.has('near-rock'));assert.ok(!g.destroyedRocks.has('far-rock'));
});
