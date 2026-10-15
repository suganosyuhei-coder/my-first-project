import test from 'node:test';
import assert from 'node:assert/strict';
import {createDevelopmentGame} from '../src/prototype/devScenarios.js';
import {productionTuning} from '../src/prototype/runtimeTuning.js';
import {stepTrueBoss,finishTrueBoss,trueBossSnapshot} from '../src/prototype/trueBoss.js';
import {activateCampaign} from '../src/prototype/campaign.js';
import {stepRailgun,stepProjectiles,RAILGUN} from '../src/prototype/railgun.js';
import {stepEnemies} from '../src/prototype/enemies.js';
import {damageEnemy} from '../src/prototype/enemyCombat.js';
import {createPilotStoryObserver} from '../src/prototype/pilotStory.js';
import {snapshot} from '../src/prototype/game.js';
function scene(){const g=createDevelopmentGame('true-eye',productionTuning());g.paused=false;g.flight.elapsed=10;g.hazards=[];g.bits=[];return g;}
function opening(){const g=scene();g.trueBoss.timer=5.21;stepTrueBoss(g,0);activateCampaign(g);return g;}

test('first pursuit core opening spawns exactly forty one-normal-shot berserk enemies from eight rifts',()=>{
 const g=scene();g.trueBoss.timer=5;stepTrueBoss(g,0);assert.equal(g.trueBoss.minions,undefined);
 g.trueBoss.timer=5.21;stepTrueBoss(g,0);activateCampaign(g);
 assert.equal(g.trueBoss.minions.length,40);assert.equal(g.trueBoss.swarmPortals.length,8);assert.equal(g.enemies.units.filter(e=>e.trueBossMinion).length,40);assert.equal(new Set(g.trueBoss.minions.map(e=>e.id)).size,40);
 assert.ok(g.trueBoss.minions.every(e=>e.type==='berserk'&&e.hp===RAILGUN.damage[0]&&Math.hypot(e.position.x-g.flight.position.x,e.position.y-g.flight.position.y)>250));
 assert.equal(trueBossSnapshot(g).swarmWaves,1);assert.equal(trueBossSnapshot(g).swarmRemaining,40);
});
test('actual normal shot kills a minion once, and dead minions never respawn on subsequent openings or campaign activation',()=>{
 const g=opening(),enemy=g.trueBoss.minions[0];g.enemies.units=[enemy];g.flight.position={x:enemy.position.x,y:enemy.position.y+100};g.flight.heading=0;
 stepRailgun(g,[{type:'weapon-press'},{type:'weapon-release',heading:0}],0);assert.equal(g.weapon.projectiles[0].stage,0);stepProjectiles(g,.2);assert.equal(enemy.hp,0);
 const score=g.score;damageEnemy(g,enemy,100,enemy.position);assert.equal(g.score,score);
 g.trueBoss.timer=1;stepTrueBoss(g,0);g.trueBoss.timer=13.3;stepTrueBoss(g,0);activateCampaign(g);
 assert.equal(g.trueBoss.minions.length,40);assert.equal(g.enemies.units.filter(e=>e.trueBossMinion).length,39);assert.equal(trueBossSnapshot(g).swarmWaves,1);
});
test('swarm survives enemy activation and uses ordinary berserk movement and shots while pause freezes spawning',()=>{
 const g=opening(),enemy=g.trueBoss.minions[0];enemy.cooldown=0;const old={...enemy.position},nextShot=g.enemies.nextShot;stepEnemies(g,.1);
 assert.equal(g.enemies.units.filter(e=>e.trueBossMinion).length,40);assert.notDeepEqual(enemy.position,old);assert.ok(g.enemies.nextShot>nextShot);assert.ok(enemy.cooldown>0);
 const h=scene();h.trueBoss.timer=5.21;h.paused=true;stepTrueBoss(h,1);assert.equal(h.trueBoss.minions,undefined);assert.equal(h.trueBoss.timer,5.21);
});
test('eye still requires an exposed-core wave hit; victory removes the remaining swarm and pending attacks',()=>{
 const g=opening(),eye=g.trueBoss.parts.find(e=>e.type==='trueEye');assert.equal(damageEnemy(g,eye,100,eye.position,0,'normal').destroyed,false);
 assert.equal(damageEnemy(g,eye,1,eye.position,0,'wave').destroyed,true);assert.equal(finishTrueBoss(g),true);assert.equal(g.trueBoss.minions.length,0);assert.equal(g.trueBoss.swarmPortals.length,0);assert.equal(g.enemies.units.filter(e=>e.trueBossMinion).length,0);assert.equal(g.enemies.shots.length,0);assert.equal(g.end.reason,'trueBoss');
});
test('swarm encounter gets its own crisis line and face while retaining the core-opening instruction',()=>{
 const g=opening(),observer=createPilotStoryObserver(),t=snapshot(g);assert.equal(observer.observe(t).event.trigger,'trueBossSwarm');assert.equal(observer.select('trueBossSwarm',t.flight.elapsed).portrait,'huan-01');
});
test('odd core openings add forty new enemies while even openings and repeated ticks do not spawn',()=>{
 const g=opening();assert.equal(g.trueBoss.swarmWaves,1);const initial=new Set(g.trueBoss.minions.map(e=>e.id));
 for(const timer of [5.4,6,7.9,13.3,13.8]){g.trueBoss.timer=timer;stepTrueBoss(g,0);assert.equal(g.trueBoss.swarmWaves,1);assert.equal(g.trueBoss.minions.length,40);}
 g.trueBoss.timer=21.3;stepTrueBoss(g,0);assert.equal(g.trueBoss.swarmWaves,2);assert.equal(g.trueBoss.minions.length,80);assert.equal(g.trueBoss.minions.filter(e=>!initial.has(e.id)).length,40);assert.equal(new Set(g.trueBoss.minions.map(e=>e.id)).size,80);
 g.trueBoss.timer=29.3;stepTrueBoss(g,0);assert.equal(g.trueBoss.swarmWaves,2);g.trueBoss.timer=37.3;stepTrueBoss(g,0);assert.equal(g.trueBoss.swarmWaves,3);assert.equal(g.trueBoss.minions.length,120);
});
