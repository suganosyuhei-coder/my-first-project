import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,stepGame,snapshot} from '../src/prototype/game.js';
import {updateStableSpace,STABLE_SPACE,STABLE_SUE_LINE,insideStableSpace,stableBoundaryRadius,stableBoundaryPoints,enterStableEnemies} from '../src/prototype/stableSpace.js';
import {updateWorld} from '../src/prototype/world.js';
import {stepEnemies} from '../src/prototype/enemies.js';
import {updateNebula,stepNebulaContacts} from '../src/prototype/nebula.js';
import {damageEnemy} from '../src/prototype/enemyCombat.js';
import {damageSpaceObject} from '../src/prototype/spaceLoot.js';
import {applyContact} from '../src/prototype/damage.js';
import {cellToWorld} from '../src/prototype/ship.js';
import {createPilotController} from '../src/prototype/pilotExpressions.js';
import {cruiseSpeed} from '../src/prototype/flightSpeed.js';
import {productionTuning} from '../src/prototype/runtimeTuning.js';
const create=()=>createGame({stableStart:true,tuning:productionTuning()});
const move=(g,x,y)=>{g.flight.position={x,y};updateStableSpace(g);updateWorld(g);updateNebula(g);stepEnemies(g,0);};

test('stable start is quiet and preserves initial ship/tuning/vital; actual steering and boost remain usable',()=>{
 const g=create(),baseline=createGame({tuning:productionTuning()});assert.deepEqual(g.ship,baseline.ship);assert.deepEqual(g.flight.velocity,baseline.flight.velocity);assert.equal(g.vital.value,80);
 assert.equal(g.stableSpace.phase,'quiet');assert.deepEqual(g.hazards.map(h=>h.material),['rock','ice']);assert.ok(g.hazards.every(h=>!insideStableSpace(g,h.position,h.radius)));stepEnemies(g,0);assert.equal(g.enemies.units.length,0);assert.equal(g.nebula.field.density,0);
 g.commands.push({type:'boost-press'});const heading=g.flight.heading;stepGame(g,1,1/60);assert.notEqual(g.flight.heading,heading);assert.ok(Math.abs(Math.hypot(g.flight.velocity.x,g.flight.velocity.y)-cruiseSpeed(g.ship,g.energy,g.tuning))<1e-8);assert.ok(g.flight.elapsed>0);assert.equal(g.enemies.units.length,0);
 const telemetry=snapshot(create());assert.equal(createPilotController()(telemetry).line,STABLE_SUE_LINE);assert.equal(telemetry.stableSpace.inside,true);
});
test('leaving the fixed border introduces only one rock and ice; ice gives existing water and vital recovery',()=>{
 const g=create();move(g,0,-500);assert.equal(g.stableSpace.phase,'shooting');assert.deepEqual(g.hazards.map(h=>h.material),['rock','ice']);assert.equal(g.enemies.units.filter(e=>e.detected).length,0);
 const ice=g.hazards.find(h=>h.material==='ice');g.vital.value=60;assert.ok(damageSpaceObject(g,ice,40));assert.equal(g.inventory.water,1);assert.equal(g.vital.value,65);updateWorld(g);assert.ok(!g.hazards.some(h=>h.id===ice.id));
 assert.equal(STABLE_SPACE.radius,480);assert.equal(snapshot(g).stableSpace.radius,480);
});
test('one weak enemy precedes normal combat; it is not duplicated and defeating it unlocks normal encounters',()=>{
 const g=create();move(g,0,-950);assert.equal(g.stableSpace.phase,'combat');assert.equal(g.enemies.units.length,1);const enemy=g.enemies.units[0];assert.equal(enemy.hp,24);assert.equal(enemy.tutorialEnemy,true);
 move(g,0,-960);assert.equal(g.enemies.units[0],enemy);damageEnemy(g,enemy,100,enemy.position);updateStableSpace(g);assert.equal(g.stableSpace.phase,'combat');move(g,0,-1190);assert.equal(g.stableSpace.phase,'normal');stepEnemies(g,0);assert.ok(g.enemies.units.some(e=>!e.tutorialEnemy));
 const bypass=create();move(bypass,0,-1400);assert.equal(bypass.stableSpace.phase,'normal');assert.ok(bypass.enemies.units.length>1);
});
test('intro adapts to the exit direction and never expands its safe radius; retry starts fresh',()=>{
 const g=create();move(g,500,0);assert.deepEqual(g.stableSpace.route,{x:1,y:0});assert.deepEqual(g.hazards[0].position,{x:35,y:-650});move(g,950,0);assert.ok(g.stableSpace.enemy.position.x>=1120);
 move(g,10000,10000);assert.equal(g.stableSpace.phase,'normal');move(g,0,0);assert.equal(g.stableSpace.phase,'normal');assert.ok(insideStableSpace(g));assert.ok(g.enemies.units.every(e=>!insideStableSpace(g,e.position)));
 const fresh=create();assert.equal(fresh.stableSpace.phase,'quiet');assert.equal(fresh.stableSpace.enemy,null);assert.equal(fresh.vital.value,80);assert.equal(STABLE_SPACE.radius,480);
});
test('stable area rejects enemy damage and nebula contact, pause and introduction freeze progress, and other scenes are unaffected',()=>{
 const g=create(),ship=structuredClone(g.ship);applyContact(g,{type:'enemyAttack',position:cellToWorld({x:5,y:9},g.flight),damage:10000});assert.deepEqual(g.ship,ship);
 g.nebula.regions=[{position:{x:0,y:0},extent:{x:1000,y:1000},density:1,heat:1,abrasion:1,turbulence:1,seed:1,shape:2,type:'energetic'}];stepNebulaContacts(g,10);assert.deepEqual(g.ship,ship);
 g.paused=true;stepGame(g,1,30);assert.equal(g.stableSpace.phase,'quiet');assert.equal(g.flight.elapsed,0);g.paused=false;g.introduction=true;stepGame(g,1,30);assert.equal(g.flight.elapsed,0);
 assert.equal(snapshot(createGame()).stableSpace,null);
});

test('irregular stable boundary matches safety and first enemy is allocated offscreen before combat',()=>{
 const g=create();assert.notEqual(stableBoundaryRadius(0),stableBoundaryRadius(Math.PI/2));
 for(const p of stableBoundaryPoints()){assert.ok(insideStableSpace(g,{x:p.x*.999,y:p.y*.999}));assert.ok(!insideStableSpace(g,{x:p.x*1.001,y:p.y*1.001}));}
 move(g,0,-500);const enemy=g.stableSpace.enemy;assert.ok(enemy);assert.equal(enemy.detected,false);assert.ok(Math.hypot(enemy.position.x-g.flight.position.x,enemy.position.y-g.flight.position.y)>Math.hypot(g.viewport.width,g.viewport.height)/g.viewport.scale);const before={...enemy.position};stepEnemies(g,1);assert.deepEqual(enemy.position,before);move(g,0,-950);assert.equal(g.stableSpace.enemy,enemy);
});

test('normal encounter transition never reveals unseen enemies in the current viewport',()=>{
 const g=create();g.stableSpace.phase='normal';const enemy={id:'transition-enemy',hp:24,type:'gunner',position:{...g.flight.position}};g.enemies.units=[enemy];enterStableEnemies(g);assert.equal(g.enemies.units.length,0);assert.equal(g.stableSpace.pendingEnemies.get(enemy.id),enemy);
 g.flight.position.x+=2000;enterStableEnemies(g);assert.equal(g.enemies.units[0],enemy);g.flight.position.x=0;enterStableEnemies(g);assert.equal(g.enemies.units[0],enemy);
});

test('training rocks and ice already exist before leaving and keep their world positions after exit',()=>{
 const g=create(),before=structuredClone(g.hazards);assert.equal(before.length,2);move(g,500,0);assert.deepEqual(g.hazards,before);move(g,0,-950);assert.deepEqual(g.hazards,before);move(g,0,-1400);for(const h of before)assert.deepEqual(g.hazards.find(o=>o.id===h.id),h);
});
test('normal-world hazards are deferred if their first appearance would be onscreen',()=>{
 const g=create();move(g,0,-1400);const initial=new Set(g.hazards.map(h=>h.id));updateWorld(g);assert.deepEqual(new Set(g.hazards.map(h=>h.id)),initial);
 // Every ordinary object admitted for the first time is outside the viewport.
 for(const h of g.hazards.filter(h=>!h.id.startsWith('stable-training-'))){const x=(h.position.x-g.flight.position.x-76*(g.tuning.ship.visualScale))*g.viewport.scale+g.viewport.width/2,y=(h.position.y-g.flight.position.y+108*(g.tuning.ship.visualScale))*g.viewport.scale+g.viewport.height/2,m=(h.radius+30)*g.viewport.scale;assert.ok(x < -m||y < -m||x>g.viewport.width+m||y>g.viewport.height+m);}
});
