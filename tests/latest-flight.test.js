import {createEquippedGame} from './helpers/equippedGame.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,applyCommand} from '../src/prototype/game.js';
import {stepBoost} from '../src/prototype/boost.js';
import {stepEnergy} from '../src/prototype/energy.js';
import {boostChargeGeometry} from '../src/prototype/BoostEffects.js';
import {forceRotationTime,forceSpinTransform,forceRods} from '../src/prototype/force.js';
import {PILOT_EXPRESSIONS,PILOT_CROPS} from '../src/prototype/pilotExpressions.js';
import {stepTrailDamage} from '../src/prototype/trailCombat.js';
import {createCampaign} from '../src/prototype/campaign.js';
import {campaignNebulaRegions,environmentAt,NEBULA_TYPES} from '../src/prototype/nebula.js';
import {stepEnemies} from '../src/prototype/enemies.js';

test('user portrait sheet maps all 21 frames, omits captions and excludes retired heat expressions',()=>{
 assert.equal(PILOT_CROPS.length,21);assert.equal(PILOT_EXPRESSIONS.thinking.frame,3);assert.equal(PILOT_EXPRESSIONS.smile.crop.sourceWidth,1983);assert.ok(PILOT_EXPRESSIONS.stoic.src.includes('expressions-priority-user'));assert.equal(PILOT_EXPRESSIONS.hot,undefined);assert.equal(PILOT_EXPRESSIONS.warm,undefined);for(const c of PILOT_CROPS){assert.ok(c.x+c.width<=1520);assert.ok(c.y+c.height<=954);assert.ok(c.height>=240&&c.height<=260);}
});
test('force continues its projected rotation at a gentler speed even under reduced motion',()=>{
 assert.equal(forceRotationTime(10,true),3);assert.notEqual(forceSpinTransform(1,true),forceSpinTransform(2,true));assert.notDeepEqual(forceRods(forceRotationTime(1,true)),forceRods(forceRotationTime(2,true)));
});
test('retained trail hits enemies only, throttles damage, credits kills once and stops after voyage end',()=>{
 const g=createEquippedGame({campaign:false});g.flight.trail=[{x:-100,y:100},{x:100,y:100},{x:100,y:300}];g.flight.elapsed=1;g.enemies.units=[{id:'in',type:'soldier',hp:5,position:{x:0,y:100}},{id:'out',type:'soldier',hp:10,position:{x:0,y:130}}];const ship=JSON.stringify(g.ship);stepTrailDamage(g,1/60);assert.equal(g.enemies.units[0].hp,3);assert.equal(g.enemies.units[1].hp,10);stepTrailDamage(g,1/60);assert.equal(g.enemies.units[0].hp,3);g.flight.elapsed=1.5;stepTrailDamage(g,1/60);assert.equal(g.enemies.units[0].hp,1);g.flight.elapsed=2;stepTrailDamage(g,1/60);assert.equal(g.enemies.kills,1);g.flight.elapsed=3;stepTrailDamage(g,1/60);assert.equal(g.enemies.kills,1);g.status='ended';stepTrailDamage(g,1/60);assert.equal(JSON.stringify(g.ship),ship);
});
test('enemy site clouds are stable world data, build towards bases and use danger/safety/instability colors without extra spawns',()=>{
 const c=createCampaign(),site=c.sites[0],regions=campaignNebulaRegions({sites:[site]},site.position,500);assert.equal(regions.length,6);const densities=[1100,700,350,0].map(d=>environmentAt(regions,{x:site.position.x,y:site.position.y+d},0).density);for(let i=1;i<densities.length;i++)assert.ok(densities[i]>densities[i-1]);assert.deepEqual(campaignNebulaRegions({sites:[site]},{x:site.position.x+200,y:site.position.y},700),regions);assert.deepEqual(campaignNebulaRegions(null,site.position,500),[]);assert.ok(NEBULA_TYPES[0].color[2]>NEBULA_TYPES[0].color[0]);assert.ok(NEBULA_TYPES[2].color[0]>NEBULA_TYPES[2].color[1]);const g=createEquippedGame({campaign:false});g.nebula.regions=regions;g.enemies.units=[];stepEnemies(g,0);assert.equal(g.enemies.units.filter(e=>e.type!=='pow').length,0);
});
test('boost acceleration is proportional to charge; energy collects behind the live hull and rotates with heading',()=>{
 const impulses=[];for(const seconds of [.3,.6,1.2]){const g=createEquippedGame();applyCommand(g,{type:'place',partType:'engine',x:7,y:11,id:'extra'});g.ship.parts.find(p=>p.type==='tank').stored=160;g.energy=stepEnergy(g.ship,0);stepBoost(g,[{type:'boost-press'}],seconds);const geom=boostChargeGeometry(g);assert.ok(geom.rear>30);assert.ok(geom.position.y>g.flight.position.y);g.flight.heading=Math.PI/2;assert.ok(boostChargeGeometry(g).position.x<g.flight.position.x);stepBoost(g,[{type:'boost-release'}],0);impulses.push(g.boost.lastBurst.impulse);}assert.equal(impulses[1],impulses[0]*2);assert.equal(impulses[2],impulses[1]*2);
});

test('boost capacity starts 20% above the former initial limit and grows for each powered engine',()=>{
 const g=createEquippedGame();assert.equal(g.boost.chargeLimit,.5*1.2);for(const [i,x,y] of [[1,7,11],[2,7,5]]){applyCommand(g,{type:'place',partType:'engine',x,y,id:`added-${i}`});g.ship.parts.find(p=>p.type==='tank').stored=160;g.energy=stepEnergy(g.ship,0);stepBoost(g,[],0);assert.equal(g.boost.engines,i+1);assert.ok(Math.abs(g.boost.chargeLimit-(.6+i*.4))<1e-9);}
 stepBoost(g,[{type:'boost-press'}],5);assert.ok(Math.abs(g.boost.charge-1.4)<1e-9);stepBoost(g,[{type:'boost-release'}],0);assert.ok(Math.abs(g.boost.lastBurst.impulse-184.8)<1e-9);g.ship.parts.find(p=>p.id==='added-2').hp=0;g.ship.revision++;g.energy=stepEnergy(g.ship,0);stepBoost(g,[],0);assert.equal(g.boost.chargeLimit,1);assert.ok(g.boost.remaining>0);
});

import {missionBearing} from '../src/prototype/MissionBearing.js';
test('homeworld arrow follows world bearing on observation rim and stays inside viewport',()=>{const g=createEquippedGame();g.observation=100;g.viewport.scale=1;let p=missionBearing(g,800,600);assert.equal(p.x,324);assert.equal(p.y,308);assert.equal(p.distance,6800);g.flight.heading=2;assert.deepEqual(missionBearing(g,800,600),p);g.observation=1000;p=missionBearing(g,800,600);assert.equal(p.y,65);g.campaign.units.find(e=>e.id==='final-boss').hp=0;assert.equal(missionBearing(g,800,600),null);});
