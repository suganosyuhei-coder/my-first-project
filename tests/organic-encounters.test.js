import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/prototype/game.js';
import {activateCampaign,moveCampaignSquads} from '../src/prototype/campaign.js';
import {damageEnemy,enemyType} from '../src/prototype/enemyCombat.js';
import {stepAberrant} from '../src/prototype/aberrantEnemies.js';
import {enemyBodies,enemySegmentHit} from '../src/prototype/enemyBodies.js';
import {ORGANIC_ENCOUNTERS,organicLocalBodies} from '../src/prototype/organicEncounters.js';
import {drawOrganicEncounter} from '../src/prototype/OrganicEncounterVisuals.js';
import {triggerTrueBoss} from '../src/prototype/trueBoss.js';

test('all eight former combined sites have the approved biological counts, positions and HP with no old combined units',()=>{
 const g=createGame(),groups=g.campaign.mossGroups;
 assert.equal(groups.length,8);assert.ok(g.campaign.units.every(e=>!['moss','mossSnake','mossCrab'].includes(e.type)));
 for(const [kind,count] of [['eurypterid',24],['earwig',8],['tardigrade',1],['megadictyon',1],['pambdelurion',1]])assert.equal(g.campaign.units.filter(e=>e.type===kind).length,count);
 assert.deepEqual(groups.map(g=>g.home),[{x:-1000,y:-2600},{x:1100,y:-3900},{x:-1400,y:-5500},{x:0,y:1800},{x:1650,y:-2400},{x:-1850,y:-4300},{x:1800,y:0},{x:-1800,y:0}]);
 for(const group of groups){g.flight.position={...group.home};activateCampaign(g);assert.equal(g.enemies.units.filter(e=>e.clusterId===group.id).length,group.count);assert.equal(group.captives,0);assert.ok(g.enemies.units.filter(e=>e.clusterId===group.id).every(e=>e.hp===ORGANIC_ENCOUNTERS[group.type].hp));}
});
test('every replacement chases independently at centipede speed, has ram-only attacks and exact unarmored HP',()=>{
 for(const type of Object.keys(ORGANIC_ENCOUNTERS)){
  const g=createGame(),enemy=g.campaign.units.find(e=>e.type===type),stats=enemyType(enemy);enemy.position={x:0,y:300};enemy.home={...enemy.position};enemy.heading=0;enemy.cooldown=0;g.flight.position={x:0,y:0};g.enemies.units=[enemy];g.enemies.shots=[];
  const hp=enemy.hp;assert.equal(stats.speed,65);assert.equal(stats.shootRange,0);assert.equal(stats.ramDamage,10);
  stepAberrant(g,enemy,stats,1,1,1);assert.equal(enemy.position.y,235);assert.equal(g.enemies.shots.length,0);
  const after={...enemy.position};moveCampaignSquads(g,1);assert.deepEqual(enemy.position,after);
  damageEnemy(g,enemy,20,enemy.position);assert.equal(enemy.hp,hp-20);
 }
});
test('each replacement grants four or twenty VITAL only on defeat, caps at 100, and does not duplicate the site reward',()=>{
 for(const [type,stats] of Object.entries(ORGANIC_ENCOUNTERS)){
  const g=createGame(),enemies=g.campaign.units.filter(e=>e.type===type),enemy=enemies[0];g.vital.value=50;
  damageEnemy(g,enemy,1,enemy.position);assert.equal(g.vital.value,50);
  damageEnemy(g,enemy,10000,enemy.position);assert.equal(g.vital.value,50+stats.vital);assert.equal(g.vital.lastRecovery.amount,stats.vital);
  const score=g.score;damageEnemy(g,enemy,10000,enemy.position);assert.equal(g.vital.value,50+stats.vital);assert.equal(g.score,score);
  const fresh=createGame(),next=fresh.campaign.units.find(e=>e.type===type);fresh.vital.value=99;damageEnemy(fresh,next,10000,next.position);assert.equal(fresh.vital.value,100);
 }
});
test('new red-line species have stable drawing and their long bodies can be hit away from the head',()=>{
 for(const type of Object.keys(ORGANIC_ENCOUNTERS)){
  const enemy={type,position:{x:0,y:0},heading:.7},bodies=enemyBodies(enemy);assert.equal(bodies.length,organicLocalBodies(type).length);
  const tail=bodies.at(-1).position;assert.notEqual(enemySegmentHit({x:tail.x-100,y:tail.y},{x:tail.x+100,y:tail.y},enemy,1),null);
  const operations=[];const ctx=new Proxy({},{get(_,key){return(...args)=>operations.push([key,...args]);},set(_,key,value){operations.push([key,value]);return true;}});
  drawOrganicEncounter(ctx,type,1);assert.ok(operations.some(op=>op[0]==='strokeStyle'&&op[1]==='#dd7474'));assert.ok(operations.filter(op=>op[0]==='stroke').length>=bodies.length);
 }
});
test('true boss gate requires every replacement enemy at all eight sites and the homeworld victory',()=>{
 const g=createGame();g.campaign.bossCleared=true;g.campaign.units.find(e=>e.id==='final-boss').hp=0;
 const enemies=g.campaign.units.filter(e=>e.organicEncounter);enemies.slice(0,-1).forEach(e=>e.hp=0);assert.equal(triggerTrueBoss(g),false);
 enemies.at(-1).hp=0;assert.equal(triggerTrueBoss(g),true);assert.equal(triggerTrueBoss(g),false);
});
