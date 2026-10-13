import {createEquippedGame} from './helpers/equippedGame.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlight,stepFlight} from '../src/prototype/model.js';
import {PLANET_FLOW,nearbyPlanets,planetEnvironment,planetInfluence,galaxyCurrent} from '../src/prototype/planetFlow.js';
import {createGame,stepGame,applyCommand,snapshot} from '../src/prototype/game.js';
import {spawnEnemies,stepEnemies,ENEMY_TYPES,BIT_DEFENSE} from '../src/prototype/enemies.js';
import {stepEnergy} from '../src/prototype/energy.js';
import {createShip,cellToWorld} from '../src/prototype/ship.js';
import {environmentForFlight,environmentAt} from '../src/prototype/nebula.js';
import {boostTurnMultiplier} from '../src/prototype/boost.js';
import {defaultTuning,validateTuning} from '../src/prototype/devTuning.js';
import {applyContact} from '../src/prototype/damage.js';

function unit(type,x,y){const stats=ENEMY_TYPES.find(t=>t.id===type);return {id:type,type,hp:stats.hp,position:{x,y},heading:0,cooldown:0,ramCooldown:0,detected:true,supported:false};}
function encounter(){const g=createEquippedGame();g.nebula.regions=[];g.resources=[];return g;}

test('different sized planets have a smooth capture field; direct approach bends safely into orbit',()=>{
 assert.ok(new Set(nearbyPlanets({x:0,y:0}).map(p=>p.radius)).size>=3);
 const planet=nearbyPlanets({x:0,y:0}).find(p=>p.index===0),flight=createFlight();flight.position={x:planet.position.x,y:planet.position.y+220};flight.start={...flight.position};let minimum=Infinity,peak=0;
 for(let i=0;i<600;i++){const env=planetEnvironment({drag:0,lateral:0,turn:0,minimumSpeed:12},flight,[planet],50,1);peak=Math.max(peak,env.weight);stepFlight(flight,0,1/60,24,env,{x:0,y:0});minimum=Math.min(minimum,Math.hypot(flight.position.x-planet.position.x,flight.position.y-planet.position.y));}
 assert.ok(minimum>=planet.radius+50+6-1e-9);assert.ok(peak>.7);assert.ok(Math.abs(flight.position.x-planet.position.x)>40);
 const inside=planetInfluence({x:planet.position.x,y:planet.position.y+115},[planet],50,1);assert.ok(inside.controlFactor<.4);assert.equal(planetInfluence(flight.position,[planet],50,0).controlFactor,1);
});
test('boosted overlap enters planet dive without position or velocity snapping; galaxy currents remain weak',()=>{
 const p={position:{x:0,y:0},radius:110,direction:1},f=createFlight();f.position={x:0,y:200};const env=planetEnvironment({drag:0,lateral:0,turn:0,minimumSpeed:12},f,[p],70,1);
 stepFlight(f,0,.1,36,env,{x:0,y:-1000});assert.equal(f.planetDive,true);assert.ok(Math.hypot(f.position.x,f.position.y)<186);assert.ok(f.velocity.y<0);assert.ok(Math.hypot(f.velocity.x,f.velocity.y)>=12);
 const current=galaxyCurrent({x:0,y:0});assert.ok(Math.hypot(current.x,current.y)>0);assert.deepEqual(galaxyCurrent({x:0,y:0},0),{x:0,y:0});
});
test('nebula steering/flow can be amplified independently; core-connected tanks harvest without duplication or isolated supply',()=>{
 const field={density:.6,flow:{x:.8,y:.5},turbulence:.7},normal=environmentForFlight(field,0,1),strong=environmentForFlight(field,0,2);assert.equal(strong.lateral,normal.lateral*2);assert.equal(strong.turn,normal.turn*2);
 const s=createShip([{id:'tank',type:'tank',x:7,y:8},{id:'pipe',type:'pipe',x:6,y:9},{id:'isolated',type:'tank',x:0,y:0}]);const state=stepEnergy(s,1,{nebulaRate:12});assert.equal(state.nebulaGeneration,12);assert.equal(state.stored,12);assert.equal(s.parts.find(p=>p.id==='isolated').stored,0);
 s.parts=s.parts.filter(p=>p.id!=='pipe');s.revision++;assert.equal(stepEnergy(s,1,{nebulaRate:12}).nebulaGeneration,0);
 const g=createEquippedGame({seed:4});g.ship.parts=g.ship.parts.filter(p=>p.type!=='solar');g.ship.revision++;g.ship.parts.find(p=>p.type==='tank').stored=0;
 const r=g.nebula.regions.find(r=>r.type==='energetic');g.flight.position={...r.position};g.tuning=defaultTuning();g.tuning.environment.nebulaRecovery=30;stepGame(g,0,1/60);assert.ok(g.energy.nebulaGeneration>0);
});
test('energetic regions spawn exactly one of each enemy type once; other regions spawn none',()=>{
 const g=encounter();g.nebula.regions=[{id:'r',type:'energetic',position:{x:0,y:0},extent:{x:200,y:200}},{id:'other',type:'dense',position:{x:0,y:0},extent:{x:200,y:200}}];spawnEnemies(g);assert.equal(g.enemies.units.filter(e=>e.type!=='pow').length,3);assert.deepEqual(g.enemies.units.filter(e=>e.type!=='pow').map(e=>e.type),['gunner','chaser','leader']);spawnEnemies(g);assert.equal(g.enemies.units.filter(e=>e.type!=='pow').length,3);
 g.enemies.units.forEach(e=>e.hp=0);spawnEnemies(g);assert.equal(g.enemies.units.length,0);spawnEnemies(g);assert.equal(g.enemies.units.length,0);
});
test('gunner shoots, chaser moves faster without shots, stationary leader supplies measurable support',()=>{
 const g=encounter();g.bits.forEach(b=>b.state='collecting');g.enemies.units=[unit('gunner',100,0),unit('chaser',0,100),unit('leader',100,100)];const before=g.enemies.units.map(e=>({...e.position}));stepEnemies(g,.1);
 assert.ok(g.enemies.shots.length>0);assert.equal(g.enemies.units[0].supported,true);assert.deepEqual(g.enemies.units[2].position,before[2]);
 const gunnerDistance=Math.hypot(g.enemies.units[0].position.x-before[0].x,g.enemies.units[0].position.y-before[0].y),chaserDistance=Math.hypot(g.enemies.units[1].position.x-before[1].x,g.enemies.units[1].position.y-before[1].y);assert.ok(chaserDistance>gunnerDistance);assert.ok(g.enemies.units[0].cooldown>0);
});
test('idle bits aim independently of the hull; busy recovery bits preserve jobs; killed units do not respawn',()=>{
 const g=encounter();g.enemies.units=[unit('leader',80,0)];g.bits[0].position={x:20,y:0};g.bits[1].state='returning';g.bits[1].jobId='active';g.bits[2].state='returning';g.jobs=[{id:'active',stage:'returning'}];const heading=g.flight.heading;stepEnemies(g,.01);
 assert.equal(g.enemies.beams.length,1);assert.equal(g.enemies.units[0].hp,56-BIT_DEFENSE.damage);assert.equal(g.bits[1].state,'returning');assert.equal(g.bits[1].jobId,'active');assert.equal(g.jobs[0].stage,'returning');assert.equal(g.flight.heading,heading);
 for(let i=0;i<5;i++)stepEnemies(g,.7);assert.equal(g.enemies.kills,1);
});
test('fast hostile shots use swept collision and important-part destruction stops all combat',()=>{
 const g=encounter();g.bits.forEach(b=>b.state='returning');const core=cellToWorld({x:5,y:9},g.flight);g.enemies.shots=[{id:1,position:{x:core.x-10,y:core.y},velocity:{x:200,y:0},damage:4,remaining:1}];stepEnemies(g,.1);assert.ok([...g.ship.cells,...g.ship.parts].some(c=>c.hp<100));assert.equal(g.enemies.shots.length,0);
 g.enemies.shots=[{id:2,position:{x:core.x-10,y:core.y},velocity:{x:200,y:0},damage:4,remaining:1}];applyContact(g,{type:'enemyAttack',position:core,damage:1000});stepEnemies(g,.1);assert.equal(g.status,'ended');assert.equal(g.enemies.shots.length,0);assert.equal(g.enemies.beams.length,0);
});
test('holding Shift increases actual steering; release accelerates once along the release direction, not initial heading',()=>{
 const normal=createEquippedGame(),fast=createEquippedGame();for(const g of [normal,fast]){g.tuning=defaultTuning();g.tuning.environment.planetStrength=0;g.tuning.environment.galaxyStrength=0;applyCommand(g,{type:'place',partType:'engine',x:7,y:11,id:'second'});g.ship.parts.find(p=>p.type==='tank').stored=160;}
 fast.commands.push({type:'boost-press'});for(let i=0;i<60;i++){stepGame(normal,1,1/60);stepGame(fast,1,1/60);}
 assert.ok(fast.flight.heading>normal.flight.heading*3);assert.equal(boostTurnMultiplier(fast),3.5);const heading=fast.flight.heading;
 fast.commands.push({type:'boost-release',heading});stepGame(fast,0,1/60);assert.equal(fast.boost.bursts,1);assert.equal(boostTurnMultiplier(fast),1);assert.equal(fast.boost.lastBurst.heading,heading);assert.ok(Math.hypot(fast.flight.velocity.x,fast.flight.velocity.y)>100);
 const old=defaultTuning();delete old.boost.turnMultiplier;delete old.environment.galaxyStrength;delete old.environment.nebulaRecovery;assert.equal(validateTuning(old).boost.turnMultiplier,3.5);
});
