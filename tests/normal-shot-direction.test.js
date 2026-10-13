import test from 'node:test';import assert from 'node:assert/strict';import {createGame} from '../src/prototype/game.js';import {stepRailgun,stepProjectiles,RAILGUN} from '../src/prototype/railgun.js';
const fire=heading=>{const g=createGame({campaign:false,force:false});g.hazards=[];g.enemies.units=[];stepRailgun(g,[{type:'weapon-press'}],0);stepRailgun(g,[{type:'weapon-release',heading}],0);return g;};
test('normal shots travel 1.25 times faster only toward the bottom half of the world/screen',()=>{
 for(const [heading,factor] of [[0,1],[Math.PI/2,1],[Math.PI,1.25],[Math.PI*.75,1.25],[-Math.PI*.75,1.25]]){const g=fire(heading),s=g.weapon.projectiles[0];assert.equal(s.stage,0);assert.ok(Math.abs(Math.hypot(s.velocity.x,s.velocity.y)-900*factor)<1e-8);assert.equal(s.remaining,588);}
 const g=fire(Math.PI);stepProjectiles(g,.1);assert.ok(Math.abs(g.weapon.projectiles[0].position.y-g.weapon.projectiles[0].origin.y-112.5)<1e-8);
});
test('normal shots can hit beyond the previous 420m range but cannot hit past the new 588m range',()=>{
 for(const [reach,hit] of [[550,true],[650,false]]){const g=fire(0),s=g.weapon.projectiles[0],enemy={id:'target',type:'commander',hp:1000,position:{x:s.origin.x,y:s.origin.y-reach},heading:0};g.enemies.units=[enemy];for(let i=0;i<120&&g.weapon.projectiles.length;i++)stepProjectiles(g,1/60);assert.equal(enemy.hp<1000,hit);assert.equal(g.weapon.projectiles.length,0);}
 assert.deepEqual(RAILGUN.ranges.slice(1),[560,700,650]);
});
