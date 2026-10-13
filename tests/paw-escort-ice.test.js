import test from 'node:test';import assert from 'node:assert/strict';
import {createGame,stepGame,snapshot} from '../src/prototype/game.js';
import {stepEscortPaws,escortPawHome,escortContact,hitEscort,ESCORT_PAW} from '../src/prototype/escortPaw.js';
import {stepEnemies,spawnEnemies} from '../src/prototype/enemies.js';
import {enemyReward,destroySpaceObject,pawMissileDrop,PAW_MISSILE_CHANCE} from '../src/prototype/spaceLoot.js';
import {SUPPLY_PAW} from '../src/prototype/supplyPaw.js';import {largeIceInBand,LARGE_ICE,updateWorld} from '../src/prototype/world.js';
const fixture=()=>{const g=createGame({campaign:false,force:false});g.enemies.units=[];g.nebula.regions=[];g.hazards=[];g.bits=[];return g;};
const join=g=>{const home=escortPawHome(-1,g.nebula.seed);g.flight.position={...home};stepEscortPaws(g,0);return g.escortPaws.units.find(u=>u.joinedAt!==null);};
test('missile carriers appear at roughly half the green supply frequency and their drop matches spawn metadata',()=>{
 assert.equal(PAW_MISSILE_CHANCE*SUPPLY_PAW.spacing/1000,.5);assert.equal(ESCORT_PAW.spacing,SUPPLY_PAW.spacing);const g=fixture();spawnEnemies(g);for(const u of g.enemies.units.filter(u=>u.type==='pow'))assert.equal(u.carriesMissile,pawMissileDrop(u.id,g.nebula.seed));
 const yes=fixture();enemyReward(yes,{id:'fixed',type:'pow',carriesMissile:true});assert.equal(yes.equipmentPickup.type,'missile');const no=fixture();enemyReward(no,{id:'fixed',type:'pow',carriesMissile:false});assert.notEqual(no.equipmentPickup.type,'missile');
});
test('white PAW joins at proximity, follows heading, leaves after 30 seconds and does not respawn',()=>{
 const g=fixture(),u=join(g);assert.ok(u);assert.equal(u.hits,0);g.flight.position.x+=100;g.flight.heading=Math.PI/2;const before={...u.position};g.flight.elapsed=.5;stepEscortPaws(g,.5);assert.ok(u.position.x>before.x);assert.equal(u.heading,Math.PI/2);
 g.flight.elapsed=29.9;stepEscortPaws(g,.1);assert.ok(g.escortPaws.units.some(p=>p.id===u.id));g.flight.elapsed=30;stepEscortPaws(g,.1);assert.ok(!g.escortPaws.units.some(p=>p.id===u.id));g.flight.position=escortPawHome(-1,g.nebula.seed);stepEscortPaws(g,0);assert.ok(!g.escortPaws.units.some(p=>p.id===u.id));
});
test('white PAW sprays normal-strength bullets and launches only one independent homing missile',()=>{
 const g=fixture(),u=join(g);g.enemies.units=[{id:'target',type:'commander',hp:1000,detected:true,heading:0,position:{x:u.position.x,y:u.position.y-150}}];stepEscortPaws(g,0);assert.equal(g.escortPaws.shots.filter(s=>s.kind==='bullet').length,5);assert.equal(g.escortPaws.shots.filter(s=>s.kind==='missile').length,1);assert.equal(g.missiles.units.length,0);assert.equal(u.missileUsed,true);
 for(let i=0;i<180;i++){g.flight.elapsed+=1/60;stepEscortPaws(g,1/60);}assert.ok(g.enemies.units[0].hp<1000);assert.equal(g.escortPaws.shots.filter(s=>s.kind==='missile').length,0);stepEscortPaws(g,1);assert.equal(g.escortPaws.shots.filter(s=>s.kind==='missile').length,0);
});
test('swept enemy bullets hit white PAW three times, do not hurt the ship through it and never award friendly-kill loot',()=>{
 const g=fixture(),u=join(g),position={...u.position};g.flight.position={x:position.x+500,y:position.y+500};const hp=g.ship.cells.map(c=>c.hp),score=g.score,loot=g.recoveredCount;
 for(let i=0;i<3;i++){g.enemies.shots=[{id:i,position:{x:position.x,y:position.y-50},velocity:{x:0,y:1000},damage:999,remaining:4}];stepEnemies(g,.1);assert.equal(u.hits,i+1);assert.equal(g.enemies.shots.length,0);}
 assert.deepEqual(g.ship.cells.map(c=>c.hp),hp);assert.equal(g.score,score);assert.equal(g.recoveredCount,loot);assert.equal(escortContact(g,{x:position.x,y:position.y-100},{x:position.x,y:position.y+100}),null);
 stepEscortPaws(g,0);assert.ok(!g.escortPaws.units.some(p=>p.id===u.id));
});
test('pause freezes escort timers and bullets; game end clears them and snapshots isolate positions',()=>{
 const g=fixture(),u=join(g);g.escortPaws.shots.push({id:1,kind:'bullet',age:0,heading:0,position:{...u.position}});const copy=snapshot(g);copy.escortPaws.units[0].position.x=999;assert.notEqual(g.escortPaws.units[0].position.x,999);g.paused=true;const before=JSON.stringify(g.escortPaws);stepEscortPaws(g,1);assert.equal(JSON.stringify(g.escortPaws),before);g.paused=false;g.status='ended';stepGame(g,0,1/60);assert.equal(g.escortPaws.units.length,0);assert.equal(g.escortPaws.shots.length,0);assert.equal(createGame().escortPaws.joined.size,0);
});
test('large ice shares green PAW spacing, is larger, restores eight vital once and normal ice still restores five',()=>{
 assert.equal(LARGE_ICE.spacing,SUPPLY_PAW.spacing);const g=fixture(),ice=largeIceInBand(-1,g.nebula.seed);g.flight.position={...ice.position};updateWorld(g);assert.ok(g.hazards.some(h=>h.id===ice.id));assert.ok(ice.radius>20);g.vital.value=60;destroySpaceObject(g,ice);assert.equal(g.inventory.water,1);assert.equal(g.vital.value,68);assert.equal(destroySpaceObject(g,ice),false);assert.equal(g.vital.value,68);updateWorld(g);assert.ok(!g.hazards.some(h=>h.id===ice.id));g.vital.value=98;destroySpaceObject(g,largeIceInBand(0,g.nebula.seed));assert.equal(g.vital.value,100);g.vital.value=60;destroySpaceObject(g,{id:'ordinary',material:'ice',position:{x:0,y:0},radius:14});assert.equal(g.vital.value,65);
});
test('a continuous boss beam counts hits at its damage interval, rather than every frame',()=>{
 const g=fixture(),u=join(g);g.flight.position.x+=500;g.flight.position.y+=500;g.enemies.shots=[{id:1,kind:'bossLaser',position:{x:u.position.x,y:u.position.y-100},heading:Math.PI,length:200,radius:14,velocity:{x:0,y:0},damage:100,remaining:1.2,hitCooldown:0}];stepEnemies(g,1/60);assert.equal(u.hits,1);for(let i=0;i<10;i++)stepEnemies(g,1/60);assert.equal(u.hits,1);for(let i=0;i<10;i++)stepEnemies(g,1/60);assert.equal(u.hits,2);
});
test('friendly attacks damage actual enemies but do not target the ship or supply PAWs',()=>{
 const g=fixture(),u=join(g),before=g.ship.cells.map(c=>c.hp);g.supplyPaws.units=[{id:'supply',position:{...u.position},radius:14,variant:'green'}];stepEscortPaws(g,1);assert.equal(g.escortPaws.shots.length,0);assert.equal(u.missileUsed,false);assert.deepEqual(g.ship.cells.map(c=>c.hp),before);assert.equal(g.supplyPaws.units.length,1);
});
