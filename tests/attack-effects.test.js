import {createEquippedGame} from './helpers/equippedGame.js';
import test from 'node:test';import assert from 'node:assert/strict';
import {createGame} from '../src/prototype/game.js';
import {stepRailgun,stepProjectiles} from '../src/prototype/railgun.js';
import {damageEnemy} from '../src/prototype/enemyCombat.js';
test('uncharged repeated shots stay bullets; 0.4 second hold is required for a wave',()=>{
 for(const force of [false,true])for(const seconds of [0,.001,.12,.39,.4,.41,1]){
 const g=createEquippedGame({force,campaign:false});g.bits=[];g.hazards=[];g.ship.parts.find(p=>p.type==='tank').stored=160;
 stepRailgun(g,[{type:'weapon-press'}],seconds);stepRailgun(g,[{type:'weapon-release'}],0);
 assert.equal(g.weapon.projectiles[0].stage,seconds>=.4?1:0);
 if(seconds>=.4){stepProjectiles(g,0);assert.ok(g.weapon.effects.some(e=>e.type==='beam'&&e.duration===1.4));}
 else{stepRailgun(g,[{type:'weapon-press'},{type:'weapon-release'}],0);assert.ok(g.weapon.projectiles.every(s=>s.stage===0));}
 }
});
test('lethal attack determines death effect once, independently of prior damage',()=>{
 for(const source of ['normal','wave','force','bit']){const g=createEquippedGame({campaign:false}),e={type:'soldier',hp:10,position:{x:0,y:0},heading:0};damageEnemy(g,e,1,e.position,0,'normal');damageEnemy(g,e,100,e.position,0,source);damageEnemy(g,e,100,e.position,0,'normal');assert.equal(g.enemies.debris.length,1);assert.equal(g.enemies.debris[0].source,source);}
});
test('projectile kills distinguish ordinary, wave and bit support fire',()=>{
 for(const source of ['normal','wave','bit']){const g=createEquippedGame({campaign:false});g.hazards=[];g.enemies.units=[{id:'victim',type:'soldier',hp:1,position:{x:0,y:-60},heading:0}];g.weapon.projectiles=[{id:'test',stage:source==='wave'?1:0,sourceBit:source==='bit'?'bit-1':undefined,origin:{x:0,y:0},position:{x:0,y:0},heading:0,velocity:{x:0,y:-900},damage:100,radius:2,remaining:150}];stepProjectiles(g,.1);assert.equal(g.enemies.debris[0].source,source);}
});
