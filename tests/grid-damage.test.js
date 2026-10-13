import test from 'node:test';import assert from 'node:assert/strict';
import {createGame,snapshot} from '../src/prototype/game.js';import {applyContact} from '../src/prototype/damage.js';import {cellToWorld} from '../src/prototype/ship.js';import {gridDamageMarkers} from '../src/prototype/gridDamage.js';
test('rotated rock contact damages the actual hull grid cell and labels its remaining health',()=>{
 const g=createGame({campaign:false});g.ship.parts=[];g.flight.heading=1.2;g.flight.position={x:120,y:-700};const cell={x:2,y:8},neighbor=g.ship.cells.find(c=>c.x===2&&c.y===7);
 applyContact(g,{type:'impact',position:cellToWorld(cell,g.flight),damage:20});const markers=gridDamageMarkers(snapshot(g).ship);assert.deepEqual(markers,[{...cell,hp:84,severity:'damaged',symbol:'△'}]);assert.equal(neighbor.hp,100);
 applyContact(g,{type:'enemyAttack',position:cellToWorld(cell,g.flight),damage:62.5});assert.equal(gridDamageMarkers(g.ship)[0].symbol,'!');
 applyContact(g,{type:'enemyAttack',position:cellToWorld(cell,g.flight),damage:62.5});assert.equal(gridDamageMarkers(g.ship)[0].symbol,'×');assert.equal(gridDamageMarkers(g.ship)[0].hp,0);
});
test('multi-cell device marker stays at the impact cell after destruction and resets with the voyage',()=>{
 const g=createGame({campaign:false}),cell={x:4,y:9},tank=g.ship.parts.find(p=>p.type==='tank');g.ship.parts=g.ship.parts.filter(p=>p.type!=='solar');
 applyContact(g,{type:'enemyAttack',position:cellToWorld(cell,g.flight),damage:125});assert.equal(tank.hp,0);assert.deepEqual(gridDamageMarkers(g.ship),[{...cell,hp:0,severity:'destroyed',symbol:'×'}]);assert.deepEqual(gridDamageMarkers(createGame().ship),[]);
});
test('cosmetic dust and rejected contacts create no damage marker',()=>{
 const g=createGame({campaign:false}),position=cellToWorld({x:2,y:8},g.flight);applyContact(g,{type:'dustContact',position,damage:0});assert.deepEqual(gridDamageMarkers(g.ship),[]);g.status='ended';applyContact(g,{type:'impact',position,damage:99});assert.deepEqual(gridDamageMarkers(g.ship),[]);
});
