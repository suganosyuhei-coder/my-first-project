import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,stepGame} from '../src/prototype/game.js';
import {aimTarget,rockWarnings,AIM} from '../src/prototype/targeting.js';
import {RAILGUN,stepRailgun,stepProjectiles} from '../src/prototype/railgun.js';
import {updateWorld} from '../src/prototype/world.js';

test('aim assist picks nearest forward target only within the narrow cone and actual charge range',()=>{
 const g=createGame();g.hazards=[
  {id:'near',type:'impact',position:{x:18,y:-220},radius:14},
  {id:'far',type:'impact',position:{x:0,y:-450},radius:14},
  {id:'outside',type:'impact',position:{x:60,y:-200},radius:14},
  {id:'behind',type:'impact',position:{x:0,y:100},radius:14},
  {id:'dust',type:'dustContact',position:{x:0,y:-120},radius:14},
 ];
 assert.equal(aimTarget(g,0,700,54).rock.id,'near');assert.equal(aimTarget(g,0,100,54),null);
 g.destroyedRocks.add('near');assert.equal(aimTarget(g,0,700,54).rock.id,'far');g.destroyedRocks.add('far');assert.equal(aimTarget(g,0,700,54),null);
 g.destroyedRocks.clear();stepRailgun(g,[{type:'weapon-press'},{type:'weapon-release',heading:0}],0);assert.equal(g.weapon.lastShot.assisted,true);assert.ok(Math.abs(g.weapon.projectiles[0].heading)<=AIM.cone);
 stepProjectiles(g,1/60);assert.equal(g.weapon.lastHit.obstacleId,'near');assert.ok(!g.hazards.some(h=>h.id==='near'));assert.equal(g.weapon.effects.filter(e=>e.type==='beam').length,1);
});

test('destroyed generated rocks remain absent through world rebuild, cannot collide, and reset on restart',()=>{
 const g=createGame(),rock=g.hazards.find(h=>h.type==='impact'&&h.position.x===0);
 assert.ok(rock);g.flight.position={x:0,y:rock.position.y+160};stepRailgun(g,[{type:'weapon-press'},{type:'weapon-release',heading:0}],0);stepProjectiles(g,1/60);
 assert.ok(g.destroyedRocks.has(rock.id));updateWorld(g);assert.ok(!g.hazards.some(h=>h.id===rock.id));
 g.flight.position={...rock.position};for(let i=0;i<10;i++)stepGame(g,0,1/60);assert.equal(g.ship.critical.core,100);assert.equal(g.ship.critical.canopy,100);
 assert.equal(createGame().destroyedRocks.size,0);assert.equal(g.weapon.hits,1);assert.ok(Object.values(g.inventory).every(v=>v===0));
});

test('rock arrival warning occurs once, expires, and does not reappear every tick',()=>{
 const g=createGame();g.rockAlerts.clear();g.warnedRocks.clear();g.hazards=[{id:'new',type:'impact',position:{x:0,y:-200},radius:14},{id:'distant',type:'impact',position:{x:0,y:-1000},radius:14}];
 rockWarnings(g);assert.equal(g.rockAlerts.get('new'),0);assert.ok(!g.rockAlerts.has('distant'));g.flight.elapsed=20;rockWarnings(g);assert.ok(!g.rockAlerts.has('new'));rockWarnings(g);assert.ok(!g.rockAlerts.has('new'));
});

test('beam exists only for its short visual duration and rapid releases independently settle energy',()=>{
 const g=createGame();g.hazards=[];g.ship.parts.find(p=>p.type==='tank').stored=0;
 for(let i=0;i<3;i++){stepRailgun(g,[{type:'weapon-press'},{type:'weapon-release'}],0);stepProjectiles(g,1/60);}
 assert.equal(g.weapon.shots,3);assert.equal(g.weapon.totalSpent,6);assert.equal(g.weapon.effects.filter(e=>e.type==='beam').length,3);assert.equal(g.weapon.projectiles.length,0);
 const beam=g.weapon.effects.find(e=>e.type==='beam');assert.equal(Math.hypot(beam.end.x-beam.position.x,beam.end.y-beam.position.y),RAILGUN.ranges[0]);
 stepProjectiles(g,1);assert.equal(g.weapon.effects.length,0);
});

test('a beam released at contact time removes the rock before it can destroy the canopy',()=>{
 const g=createGame(),rock=g.hazards.find(h=>h.type==='impact'&&h.position.x===0);g.flight.position={x:0,y:rock.position.y+36};g.ship.critical.canopy=30;
 g.commands.push({type:'weapon-press'},{type:'weapon-release',heading:0});stepGame(g,0,1/60);
 assert.equal(g.status,'running');assert.equal(g.ship.critical.canopy,30);assert.ok(g.destroyedRocks.has(rock.id));
});
