import test from 'node:test';
import assert from 'node:assert/strict';
import {adjacentPairs,equipmentBonus,solarDefense,solarChargeMultiplier,tankBoostMultiplier} from '../src/prototype/equipment.js';
import {createGame} from '../src/prototype/game.js';
import {stepRailgun} from '../src/prototype/railgun.js';
import {stepBoost,decayBoost} from '../src/prototype/boost.js';
import {applyContact} from '../src/prototype/damage.js';
import {cellToWorld} from '../src/prototype/ship.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
test('same-type adjacency counts touching pairs once, not shared cells or diagonal corners; damaged devices do not contribute',()=>{
 const parts=[{type:'tank',x:0,y:0,hp:100},{type:'tank',x:2,y:0,hp:100},{type:'tank',x:4,y:2,hp:100},{type:'engine',x:0,y:2,hp:100}];
 assert.equal(adjacentPairs(parts,'tank'),1);near(tankBoostMultiplier(parts),1.155);parts[1].hp=0;near(tankBoostMultiplier(parts),1.1);
 const many=Array.from({length:50},(_,i)=>({type:'solar',x:i*2,y:0,hp:100}));near(solarDefense(many),1.5+49*.003);near(solarChargeMultiplier(many),2.5+49*.003);
});
test('weapon upgrades affect all player normal bullets, not bit bullets, without requiring pipes',()=>{
 const g=createGame({campaign:false});g.ship.parts=g.ship.parts.filter(p=>p.type!=='pipe');g.ship.parts.push({id:'extra',type:'railgun',x:8,y:8,hp:100});g.hazards=[];g.enemies.units=[];
 stepRailgun(g,[{type:'weapon-press'},{type:'weapon-release'}],0);const bullets=g.weapon.projectiles;near(equipmentBonus(g.ship.parts,'railgun'),.105);
 assert.ok(bullets.some(p=>p.sourceBit));for(const p of bullets)near(p.damage,p.sourceBit?12.5:12.5*1.105);
});
test('tank bonus extends integrated boost travel by exactly 5% per separated tank',()=>{
 const distance=tanks=>{const g=createGame({campaign:false});g.ship.parts=Array.from({length:tanks},(_,i)=>({id:`t${i}`,type:'tank',x:i*4,y:0,hp:100}));stepBoost(g,[{type:'boost-press'}],.5);stepBoost(g,[{type:'boost-release'}],0);let d=0;while(g.boost.remaining>0){d+=Math.hypot(g.boost.velocity.x,g.boost.velocity.y)/120;decayBoost(g,1/120);}return d;};near(distance(2)/distance(0),1.1);
});
test('uncapped armor cannot turn enemy damage into healing',()=>{
 const g=createGame({campaign:false});g.ship.parts.push(...Array.from({length:40},(_,i)=>({id:`armor${i}`,type:'solar',x:30+i*4,y:0,hp:100})));const before=g.ship.critical.core;applyContact(g,{type:'enemyAttack',position:cellToWorld({x:5,y:9},g.flight),damage:100});assert.equal(g.ship.critical.core,before);
});
