import test from 'node:test';import assert from 'node:assert/strict';
import {shipDamageStatus,checkShipFailure} from '../src/prototype/shipDamage.js';import {vitalWarningStage,pilotWarning} from '../src/prototype/pilotWarnings.js';import {createGame,snapshot,stepGame} from '../src/prototype/game.js';import {applyContact} from '../src/prototype/damage.js';import {cellToWorld} from '../src/prototype/ship.js';import {createPilotController} from '../src/prototype/pilotExpressions.js';
const simple=n=>({cells:Array.from({length:100},(_,i)=>({x:i%10,y:Math.floor(i/10),hp:i<n?0:100})),parts:[]});
test('damaged red occupied-cell warning thresholds are strict, overload is inclusive at 65 percent, and partial damage counts',()=>{
 for(const [count,stage] of [[30,0],[31,1],[40,1],[41,2],[50,2],[51,3],[60,3],[64,3],[65,4],[80,4],[81,4]])assert.equal(shipDamageStatus(simple(count)).stage,stage);
 const ship=simple(0);for(const c of ship.cells)c.hp=1;assert.equal(shipDamageStatus(ship).destroyed,0);assert.equal(shipDamageStatus(ship).stage,4);
});
test('equipment cells count by footprint, overlaps count once and live replacement covers dead owners',()=>{
 const ship={cells:[{x:0,y:0,hp:100},{x:1,y:0,hp:100}],parts:[{id:'old',type:'tank',x:0,y:0,hp:0}]};assert.deepEqual(shipDamageStatus(ship),{total:4,destroyed:4,damaged:4,ratio:1,stage:4});ship.parts.push({id:'new',type:'pipe',x:0,y:0,hp:100});assert.equal(shipDamageStatus(ship).total,4);assert.equal(shipDamageStatus(ship).destroyed,3);
});
test('reaching 65 percent by an actual hit triggers overload and cancels navigation/combat/collection',()=>{
 const g=createGame({campaign:false});g.ship.parts=[];const available=g.ship.cells.filter(c=>!c.role),count=Math.ceil(g.ship.cells.length*.65)-1;for(let i=0;i<count;i++)available[i].hp=0;assert.equal(checkShipFailure(g),false);
 g.jobs=[{stage:'returning'}];g.weapon.holding=true;g.boost.holding=true;g.weapon.projectiles=[{id:'shot'}];g.enemies.shots=[{id:'enemy'}];g.flight.maxDistance=987;applyContact(g,{type:'impact',position:cellToWorld(available[count],g.flight),damage:125});assert.equal(g.status,'ended');assert.equal(g.end.reason,'overload');assert.equal(g.end.maxDistance,987);assert.equal(g.weapon.projectiles.length,0);assert.equal(g.enemies.shots.length,0);assert.equal(g.weapon.holding,false);assert.equal(g.boost.holding,false);assert.equal(g.jobs[0].stage,'cancelled');assert.ok(g.bits.every(b=>b.state==='disabled'));assert.equal(checkShipFailure(g),false);
});
test('core destruction still ends immediately; game loop also catches structural failure before gameplay advances',()=>{
 const g=createGame({campaign:false});g.ship.parts=[];applyContact(g,{type:'enemyAttack',position:cellToWorld({x:5,y:9},g.flight),damage:125});assert.equal(g.status,'ended');assert.deepEqual(g.end.critical,['core']);
 const h=createGame({campaign:false});h.ship.parts=[];for(const c of h.ship.cells.filter(c=>!c.role))c.hp=0;const time=h.flight.elapsed;stepGame(h,0,1);assert.equal(h.status,'ended');assert.equal(h.end.reason,'overload');assert.equal(h.flight.elapsed,time);
});
test('pilot portraits follow structural stages, repair lowers warnings immediately, and the more urgent warning wins',()=>{
 const g=createGame({campaign:false}),select=createPilotController();g.ship.parts=[];g.flight.elapsed=10;select(snapshot(g));const dead=g.ship.cells.filter(c=>!c.role);
 for(const [fraction,expression] of [[.31,'worried'],[.41,'panicked'],[.51,'pain']]){g.flight.elapsed++;for(const c of dead)c.hp=100;for(let i=0;i<Math.ceil(g.ship.cells.length*fraction);i++)dead[i].hp=0;assert.equal(select(snapshot(g)).expression,expression);}
 for(const c of dead)c.hp=100;g.flight.elapsed++;assert.equal(select(snapshot(g)).expression,'neutral');g.vital.value=5;const t=snapshot(g);assert.equal(pilotWarning(t).expression,'pain');
});
test('vital warnings use inclusive 15/10/8/5 boundaries and regain the relieved pose on recovery',()=>{
 for(const [value,stage,expression] of [[16,0,null],[15,1,'worried'],[11,1,'worried'],[10,2,'panicked'],[8,3,'tearful'],[5,4,'pain']]){assert.equal(vitalWarningStage(value),stage);const g=createGame();g.vital.value=value;assert.equal(pilotWarning(snapshot(g))?.expression??null,expression);}
 const g=createGame(),select=createPilotController();g.flight.elapsed=10;g.vital.value=5;assert.equal(select(snapshot(g)).expression,'pain');g.vital.value=10;g.vital.recoveries++;g.flight.elapsed=11;assert.equal(select(snapshot(g)).expression,'relieved');g.flight.elapsed=13;assert.equal(select(snapshot(g)).expression,'panicked');
});
