import {createEquippedGame} from './helpers/equippedGame.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,stepGame} from '../src/prototype/game.js';
import {createWeaponInput} from '../src/prototype/weaponInput.js';
import {RAILGUN,stepRailgun,stepProjectiles,segmentHit} from '../src/prototype/railgun.js';
import {applyContact} from '../src/prototype/damage.js';
import {cellToWorld} from '../src/prototype/ship.js';
function charged(seconds){const g=createEquippedGame({force:false});g.ship.parts.find(p=>p.type==='tank').stored=160;stepRailgun(g,[{type:'weapon-press'}],0);for(let t=0;t<seconds-1e-8;t+=1/60)stepRailgun(g,[],1/60);return g;}
function release(g,heading=0){stepRailgun(g,[{type:'weapon-release',heading}],0);return g.weapon.lastShot;}
test('four nonlinear charge stages, maximum holds without auto fire, repeat release fires once',()=>{
 for(const [seconds,stage] of [[0,0],[1.2,1],[2.5,2],[3.6,3]]){const g=charged(seconds);assert.equal(g.weapon.shots,0);const shot=release(g);assert.equal(shot.stage,stage);assert.ok(shot.damage>=RAILGUN.damage[stage]);assert.equal(g.weapon.charge,0);release(g);assert.equal(g.weapon.shots,1);}
 const ready=createEquippedGame({force:false});stepGame(ready,0,1/60);assert.equal(ready.energy.status['railgun-0'],'射撃時精算');
 const g=charged(4);assert.equal(g.weapon.heldSeconds,RAILGUN.maxChargeSeconds/1.1);assert.equal(g.weapon.charge,RAILGUN.maxCharge);stepRailgun(g,[{type:'weapon-press'}],1/60);assert.equal(g.weapon.charge,RAILGUN.maxCharge);
 const low=release(charged(1.0)).damage,high=release(charged(1.7)).damage;assert.ok(high>low);
});
test('energy is settled only on release, keeps charge stage regardless of live balance, never consumes disconnected storage',()=>{
 const g=charged(2.5),tank=g.ship.parts.find(p=>p.type==='tank');assert.equal(tank.stored,160);tank.stored=13;let shot=release(g);assert.equal(shot.stage,2);assert.equal(shot.cost,32);assert.equal(tank.stored,0);
 const h=charged(2.5),t=h.ship.parts.find(p=>p.type==='tank');t.stored=0;shot=release(h);assert.equal(shot.stage,2);assert.ok(shot.damage>=100);assert.equal(shot.paid,0);assert.equal(shot.base,32);assert.equal(t.stored,0);
 const isolated=charged(2.5);isolated.ship.parts=isolated.ship.parts.filter(p=>p.type!=='pipe');isolated.ship.revision++;const stored=isolated.ship.parts.find(p=>p.type==='tank').stored;shot=release(isolated);assert.equal(shot.stage,2);assert.equal(shot.base,32);assert.equal(isolated.ship.parts.find(p=>p.type==='tank').stored,stored);
});
test('zero energy and destroyed enhancement permit repeated minimum shots, critical destruction stops shooting',()=>{
 const g=createEquippedGame({force:false});g.ship.parts.find(p=>p.type==='tank').stored=0;g.ship.parts.find(p=>p.type==='railgun').hp=0;g.ship.revision++;
 for(let i=0;i<20;i++)stepRailgun(g,[{type:'weapon-press'},{type:'weapon-release'}],0);
 assert.equal(g.weapon.shots,20);assert.equal(g.weapon.baseGenerated,40);assert.equal(g.weapon.totalSpent,40);assert.equal(g.ship.parts.find(p=>p.type==='tank').stored,0);assert.ok(g.weapon.projectiles.every(p=>p.stage===0));
 for(const role of ['canopy','core']){const h=charged(1);applyContact(h,{type:'impact',position:cellToWorld({x:5,y:role==='core'?9:4},h.flight),damage:1000});assert.equal(h.weapon.holding,false);release(h);assert.equal(h.weapon.shots,0);assert.equal(h.weapon.projectiles.length,0);}
});
test('release heading determines a full-range beam without recoil',()=>{
 const g=charged(2.4);const flight=JSON.stringify(g.flight);release(g,Math.PI/2);assert.equal(JSON.stringify(g.flight),flight);const p=g.weapon.projectiles[0];assert.ok(p.velocity.x>0);assert.ok(Math.abs(p.velocity.y)<1e-8);stepProjectiles(g,.1);const beam=g.weapon.effects.find(e=>e.type==='beam');assert.ok(beam.end.x>beam.position.x+600);assert.equal(g.weapon.projectiles.length,0);assert.equal(JSON.stringify(g.flight),flight);
});
test('beam penetrates and destroys all rocks/obstacles, ignores materials/ship/environment; loot does not damage hull',()=>{
 const g=charged(2.4);release(g);const p=g.weapon.projectiles[0];g.hazards=[{id:'dust',type:'dustContact',position:{x:0,y:-60},radius:40},{id:'heat',type:'heatContact',position:{x:0,y:-65},radius:40},{id:'near',type:'impact',position:{x:0,y:-100},radius:10},{id:'far',type:'obstacle',position:{x:0,y:-150},radius:10}];g.resources=[{id:'material',position:{x:0,y:-60},state:'available'}];
 const ship=JSON.stringify(g.ship.cells);stepProjectiles(g,.5);assert.equal(g.weapon.hits,2);assert.equal(g.weapon.lastHit.obstacleId,'far');assert.equal(g.weapon.projectiles.length,0);assert.ok(!g.hazards.some(h=>h.id==='near'));assert.ok(g.destroyedRocks.has('near'));assert.ok(g.destroyedRocks.has('far'));assert.ok(!g.hazards.some(h=>h.id==='far'));assert.equal(JSON.stringify(g.ship.cells),ship);assert.equal(g.resources[0].state,'available');assert.ok(g.weapon.lastHit.damage===p.damage);
 assert.equal(segmentHit({x:0,y:0},{x:0,y:-200},{x:0,y:-100},1),.495);assert.equal(segmentHit({x:0,y:0},{x:0,y:-200},{x:10,y:-100},1),null);
 const h=charged(0);release(h);h.hazards=[];stepProjectiles(h,100);assert.equal(h.weapon.projectiles.length,0);
});
test('input suppresses repeat/native Space craft activation, preserves short taps, cancels blur/text focus',()=>{
 const queued=[],input=createWeaponInput({enqueue:a=>queued.push(a),isRunning:()=>true,heading:()=>1.23});let prevented=0;
 const e=(repeat=false,tagName='BUTTON')=>({code:'Space',repeat,target:{tagName},preventDefault:()=>prevented++});
 input.down(e());input.down(e(true));input.up(e());assert.deepEqual(queued.map(a=>a.type),['weapon-press','weapon-release']);assert.equal(queued[1].heading,1.23);assert.equal(prevented,3);
 input.down(e());input.cancel();input.up(e());assert.equal(queued.at(-1).type,'weapon-cancel');input.down(e(false,'INPUT'));assert.equal(queued.at(-1).type,'weapon-cancel');
 input.down(e());input.focus({target:{tagName:'INPUT'}});input.up(e());assert.equal(queued.at(-1).type,'weapon-cancel');
});
test('charging and rapid shots leave navigation, craft and collection running; retry resets shooting',()=>{
 const g=createEquippedGame({force:false});g.commands.push({type:'weapon-press'},{type:'collect',id:'resource-tank'});for(let i=0;i<180;i++)stepGame(g,0,1/60);assert.ok(g.flight.elapsed>2.9);assert.ok(g.flight.maxDistance>60);assert.ok(g.weapon.holding);assert.ok(g.bits.some(b=>b.state!=='orbiting'));
 const count=g.ship.parts.length;g.commands.push({type:'place',partType:'pipe',x:7,y:10,id:'new-pipe'});stepGame(g,0,1/60);assert.equal(g.ship.parts.length,count+1);assert.ok(g.weapon.holding);
 g.commands.push({type:'weapon-release'},{type:'weapon-press'},{type:'weapon-release'});stepGame(g,0,1/60);assert.equal(g.weapon.shots,2);assert.equal(createEquippedGame({force:false}).weapon.shots,0);
});

test('all wave stages remain usable without tanks, pipes or railgun equipment',()=>{for(const seconds of [.4,2.4,3.6]){const g=createEquippedGame({force:false});g.ship.parts=g.ship.parts.filter(p=>!['tank','pipe','railgun'].includes(p.type));g.ship.revision++;stepRailgun(g,[{type:'weapon-press'}],seconds);const shot=release(g);assert.equal(shot.stage,seconds===.4?1:seconds===2.4?2:3);assert.equal(shot.paid,0);assert.equal(shot.base,shot.cost);}});
