import {createEquippedGame} from './helpers/equippedGame.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {NEBULA,NEBULA_TYPES,generateNebula,nebulaRegions,regionDensity,environmentAt,environmentForFlight,updateNebula,stepNebulaContacts,stepNebulaObservation,requestAnalysis} from '../src/prototype/nebula.js';
import {createGame,stepGame,snapshot} from '../src/prototype/game.js';
import {createFlight,stepFlight} from '../src/prototype/model.js';
import {requestCollection} from '../src/prototype/collection.js';

test('nebula generation is seeded, order-independent, sparse, and includes four variable types and five shapes',()=>{
 const a=nebulaRegions(7309,{x:0,y:0},2500),b=nebulaRegions(7309,{x:0,y:0},2500);
 assert.deepEqual(a,b);assert.notDeepEqual(a,nebulaRegions(7310,{x:0,y:0},2500));assert.equal(generateNebula(7309,0,0),null);
 assert.deepEqual(new Set(a.map(r=>r.type)),new Set(NEBULA_TYPES.map(t=>t.id)));assert.equal(new Set(a.map(r=>r.shape)).size,5);
 const d=a.filter(r=>r.type==='diffuse');assert.ok(d.length>1&&d[0].occlusion!==d[1].occlusion);
 const lookup=a[5],revisited=nebulaRegions(7309,lookup.position,50).find(r=>r.id===lookup.id);assert.deepEqual(lookup,revisited);
});

test('shared world/time field evolves continuously; empty space and out-of-support samples have zero effects',()=>{
 const region=generateNebula(7309,0,-1),point={x:region.position.x+30,y:region.position.y+25};
 const d=regionDensity(region,point,4);assert.equal(d,regionDensity(region,point,4));assert.ok(d>0);
 assert.ok(Math.abs(d-regionDensity(region,point,4.01))<.001);assert.notEqual(d,regionDensity(region,point,30));
 assert.equal(regionDensity(region,{x:10000,y:10000},4),0);
 assert.deepEqual(environmentAt([region],{x:10000,y:10000},4),environmentAt([],point,4));
 assert.equal(environmentAt([],point,4).visibility,1);
});

test('density, flow and turbulence affect motion while preserving minimum forward speed',()=>{
 const region={...generateNebula(7309,0,-1),density:2,turbulence:2,occlusion:1};
 const field=environmentAt([region],region.position,15),cloud=createFlight(),clear=createFlight();
 for(let i=0;i<120;i++){stepFlight(cloud,0,1/60,12,environmentForFlight(field));stepFlight(clear,0,1/60,12);}
 assert.ok(Math.abs(cloud.position.x-clear.position.x)>.01);assert.notEqual(cloud.heading,clear.heading);assert.ok(field.visibility<1);
 const forward=cloud.velocity.x*Math.sin(cloud.heading)-cloud.velocity.y*Math.cos(cloud.heading);assert.ok(forward>=12-1e-8);
});

test('observation hides details until analysis, pauses outside range or without power, resumes and upgrades separately from viewport',()=>{
 const game=createEquippedGame(),region=game.nebula.regions.find(r=>r.id.endsWith('-0--1'));assert.ok(region);
 game.flight.position={...region.position};game.observation=140;stepNebulaObservation(game,0);
 const record=game.nebula.observations[region.id];assert.equal(record.state,'detected');assert.equal(record.details,undefined);
 assert.ok(requestAnalysis(game,region.id).ok);stepNebulaObservation(game,1);assert.equal(record.progress,.25);
 game.observation=0;stepNebulaObservation(game,10);assert.equal(record.progress,.25);
 game.observation=140;game.flight.position={x:3000,y:3000};stepNebulaObservation(game,10);assert.equal(record.progress,.25);
 game.flight.position={...region.position};stepNebulaObservation(game,3);assert.equal(record.state,'analyzed');assert.equal(record.details.type,region.type);
 const g=createEquippedGame();g.ship.parts.push({id:'observer-extra',type:'observer',x:7,y:10,hp:100,stored:0,appearance:{}});g.ship.parts.find(p=>p.type==='engine').hp=0;
 g.ship.parts.find(p=>p.type==='tank').stored=100;g.ship.revision++;stepGame(g,0,1/60);assert.equal(g.baseObservation,140);
 const before=g.baseObservation;g.viewport={width:300,height:200,scale:.5};stepGame(g,0,1/60);assert.equal(g.baseObservation,before);
});

test('heat affects one exposed cell lightly without widespread red damage or instant overload',()=>{
 const game=createEquippedGame(),region={...generateNebula(7309,0,-1),position:{x:0,y:0},extent:{x:2000,y:2000},density:3,heat:1,abrasion:1};
 game.nebula.regions=[];stepNebulaContacts(game,.5);assert.ok(game.ship.cells.every(c=>Object.keys(c.appearance).length===0));
 game.nebula.regions=[region];stepNebulaContacts(game,.5);assert.ok(game.ship.cells.some(c=>c.appearance.dust>0&&c.appearance.burn>0&&c.appearance.scratch>0));
 const owners=[...game.ship.cells,...game.ship.parts],damaged=owners.filter(c=>c.hp<100);assert.equal(damaged.length,1);assert.ok(damaged[0].hp>99.9);assert.equal(game.status,'running');assert.deepEqual(game.ship.critical,{canopy:100,core:100});
 for(let i=0;i<120;i++)stepNebulaContacts(game,.5);assert.equal(game.status,'running');assert.ok(owners.filter(c=>c.hp<100).length<=2);
});

test('gas observation inhibition refuses new clicks but active cooperative recovery, craft and minimum shots keep running',()=>{
 const game=createEquippedGame(),resource=game.resources.find(r=>r.type==='tank');resource.discovered=true;assert.ok(requestCollection(game,resource.id).ok);
 game.ship.parts.find(p=>p.type==='observer').hp=0;game.ship.parts.find(p=>p.type==='tank').stored=0;
 game.flight.position={...generateNebula(7309,0,-1).position};updateNebula(game);assert.ok(game.nebula.field.density>0);
 const before=game.flight.elapsed;game.commands.push({type:'place',partType:'pipe',x:7,y:10,id:'test-new-pipe'},{type:'weapon-press'},{type:'weapon-release',heading:0});stepGame(game,0,1/60);
 assert.equal(game.observation,140);assert.equal(game.weapon.shots,1);assert.ok(game.ship.parts.some(p=>p.id==='test-new-pipe'));assert.ok(game.flight.elapsed>before);
 assert.equal(requestCollection(game,game.resources.find(r=>r.state==='available').id).ok,false);
 for(let i=0;i<1800&&game.status==='running'&&!game.jobs.some(j=>j.resourceId===resource.id&&j.credited);i++)stepGame(game,-.2,1/60);
 assert.equal(game.inventory.tank,0);assert.ok(game.jobs.some(j=>j.resourceId===resource.id&&j.credited));
});

test('rendering snapshots and viewport changes do not advance simulation or mutate the density field',()=>{
 const game=createEquippedGame(),before=JSON.stringify(game);for(let i=0;i<20;i++)snapshot(game);assert.equal(JSON.stringify(game),before);
 const field=environmentAt(game.nebula.regions,game.flight.position,5);game.viewport={width:1700,height:1000,scale:1.55};updateNebula(game);assert.deepEqual(environmentAt(game.nebula.regions,game.flight.position,5),field);
});
