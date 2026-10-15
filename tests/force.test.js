import {createEquippedGame} from './helpers/equippedGame.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,snapshot,stepGame} from '../src/prototype/game.js';
import {forceGeometry,weaponMuzzleDistance,forceBody,forceRods} from '../src/prototype/force.js';
import {shipCells,CELL_METERS} from '../src/prototype/ship.js';
import {stepRailgun,stepProjectiles,RAILGUN} from '../src/prototype/railgun.js';
import {requestCollection,stepCollection} from '../src/prototype/collection.js';
import {defaultTuning,validateTuning} from '../src/prototype/devTuning.js';
import {applyContact} from '../src/prototype/damage.js';
import {cellToWorld} from '../src/prototype/ship.js';
import {stepEnemies} from '../src/prototype/enemies.js';

test('four rods rotate around the forward axis while their tips remain behind the core',()=>{
 const first=forceRods(0);assert.equal(first.length,4);assert.equal(new Set(first.map(r=>r.index)).size,4);
 assert.notDeepEqual(first,forceRods(1));
 for(let time=0;time<8;time+=.1)for(const rod of forceRods(time)){
  assert.ok(rod.y+1.28*rod.scale>0);assert.ok(Math.abs(rod.x)+.17*rod.scale<=1);
 }
 const full=forceRods(2*Math.PI/2.4);
 for(const r of first){const next=full.find(n=>n.index===r.index);assert.ok(Math.abs(r.x-next.x)<1e-9);}
});

test('force blocks swept enemy shots, but ship-first and bypassing shots still damage the ship',()=>{
 for(const heading of [0,Math.PI/2,-.6]){
  const g=createEquippedGame();g.flight.position={x:30,y:40};g.flight.heading=heading;g.nebula.regions=[];g.enemies.units=[];
  const body=forceBody(g),direction={x:Math.sin(heading),y:-Math.cos(heading)},before=JSON.stringify(g.ship);
  g.enemies.shots=[{id:1,position:{x:body.position.x+direction.x*100,y:body.position.y+direction.y*100},velocity:{x:-direction.x*2000,y:-direction.y*2000},damage:1000,remaining:1}];
  stepEnemies(g,.2);assert.equal(g.enemies.shots.length,0);assert.equal(JSON.stringify(g.ship),before);assert.equal(g.force.equipped,true);
 }
 const g=createEquippedGame();g.nebula.regions=[];g.enemies.units=[];const core=cellToWorld({x:5,y:9},g.flight);
 g.enemies.shots=[{id:2,position:{x:core.x-10,y:core.y},velocity:{x:200,y:0},damage:10,remaining:1}];
 stepEnemies(g,.1);assert.ok([...g.ship.cells,...g.ship.parts].some(c=>c.hp<100));assert.equal(g.enemies.shots.length,0);
 const h=createEquippedGame();h.nebula.regions=[];h.enemies.units=[];
 h.enemies.shots=[{id:3,position:{x:0,y:100},velocity:{x:0,y:-2000},damage:1000,remaining:1}];
 stepEnemies(h,.2);assert.ok([...h.ship.cells,...h.ship.parts].some(c=>c.hp<100));assert.equal(h.force.equipped,true);
 assert.equal(forceBody(createEquippedGame({force:false})),null);
});

test('force starts equipped, is snapshot-isolated and never joins two-bit collection',()=>{
 const g=createEquippedGame();assert.equal(g.force.equipped,true);assert.equal(g.bits.length,3);
 const view=snapshot(g);view.force.equipped=false;assert.equal(g.force.equipped,true);
 g.resources=[{id:'pair',type:'tank',state:'available',discovered:true,position:{x:0,y:-100}},{id:'single',type:'wire',state:'available',discovered:true,position:{x:0,y:-80}}];
 assert.equal(requestCollection(g,'pair').ok,true);assert.deepEqual(g.jobs[0].bitIds,['bit-1','bit-2']);assert.equal(requestCollection(g,'single').ok,true);
 for(let i=0;i<1200&&g.jobs[0].stage!=='complete';i++)stepCollection(g,1/60);
 assert.equal(g.inventory.tank,0);assert.deepEqual(g.force,{equipped:true});
 assert.equal(createEquippedGame().force.equipped,true);assert.equal(createEquippedGame({force:false}).force.equipped,false);
});

test('force matches the live hull width and stays clear of the foremost cell after craft changes',()=>{
 const g=createEquippedGame();
 for(const expanded of [false,true]){
  if(expanded)g.ship.parts.push({id:'wide',type:'pipe',x:0,y:0,hp:100,appearance:{}});
  const cells=shipCells(g.ship),f=forceGeometry(g.ship),xs=cells.map(c=>c.x);
  assert.equal(f.width,(Math.max(...xs)-Math.min(...xs)+1)*CELL_METERS);
  assert.ok(f.y+f.radius<Math.min(...cells.map(c=>(c.y-8)*CELL_METERS))-CELL_METERS/2);
  assert.ok(-f.muzzleDistance<f.y-f.radius);
 }
});

test('normal and charged shots start inside the ship-side half of the force at release heading; absent force keeps ship muzzle',()=>{
 for(const equipped of [true,false])for(const seconds of [0,1.2,2.4])for(const heading of [0,Math.PI/2,-.7]){
  const g=createEquippedGame({force:equipped});g.flight.position={x:123,y:-456};g.flight.heading=heading;g.hazards=[];
  g.ship.parts.find(p=>p.type==='tank').stored=160;
  stepRailgun(g,[{type:'weapon-press'}],seconds);stepRailgun(g,[{type:'weapon-release',heading}],0);
  const shot=g.weapon.projectiles[0],distance=shot.halfWave?RAILGUN.muzzleDistance:weaponMuzzleDistance(g,RAILGUN.muzzleDistance);
  assert.ok(Math.abs(shot.origin.x-(123+Math.sin(heading)*distance))<1e-9);
  assert.ok(Math.abs(shot.origin.y-(-456-Math.cos(heading)*distance))<1e-9);
  assert.equal(shot.heading,heading);
  assert.equal(weaponMuzzleDistance(g,RAILGUN.muzzleDistance),equipped?(-forceGeometry(g.ship).y-forceGeometry(g.ship).radius*.5):RAILGUN.muzzleDistance);
 }
});

test('aim assist retains the force muzzle origin, and navigation continues while charging',()=>{
 const g=createEquippedGame(),distance=weaponMuzzleDistance(g,RAILGUN.muzzleDistance);
 g.hazards=[{id:'ahead',type:'impact',radius:10,position:{x:8,y:-distance-200}}];
 stepRailgun(g,[{type:'weapon-press'},{type:'weapon-release',heading:0}],0);
 const shot=g.weapon.projectiles[0];assert.equal(g.weapon.lastShot.assisted,true);assert.ok(Math.abs(shot.origin.x)<1e-9);assert.ok(Math.abs(shot.origin.y+distance)<1e-9);
 g.commands.push({type:'weapon-press'});stepGame(g,1,1/60);assert.ok(g.flight.elapsed>0);assert.ok(g.weapon.holding);assert.equal(g.force.equipped,true);
});

test('below MAX force fires a half wave from ship and two parallel bullets from force without cooldown',()=>{
 for(const seconds of [1,1.2]){const g=createEquippedGame();g.bits=[];g.hazards=[];g.ship.parts.find(p=>p.type==='tank').stored=160;
 stepRailgun(g,[{type:'weapon-press'}],seconds);stepRailgun(g,[{type:'weapon-release',heading:.4}],0);const shots=g.weapon.projectiles;
 assert.equal(shots.length,3);const wave=shots[0];assert.equal(wave.halfWave,true);assert.equal(wave.enhanced,false);assert.equal(wave.radius,RAILGUN.radii[2]*.5);assert.equal(wave.damage,RAILGUN.damage[2]*1.5*2*.5*1.05);
 assert.ok(Math.abs(wave.origin.x-Math.sin(.4)*42)<1e-9);assert.ok(shots.slice(1).every(s=>s.stage===0&&s.forceBullet&&s.heading===.4&&!s.enhanced));
 const midpoint={x:(shots[1].origin.x+shots[2].origin.x)/2,y:(shots[1].origin.y+shots[2].origin.y)/2};assert.ok(Math.abs(Math.hypot(midpoint.x,midpoint.y)-weaponMuzzleDistance(g,42))<1e-9);
 stepRailgun(g,[{type:'weapon-press'},{type:'weapon-release'}],0);assert.equal(g.weapon.projectiles.length,6);
 }
 const g=createEquippedGame({force:false});stepRailgun(g,[{type:'weapon-press'},{type:'weapon-release'}],0);assert.equal(g.weapon.projectiles.length,1);
});

test('force has no destructible hull cells; critical ship damage still ends flight and shooting',()=>{
 for(const role of ['canopy','core']){
  const g=createEquippedGame(),geometry=forceGeometry(g.ship),before=JSON.stringify(g.ship);
  applyContact(g,{type:'enemyAttack',position:{x:0,y:geometry.y},damage:1000});
  assert.deepEqual(g.force,{equipped:true});assert.equal(JSON.stringify(g.ship),before);
  const critical=g.ship.cells.find(c=>c.role===role);
  applyContact(g,{type:'enemyAttack',position:cellToWorld(critical,g.flight),damage:1000});
  assert.equal(g.status,'ended');assert.equal(g.ship.critical[role],0);assert.equal(g.force.equipped,true);
  stepRailgun(g,[{type:'weapon-press'},{type:'weapon-release'}],1);
  assert.equal(g.weapon.shots,0);assert.equal(g.weapon.projectiles.length,0);
 }
});

test('charged force beam widens real collision, increases damage, preserves charge cost and remains obstacle-only',()=>{
 for(const seconds of [2.4]){
  const games=[false,true].map(force=>{const g=createEquippedGame({force});g.hazards=[];g.ship.parts.find(p=>p.type==='tank').stored=160;stepRailgun(g,[{type:'weapon-press'}],seconds);stepRailgun(g,[{type:'weapon-release'}],0);return g;});
  const [plain,enhanced]=games.map(g=>g.weapon.projectiles[0]);
  assert.equal(enhanced.damage,plain.damage*2);assert.equal(enhanced.radius,plain.radius*1.8);assert.equal(enhanced.cost,plain.cost);
  for(const g of games){const p=g.weapon.projectiles[0];g.hazards=[{id:'edge',type:'impact',radius:1,position:{x:plain.radius+2,y:p.origin.y-100}}];g.resources=[{id:'wire',type:'wire',state:'available',position:{x:0,y:p.origin.y-50}}];stepProjectiles(g,1/60);assert.equal(g.resources[0].state,'available');}
  assert.equal(games[0].weapon.hits,0);assert.equal(games[1].weapon.hits,1);
 }
});

test('force settings accept old v1 files, validate bounds, and apply live without resetting equipment',()=>{
 const old=defaultTuning();delete old.force;assert.equal(validateTuning(old).force.chargedDamage,2);
 const older=defaultTuning();for(const key of ['normalInterval','normalRange','normalDuration'])delete older.force[key];assert.equal(validateTuning(older).force.normalInterval,.8);
 const invalid=defaultTuning();invalid.force.spreadDegrees=Infinity;assert.throws(()=>validateTuning(invalid));
 const g=createEquippedGame();g.tuning=defaultTuning();g.tuning.force.spreadDegrees=45;g.tuning.force.chargedDamage=3;g.tuning.force.chargedWidth=2;
 g.hazards=[];stepRailgun(g,[{type:'weapon-press'},{type:'weapon-release'}],0);assert.equal(g.weapon.projectiles[2].heading,0);
 g.ship.parts.find(p=>p.type==='tank').stored=160;stepRailgun(g,[{type:'weapon-press'}],2.4);stepRailgun(g,[{type:'weapon-release'}],0);
 const shot=g.weapon.projectiles.filter(p=>!p.sourceBit).at(-1);assert.equal(shot.damage,RAILGUN.damage[2]*1.5*3*1.05);assert.equal(shot.radius,RAILGUN.radii[2]*2);assert.equal(g.force.equipped,true);
});

test('nearby bits support repeated force shots without interrupting collection or consuming extra energy',()=>{
 const g=createEquippedGame();g.hazards=[];g.bits[0].jobId=null;const before=JSON.stringify(g.bits);
 stepRailgun(g,[{type:'weapon-press'},{type:'weapon-release',heading:.4}],0);assert.equal(g.weapon.projectiles.filter(p=>p.sourceBit).length,3);assert.equal(g.weapon.projectiles.length,6);assert.equal(g.weapon.totalSpent,2);assert.equal(JSON.stringify(g.bits),before);
 assert.ok(g.weapon.projectiles.filter(p=>p.sourceBit).every(p=>p.heading===.4&&!p.enhanced));
 g.bits[0].position.x=500;g.bits[1].state='disabled';g.bits[2].state='disabled';const count=g.weapon.projectiles.length;stepRailgun(g,[{type:'weapon-press'},{type:'weapon-release'}],0);assert.equal(g.weapon.projectiles.length-count,3);
 g.force.equipped=false;g.bits[0].position.x=0;g.bits[1].state='orbiting';stepRailgun(g,[{type:'weapon-press'},{type:'weapon-release'}],0);assert.equal(g.weapon.projectiles.at(-1).sourceBit,undefined);
});

test('orbiting bits also support charged waves while working bits do not shoot',()=>{const g=createEquippedGame();g.ship.parts.find(p=>p.type==='tank').stored=160;g.bits[1].state='returning';stepRailgun(g,[{type:'weapon-press'}],2.4);stepRailgun(g,[{type:'weapon-release'}],0);const support=g.weapon.projectiles.filter(p=>p.sourceBit);assert.equal(support.length,2);assert.equal(support[0].stage,0);assert.equal(support[0].sourceBit,g.bits[0].id);assert.equal(g.bits[1].state,'returning');});
