import {createEquippedGame} from './helpers/equippedGame.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,stepGame,snapshot,applyCommand} from '../src/prototype/game.js';
import {shipCells,cellToWorld} from '../src/prototype/ship.js';
import {requestCollection,stepCollection} from '../src/prototype/collection.js';
import {stepRailgun,stepProjectiles,RAILGUN} from '../src/prototype/railgun.js';
import {BOOST,stepBoost,boostSupply} from '../src/prototype/boost.js';
import {stepEnergy} from '../src/prototype/energy.js';
import {createBoostInput} from '../src/prototype/boostInput.js';
import {createWeaponInput} from '../src/prototype/weaponInput.js';
import {CAMERA,flightScale} from '../src/prototype/camera.js';
import {NEBULA_DETAIL,observationDetailWeight,observationCrop} from '../src/prototype/nebulaDetail.js';
import {applyContact} from '../src/prototype/damage.js';
import {createFlight,stepFlight} from '../src/prototype/model.js';

function twoEngines(){const g=createEquippedGame();applyCommand(g,{type:'place',partType:'engine',x:7,y:11,id:'engine-extra'});g.ship.parts.find(p=>p.type==='tank').stored=160;g.energy=stepEnergy(g.ship,1/60);return g;}
function chargeBoost(g,seconds=BOOST.chargeSeconds){stepBoost(g,[{type:'boost-press'}],0);for(let t=0;t<seconds-1e-9;t+=1/60)stepBoost(g,[],1/60);}

test('shared flight cells add/remove/reposition exactly with craft and hide damaged parts',()=>{
 const g=createEquippedGame(),before=shipCells(g.ship).map(c=>`${c.x},${c.y}`);
 applyCommand(g,{type:'place',partType:'tank',x:7,y:11,id:'extra'});let cells=shipCells(g.ship).filter(c=>c.part?.id==='extra');assert.deepEqual(cells.sort((a,b)=>a.y-b.y||a.x-b.x).map(c=>[c.x,c.y]),[[7,11],[8,11],[7,12],[8,12]]);
 g.ship.parts.find(p=>p.id==='extra').x=8;g.ship.parts.find(p=>p.id==='extra').y=12;cells=shipCells(g.ship).filter(c=>c.part?.id==='extra');assert.ok(cells.every(c=>c.x>=8&&c.y>=12));
 g.ship.parts.find(p=>p.id==='extra').hp=0;assert.equal(shipCells(g.ship).filter(c=>c.part?.id==='extra').length,0);
 applyCommand(g,{type:'remove',x:8,y:12});assert.deepEqual(shipCells(g.ship).map(c=>`${c.x},${c.y}`),before);
});

test('automatic recovery uses discovered observation targets beyond the old proximity radius and reserves only required bits',()=>{
 const g=createEquippedGame();g.resources=[{id:'one',type:'wire',position:{x:0,y:-100},state:'available',discovered:true},{id:'two',type:'tank',position:{x:0,y:-120},state:'available',discovered:true}];
 assert.equal(requestCollection(g,'one','auto').ok,true);assert.equal(g.jobs[0].bitIds.length,1);assert.equal(requestCollection(g,'two','auto').ok,true);assert.equal(requestCollection(g,'one','auto').ok,false);
 const h=createEquippedGame();h.resources=g.resources.map(r=>({...r,state:'available',discovered:true}));h.resources[0].discovered=false;assert.equal(requestCollection(h,'one','auto').ok,false);
 assert.equal(requestCollection(h,'two','auto').ok,true);assert.equal(h.jobs[0].bitIds.length,2);h.observation=0;h.viewport.width=1;const job=h.jobs[0];
 for(let i=0;i<1200&&job.stage!=='complete';i++)stepCollection(h,1/60);
 assert.equal(h.inventory.tank,0);for(let i=0;i<100;i++)stepCollection(h,1/60);assert.equal(h.inventory.tank,0);
 const outside=createEquippedGame();outside.resources=[{id:'out',type:'wire',position:{x:0,y:-141},state:'available',discovered:true}];assert.equal(requestCollection(outside,'out','auto').ok,false);
});

test('same-tick clicks have priority over expanded automatic recovery; active cooperative jobs never get preempted',()=>{
 const g=createEquippedGame({force:false});g.resources=[{id:'auto',type:'wire',position:{x:0,y:-100},state:'available',discovered:true},{id:'clicked',type:'tank',position:{x:20,y:-120},state:'available',discovered:true}];g.commands.push({type:'collect',id:'clicked'});stepGame(g,0,1/60);
 assert.equal(g.jobs[0].resourceId,'clicked');assert.equal(g.jobs.length,2);assert.equal(g.bits.filter(b=>b.state==='outbound').length,3);assert.equal(g.resources.find(r=>r.id==='auto').state,'reserved');
 g.commands.push({type:'collect',id:'auto'});stepGame(g,0,1/60);assert.equal(g.jobs.length,2);assert.equal(g.jobs[0].resourceId,'clicked');
});

test('short shots are fast moving tracers, sweep rocks, ignore resources, leave flash/afterglow and cannot hit twice',()=>{
 const g=createEquippedGame({force:false});g.hazards=[{id:'rock',type:'impact',position:{x:0,y:-210},radius:14}];g.resources=[{id:'cargo',type:'wire',position:{x:0,y:-160},state:'available',discovered:true}];
 stepRailgun(g,[{type:'weapon-press'},{type:'weapon-release',heading:0}],0);const p=g.weapon.projectiles[0];assert.equal(p.stage,0);assert.equal(Math.hypot(p.velocity.x,p.velocity.y),RAILGUN.speeds[0]);
 stepProjectiles(g,1/60);assert.ok(p.position.y<p.origin.y);assert.equal(g.weapon.hits,0);assert.ok(g.weapon.effects.some(e=>e.type==='muzzle'));assert.ok(g.weapon.effects.some(e=>e.type==='trail'));assert.ok(!g.weapon.effects.some(e=>e.type==='beam'));
 stepProjectiles(g,.2);assert.equal(g.weapon.lastHit.obstacleId,'rock');assert.equal(g.weapon.hits,1);assert.ok(g.destroyedRocks.has('rock'));assert.equal(g.resources[0].state,'available');stepProjectiles(g,.3);assert.equal(g.weapon.hits,1);
});

test('two powered engines unlock full boost, charging reserves no energy, release settles energy once and stores its forward direction',()=>{
 const locked=createEquippedGame();locked.energy=stepEnergy(locked.ship,1/60);stepBoost(locked,[{type:'boost-press'},{type:'boost-release'}],0);assert.equal(locked.boost.bursts,0);
 const g=twoEngines(),tank=g.ship.parts.find(p=>p.type==='tank'),before=tank.stored;chargeBoost(g);assert.equal(tank.stored,before);assert.equal(g.boost.charge,1);
 const priorFlight=JSON.stringify(g.flight);stepBoost(g,[{type:'boost-release',heading:Math.PI/2}],0);assert.equal(g.boost.bursts,1);assert.ok(g.boost.velocity.x>70);assert.ok(Math.abs(g.boost.velocity.y)<1e-9);assert.equal(JSON.stringify(g.flight),priorFlight);assert.ok(Math.abs(tank.stored-before)<1e-9);
 stepBoost(g,[{type:'boost-release'}],0);assert.equal(g.boost.bursts,1);
});

test('boost rejects insufficient/isolated energy; engine loss cancels charged output',()=>{
 const g=twoEngines();chargeBoost(g);g.ship.parts.find(p=>p.type==='tank').stored=0;stepBoost(g,[{type:'boost-release'}],0);assert.equal(g.boost.bursts,1);assert.equal(g.boost.lastBurst.cost,0);
 const h=twoEngines();chargeBoost(h);h.ship.parts.push({id:'isolated',type:'tank',x:9,y:0,hp:100,stored:160,appearance:{}});h.ship.parts.find(p=>p.id==='tank-0').stored=0;assert.equal(boostSupply(h).available,0);stepBoost(h,[{type:'boost-release'}],0);assert.equal(h.boost.bursts,1);assert.equal(h.ship.parts.find(p=>p.id==='isolated').stored,160);
 const removed=twoEngines();chargeBoost(removed);applyCommand(removed,{type:'remove',x:7,y:11});removed.energy=stepEnergy(removed.ship,1/60);stepBoost(removed,[{type:'boost-release'}],0);assert.equal(removed.boost.holding,false);assert.equal(removed.boost.bursts,1);
 const cut=twoEngines();applyCommand(cut,{type:'remove',x:6,y:11});cut.energy=stepEnergy(cut.ship,1/60);stepBoost(cut,[{type:'boost-press'}],0);assert.equal(cut.boost.enabled,true);assert.equal(cut.boost.level,2);
});

test('boost increases actual flight speed/distance without stopping craft or collection; critical destruction and retry cancel it',()=>{
 const g=twoEngines();chargeBoost(g);const t=g.flight.elapsed,d=g.flight.maxDistance;g.commands.push({type:'boost-release',heading:0},{type:'place',partType:'pipe',x:7,y:10,id:'during-boost'});stepGame(g,0,1/60);
 assert.ok(Math.hypot(g.flight.velocity.x,g.flight.velocity.y)>100);assert.ok(g.flight.maxDistance>d+1);assert.ok(g.flight.elapsed>t);assert.ok(g.ship.parts.some(p=>p.id==='during-boost'));assert.ok(g.jobs.length>0);
 for(let i=0;i<90;i++)stepGame(g,0,1/60);assert.equal(g.boost.remaining,0);assert.deepEqual(g.boost.velocity,{x:0,y:0});
 const h=twoEngines();chargeBoost(h);stepBoost(h,[{type:'boost-release'}],0);applyContact(h,{type:'impact',position:cellToWorld({x:5,y:9},h.flight),damage:1000});assert.equal(h.status,'ended');assert.equal(h.boost.remaining,0);assert.deepEqual(h.boost.velocity,{x:0,y:0});assert.equal(createEquippedGame().boost.bursts,0);
});

test('concurrent shooting and boost cannot overdraw shared energy; short/blur/shortcut/dual-Shift inputs are safe',()=>{
 const g=twoEngines();chargeBoost(g);g.ship.parts.find(p=>p.type==='tank').stored=BOOST.baseCost+BOOST.extraCost;
 g.commands.push({type:'weapon-press'},{type:'weapon-release'},{type:'boost-release'});stepGame(g,0,1/60);assert.equal(g.weapon.shots,1);assert.equal(g.boost.bursts,1);assert.ok(g.ship.parts.every(p=>(p.stored||0)>=0));
 const queued=[],input=createBoostInput({enqueue:a=>queued.push(a),isRunning:()=>true,heading:()=>.6}),shot=createWeaponInput({enqueue:a=>queued.push(a),isRunning:()=>true,heading:()=>.6});
 const e=(code,extra={})=>({code,target:{tagName:'BUTTON'},preventDefault(){},...extra});input.down(e('ShiftLeft'));input.down(e('ShiftLeft',{repeat:true}));input.down(e('ShiftRight'));shot.down(e('Space'));shot.up(e('Space'));input.up(e('ShiftLeft'));assert.equal(queued.filter(a=>a.type==='boost-release').length,0);input.up(e('ShiftRight'));assert.deepEqual(queued.map(a=>a.type),['boost-press','weapon-press','weapon-release','boost-release']);
 input.down(e('ShiftLeft'));input.down(e('Tab'));input.up(e('ShiftLeft'));assert.equal(queued.at(-1).type,'boost-cancel');input.down(e('ShiftLeft'));input.down(e('Tab'));input.down(e('ShiftRight'));input.up(e('ShiftRight'));assert.equal(queued.at(-1).type,'boost-cancel');input.up(e('ShiftLeft'));input.down(e('ShiftLeft'));input.cancel();input.up(e('ShiftLeft'));assert.equal(queued.at(-1).type,'boost-cancel');const count=queued.length;input.down(e('ShiftLeft',{target:{tagName:'INPUT'}}));assert.equal(queued.length,count);input.down(e('ShiftLeft',{ctrlKey:true}));input.up(e('ShiftLeft'));input.down(e('ShiftLeft'));assert.equal(queued.at(-1).type,'boost-press');input.cancel();
 const short=twoEngines();stepBoost(short,[{type:'boost-press'},{type:'boost-release'}],0);assert.equal(short.boost.bursts,0);
});

test('camera zoom changes screen coverage only and observation detail feather is continuous, local and upgrade-aware',()=>{
 const g=createEquippedGame();assert.ok(CAMERA.zoomOut>=.15&&CAMERA.zoomOut<=.2);assert.equal(g.viewport.scale,flightScale());stepGame(g,0,1/60);const radius=g.observation;
 g.viewport.scale*=.7;stepGame(g,0,1/60);assert.equal(g.observation,radius);assert.equal(observationDetailWeight({x:0,y:0},{x:0,y:0},radius),1);assert.equal(observationDetailWeight({x:radius+1,y:0},{x:0,y:0},radius),0);assert.equal(observationDetailWeight({x:0,y:0},{x:0,y:0},0),0);
 const mid=radius-NEBULA_DETAIL.feather/2;assert.ok(Math.abs(observationDetailWeight({x:mid,y:0},{x:0,y:0},radius)-.5)<1e-9);
 assert.ok(Math.abs(observationDetailWeight({x:mid,y:0},{x:0,y:0},radius)-observationDetailWeight({x:mid+.01,y:0},{x:0,y:0},radius))<.001);
 const crop=observationCrop(1000,600,flightScale(),radius);assert.equal(crop.width,2*radius*flightScale());
 applyCommand(g,{type:'place',partType:'observer',x:7,y:10,id:'more-observation'});g.ship.parts.find(p=>p.type==='tank').stored=160;stepGame(g,0,1/60);assert.equal(g.observation,140);
 g.ship.parts.find(p=>p.id==='more-observation').hp=0;g.ship.revision++;stepGame(g,0,1/60);assert.equal(g.observation,140);const before=JSON.stringify(g);snapshot(g);assert.equal(JSON.stringify(g),before);
});

test('damaged engines cancel boost and the minimum forward guarantee also holds against a backwards impulse',()=>{
 const g=twoEngines();chargeBoost(g);stepBoost(g,[{type:'boost-release'}],0);assert.ok(g.boost.remaining>0);
 applyContact(g,{type:'impact',position:cellToWorld({x:7,y:11},g.flight),damage:1000});g.energy=stepEnergy(g.ship,1/60);stepBoost(g,[],1/60);assert.equal(g.boost.enabled,true);assert.equal(g.boost.level,1);assert.ok(g.boost.remaining>0);assert.ok(Math.hypot(g.boost.velocity.x,g.boost.velocity.y)>0);
 const flight=createFlight();stepFlight(flight,0,1/60,12,{minimumSpeed:12,drag:0,lateral:0,turn:0},{x:0,y:80});assert.equal(flight.velocity.y,-12);assert.ok(flight.maxDistance>0);
});
