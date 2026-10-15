import {createEquippedGame} from './helpers/equippedGame.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,applyCommand,snapshot,stepGame} from '../src/prototype/game.js';
import {createShip,cellToWorld} from '../src/prototype/ship.js';
import {applyContact} from '../src/prototype/damage.js';
import {partCount,solarDefense,poweredThrust} from '../src/prototype/equipment.js';
import {stepEnergy} from '../src/prototype/energy.js';
import {PARTS,validatePlacement} from '../src/prototype/model.js';
import {stepRailgun,stepProjectiles,RAILGUN} from '../src/prototype/railgun.js';
import {forceGeometry,weaponMuzzleDistance} from '../src/prototype/force.js';
import {createPilotController} from '../src/prototype/pilotExpressions.js';
import {resourceInSector,RESOURCE_SPAWN_RATE,updateWorld} from '../src/prototype/world.js';
import {installRecoveredPart} from '../src/prototype/autoInstall.js';
import {requestCollection,stepCollection} from '../src/prototype/collection.js';

test('heat-specific portraits remain disabled during and after heat exposure',()=>{
 const t=snapshot(createEquippedGame()),select=createPilotController();t.flight.elapsed=1;select(t);t.nebula.field.heat=.2;t.flight.elapsed=2;assert.equal(select(t).expression,'neutral');t.nebula.field.heat=0;t.flight.elapsed=3;assert.equal(select(t).expression,'neutral');t.flight.elapsed=9.9;assert.equal(select(t).expression,'neutral');t.flight.elapsed=10;assert.equal(select(t).id,'cruising');t.thermal.hot=true;t.flight.elapsed=11;assert.equal(select(t).expression,'neutral');t.thermal.hot=false;t.flight.elapsed=0;assert.equal(select(t).id,'departure');
});
test('enemy familiarity uses encounters or accumulated visible time and resets on retry',()=>{
 const t=snapshot(createEquippedGame()),select=createPilotController();t.flight.elapsed=1;t.enemies.units=[{hp:10,detected:true}];assert.equal(select(t).expression,'stoic');t.flight.elapsed=10;assert.equal(select(t).expression,'stoic');t.flight.elapsed=21;assert.equal(select(t).expression,'smile');t.flight.elapsed=0;assert.equal(select(t).expression,'stoic');
 for(let i=0;i<2;i++){t.flight.elapsed+=1;t.enemies.units=[];select(t);t.flight.elapsed+=1;t.enemies.units=[{hp:1,detected:true}];select(t);}t.flight.elapsed+=5;assert.equal(select(t).expression,'smile');t.status='ended';assert.equal(select(t).id,'ended');
});
test('solar armor and added mass apply only while panels live and critical destruction still ends flight',()=>{
 const g=createEquippedGame();assert.equal(PARTS.solar.mass,24);assert.equal(solarDefense(g.ship.parts),.03);const point=cellToWorld({x:5,y:9},g.flight);applyContact(g,{type:'enemyAttack',position:point,damage:10});assert.equal(g.ship.critical.core,92.24);g.ship.parts.find(p=>p.type==='solar').hp=0;assert.equal(solarDefense(g.ship.parts),0);applyContact(g,{type:'enemyAttack',position:point,damage:1000});assert.equal(g.status,'ended');
});
test('initial devices are one per type and sparse sector resources are deterministic without duplicate respawns',()=>{
 const g=createEquippedGame();for(const type of ['engine','observer','railgun','tank','solar'])assert.equal(partCount(g.ship.parts,type),1);assert.ok(partCount(g.ship.parts,'pipe')>1);assert.ok(Object.values(g.inventory).every(n=>n===0));let count=0;for(let y=-50;y<50;y++)for(let x=-50;x<50;x++)if(resourceInSector(x,y))count++;assert.ok(Math.abs(count/10000-RESOURCE_SPAWN_RATE)<.02);const before=g.resources.map(r=>r.id);updateWorld(g);assert.deepEqual(g.resources.map(r=>r.id),before);
});
test('multiple solar generation, pipe savings and powered engine bonuses disappear on damage/disconnection',()=>{
 const ship=createShip([{id:'s1',type:'solar',x:0,y:0},{id:'p1',type:'pipe',x:2,y:0},{id:'p2',type:'pipe',x:3,y:0},{id:'s2',type:'solar',x:4,y:0},{id:'e1',type:'engine',x:2,y:1},{id:'e2',type:'engine',x:3,y:1}]);let state=stepEnergy(ship,1);assert.equal(state.generation,33.6);assert.equal(state.consumption,16*.98);assert.ok(Math.abs(poweredThrust(ship,state)-13.26)<1e-9);ship.parts.find(p=>p.id==='s2').hp=0;ship.parts.find(p=>p.id==='e2').hp=0;ship.revision++;state=stepEnergy(ship,1);assert.equal(state.generation,16);assert.equal(poweredThrust(ship,state),12.600000000000001);ship.parts.find(p=>p.id==='p2').hp=0;ship.revision++;state=stepEnergy(ship,1);assert.equal(state.consumption,8);
});
test('additional supplied railgun boosts damage, isolated and destroyed enhancements give no bonus',()=>{
 const g=createEquippedGame({campaign:false,force:false});g.hazards=[];const first=()=>{g.ship.parts.find(p=>p.type==='tank').stored=160;stepRailgun(g,[{type:'weapon-press'},{type:'weapon-release'}],0);return g.weapon.lastShot.damage;};assert.equal(first(),13.125);applyCommand(g,{type:'place',partType:'railgun',x:7,y:10,id:'r2'});assert.equal(first(),13.750000000000002);g.ship.parts.find(p=>p.id==='r2').hp=0;assert.equal(first(),13.125);
});
test('equipment auto-installs once on return; materials remain stored and full grids retain equipment',()=>{
 const g=createEquippedGame();g.resources=[{id:'r',type:'tank',position:{x:0,y:-50},state:'available',discovered:true}];assert.ok(requestCollection(g,'r').ok);const job=g.jobs[0];for(let i=0;i<1000&&job.stage!=='complete';i++)stepCollection(g,1/60);assert.equal(job.stage,'complete');assert.equal(g.inventory.tank,0);assert.equal(partCount(g.ship.parts,'tank'),2);assert.ok(job.installedPartId);const p=g.ship.parts.find(p=>p.id===job.installedPartId);assert.ok(validatePlacement(g.ship.parts.filter(v=>v.id!==p.id),'tank',p.x,p.y).valid);stepCollection(g,1/60);assert.equal(partCount(g.ship.parts,'tank'),2);assert.equal(g.recoveredCount,1);assert.equal(installRecoveredPart(g,'wire'),null);const a=installRecoveredPart(g,'observer'),b=installRecoveredPart(g,'observer');assert.notEqual(a.id,b.id);
 const full=createEquippedGame();full.ship.parts=[];for(let y=0;y<17;y++)for(let x=0;x<11;x++)full.ship.parts.push({id:`${x},${y}`,type:'pipe',x,y,hp:100,appearance:{}});full.resources=[{id:'full',type:'solar',state:'available',discovered:true,position:{x:0,y:-20}}];requestCollection(full,'full');for(let i=0;i<1000&&full.jobs[0].stage!=='complete';i++)stepCollection(full,1/60);assert.equal(full.inventory.solar,1);assert.equal(full.jobs[0].installedPartId,null);
});
test('diffusion stage fires nine widely spread penetrating lasers from the force interior, charges once and stays available with low energy',()=>{
 for(const force of [false,true]){const g=createEquippedGame({force,campaign:false});g.hazards=[];g.ship.parts.find(p=>p.type==='tank').stored=160;stepRailgun(g,[{type:'weapon-press'}],RAILGUN.maxChargeSeconds);stepRailgun(g,[{type:'weapon-release'}],0);assert.equal(g.weapon.lastShot.stage,3);assert.equal(g.weapon.projectiles.filter(p=>p.stage===3).length,9);assert.equal(g.weapon.totalSpent,64);const d=weaponMuzzleDistance(g,42);for(const shot of g.weapon.projectiles.filter(p=>p.stage===3))assert.deepEqual(shot.origin,{x:0,y:-d});if(force){const f=forceGeometry(g.ship);assert.ok(Math.abs(-d-f.y)<f.radius);assert.ok(d<-f.y);}assert.equal(new Set(g.weapon.projectiles.filter(p=>p.stage===3).map(p=>p.heading)).size,9);assert.ok(g.weapon.projectiles[0].heading<-1);assert.ok(g.weapon.projectiles.filter(p=>p.stage===3).at(-1).heading>1);assert.ok(g.weapon.projectiles.every(p=>p.radius<3));stepProjectiles(g,1/60);assert.equal(g.weapon.effects.filter(e=>e.type==='beam').length,9);}
 const h=createEquippedGame();h.ship.parts.find(p=>p.type==='tank').stored=40;stepRailgun(h,[{type:'weapon-press'}],3.6);stepRailgun(h,[{type:'weapon-release'}],0);assert.equal(h.weapon.lastShot.stage,3);assert.equal(h.weapon.totalSpent,64);
});

test('diffusion lasers damage targets far to both sides of the forward axis',()=>{
 const g=createEquippedGame({force:false,campaign:false});g.hazards=[];g.enemies.units=[];g.ship.parts.find(p=>p.type==='tank').stored=160;
 stepRailgun(g,[{type:'weapon-press'}],3.6);stepRailgun(g,[{type:'weapon-release'}],0);
 g.enemies.units=g.weapon.projectiles.map((p,i)=>({id:`spread-${i}`,type:'soldier',hp:1000,heading:0,position:{...p.path[24]}}));
 for(let i=0;i<45;i++)stepProjectiles(g,1/60);assert.equal(g.weapon.hits,9);assert.ok(g.enemies.units.every(e=>e.hp<1000));assert.ok(g.enemies.units[0].position.x<-150);assert.ok(g.enemies.units.at(-1).position.x>150);
});
