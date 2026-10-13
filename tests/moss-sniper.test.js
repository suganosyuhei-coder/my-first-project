import test from 'node:test';
import assert from 'node:assert/strict';
import {createEquippedGame} from './helpers/equippedGame.js';
import {CAMPAIGN,activateCampaign,campaignSnapshot} from '../src/prototype/campaign.js';
import {damageEnemy,enemyType} from '../src/prototype/enemyCombat.js';
import {stepEnemies} from '../src/prototype/enemies.js';
import {campaignNebulaRegions,environmentAt} from '../src/prototype/nebula.js';
import {bossTentacleTips} from '../src/prototype/enemyAnatomy.js';
import {launchBossAttack} from '../src/prototype/bossAttacks.js';
function isolated(){const g=createEquippedGame();g.nebula.regions=[];g.enemies.units=[];g.bits=[];g.hazards=[];return g;}
test('one complete moss cluster is opposite the homeworld, with four snipers at every front base',()=>{
 const g=isolated(),group=g.campaign.mossGroups.find(e=>e.home.y>0);assert.ok(group);assert.equal(group.home.x,0);assert.ok(CAMPAIGN.home.y<0);assert.equal(group.home.y,1800);
 g.flight.position={...group.home};activateCampaign(g);assert.equal(g.enemies.units.filter(e=>e.clusterId===group.id).length,8);
 for(const site of g.campaign.sites.filter(e=>e.kind==='front'))assert.equal(g.campaign.units.filter(e=>e.siteId===site.id&&e.type==='sniper').length,4);
});
test('individual moss deaths remove guns and only the eighth death earns one orange star, retained on revisit and reset on retry',()=>{
 const g=isolated(),group=g.campaign.mossGroups.find(e=>e.home.y>0),members=g.campaign.units.filter(e=>e.clusterId===group.id);g.campaign.squads=[];g.flight.position={x:group.home.x,y:group.home.y+200};
 members.forEach(e=>e.cooldown=0);stepEnemies(g,0);assert.equal(g.enemies.shots.length,8);g.enemies.shots=[];
 damageEnemy(g,members[0],1000,members[0].position);members.forEach(e=>e.cooldown=0);stepEnemies(g,0);assert.equal(g.enemies.shots.length,7);
 for(const e of members.slice(1,7))damageEnemy(g,e,1000,e.position);assert.equal(campaignSnapshot(g).mossDefeated,0);
 damageEnemy(g,members[7],1000,members[7].position);assert.equal(campaignSnapshot(g).mossDefeated,1);damageEnemy(g,members[7],1000,members[7].position);assert.equal(campaignSnapshot(g).mossDefeated,1);
 g.flight.position={x:9999,y:9999};activateCampaign(g);g.flight.position={...group.home};activateCampaign(g);assert.equal(g.enemies.units.filter(e=>e.clusterId===group.id).length,0);assert.equal(campaignSnapshot(g).mossDefeated,1);assert.equal(campaignSnapshot(isolated()).mossDefeated,0);
});
test('red moss marker cloud is visible without environmental damage and disappears when its eight members die',()=>{
 const g=isolated(),group=g.campaign.mossGroups.find(e=>e.home.y>0);const cloud=campaignNebulaRegions(g.campaign,group.position,500).find(e=>e.campaignSite===group.id);assert.ok(cloud);assert.deepEqual(cloud.color,[1,.06,.12]);assert.deepEqual(environmentAt([cloud],group.position,10),environmentAt([],group.position,10));
 g.campaign.units.filter(e=>e.clusterId===group.id).forEach(e=>e.hp=0);assert.ok(!campaignNebulaRegions(g.campaign,group.position,500).some(e=>e.campaignSite===group.id));
});
test('sniper locks a visible warning for 1.2 seconds before firing a narrow laser',()=>{
 const g=isolated(),e=g.campaign.units.find(e=>e.type==='sniper');g.campaign.units=[e];g.campaign.squads=[];g.flight.position={x:e.position.x+200,y:e.position.y+100};e.cooldown=0;
 stepEnemies(g,0);assert.equal(e.warning,1.2);const heading=e.attackHeading;g.flight.position.x+=100;stepEnemies(g,1.19);assert.equal(g.enemies.shots.length,0);assert.equal(e.attackHeading,heading);stepEnemies(g,.02);assert.equal(g.enemies.shots.length,1);assert.equal(g.enemies.shots[0].kind,'sniperLaser');assert.equal(g.enemies.shots[0].radius,2.5);assert.equal(g.enemies.shots[0].heading,heading);
});
test('final boss balls originate from all four animated tentacle tips',()=>{
 const g=isolated(),e=g.campaign.units.find(e=>e.type==='finalBoss');e.heading=.7;e.attackHeading=.3;e.attackCycle=1;g.enemies.time=2;launchBossAttack(g.enemies,e,enemyType(e),1);const tips=bossTentacleTips(e,2),orbs=g.enemies.shots.filter(s=>s.kind==='bossOrb'&&!s.mouth);assert.equal(orbs.length,20);for(const s of orbs)assert.deepEqual(s.position,tips[s.tentacle]);assert.equal(new Set(orbs.map(s=>s.tentacle)).size,4);
});
test('stronger snake and crab clusters have exact side positions, captive counts and independent whole-cluster stars',()=>{
 const g=isolated();for(const [kind,count,captives,x,type] of [['snake',12,3,1800,'mossSnake'],['crab',15,4,-1800,'mossCrab']]){
  const group=g.campaign.mossGroups.find(e=>e.kind===kind),members=g.campaign.units.filter(e=>e.clusterId===group.id);assert.deepEqual(group.home,{x,y:0});assert.equal(group.captives,captives);assert.equal(members.length,count);assert.equal(new Set(members.map(e=>e.id)).size,count);assert.ok(members.every(e=>e.type===type&&e.hp>120));
  g.flight.position={...group.home};activateCampaign(g);assert.equal(g.enemies.units.filter(e=>e.clusterId===group.id).length,count);
  for(const e of members.slice(0,-1))damageEnemy(g,e,10000,e.position);assert.equal(campaignSnapshot(g)[`${kind}Defeated`],0);damageEnemy(g,members.at(-1),10000,members.at(-1).position);assert.equal(campaignSnapshot(g)[`${kind}Defeated`],1);assert.equal(campaignSnapshot(g).mossDefeated,0);damageEnemy(g,members.at(-1),10000,members.at(-1).position);assert.equal(campaignSnapshot(g)[`${kind}Defeated`],1);
 }
 assert.equal(campaignSnapshot(g).snakeDefeated,1);assert.equal(campaignSnapshot(g).crabDefeated,1);const fresh=campaignSnapshot(isolated());assert.equal(fresh.snakeDefeated,0);assert.equal(fresh.crabDefeated,0);
});
test('whole-cluster scores total 12000 / 400 / 18000 once, including member scores; berserk and scorpion are 50 / 200',()=>{
 for(const [kind,total] of [['moss',12000],['snake',400],['crab',18000]]){const g=isolated(),group=g.campaign.mossGroups.find(e=>e.kind===kind),members=g.campaign.units.filter(e=>e.clusterId===group.id);g.score=100;for(const e of members.slice(0,-1))damageEnemy(g,e,10000,e.position);assert.ok(g.score<100+total);damageEnemy(g,members.at(-1),10000,members.at(-1).position);assert.equal(g.score,100+total);assert.equal(group.rewardGranted,true);for(const e of members)damageEnemy(g,e,10000,e.position);assert.equal(g.score,100+total);}
 for(const [type,score] of [['berserk',50],['scorpion',200]]){const g=isolated(),e=g.campaign.units.find(e=>e.type===type);damageEnemy(g,e,10000,e.position);damageEnemy(g,e,10000,e.position);assert.equal(g.score,score);}
});
