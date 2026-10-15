import test from 'node:test';import assert from 'node:assert/strict';
import {createGame,stepGame,snapshot} from '../src/prototype/game.js';
import {activateCampaign} from '../src/prototype/campaign.js';
import {stepEnemies} from '../src/prototype/enemies.js';
import {enemyType,damageEnemy} from '../src/prototype/enemyCombat.js';
import {stepAberrant} from '../src/prototype/aberrantEnemies.js';
import {enemyBodies,enemySegmentHit,centipedeBody} from '../src/prototype/enemyBodies.js';
import {stepProjectiles} from '../src/prototype/railgun.js';
import {shipCells,cellToWorld} from '../src/prototype/ship.js';
import {createPilotController} from '../src/prototype/pilotExpressions.js';
import {createPilotStoryObserver,storyLine} from '../src/prototype/pilotStory.js';

const battle=()=>{const g=createGame({force:false});g.bits=[];g.hazards=[];g.nebula.regions=[];g.enemies.units=[];return g;};
test('27 post-boss enemies are gated until continuation, exact counts and deaths persist',()=>{
 const g=battle();assert.equal(g.campaign.units.filter(e=>e.postBoss).length,27);
 for(const [type,count] of [['berserk',16],['centipede',5],['scorpion',6]])assert.equal(g.campaign.units.filter(e=>e.type===type).length,count);
 g.flight.position={x:760,y:-5300};activateCampaign(g);assert.ok(!g.enemies.units.some(e=>e.postBoss));g.campaign.bossCleared=true;activateCampaign(g);assert.equal(g.enemies.units.filter(e=>e.type==='berserk').length,16);assert.ok(g.enemies.units.filter(e=>e.postBoss).length>=11);assert.equal(g.enemies.units.filter(e=>e.type==='centipede').length,5);g.flight.position={x:-1030,y:-4600};activateCampaign(g);assert.equal(g.enemies.units.filter(e=>e.type==='scorpion').length,6);const e=g.campaign.units.find(e=>e.type==='berserk'),id=e.id;e.hp=0;activateCampaign(g);assert.ok(!g.enemies.units.includes(e));assert.equal(createGame().campaign.units.find(e=>e.id===id).hp,90);
});
test('berserk stray shots point away from the ship, and actual infighting damages an enemy without player rewards',()=>{
 const g=battle();g.flight.elapsed=0;g.flight.position={x:500,y:0};const a={id:'b1',type:'berserk',slot:0,home:{x:0,y:0},position:{x:0,y:0},heading:0,hp:90,cooldown:0,ramCooldown:0};g.enemies.units=[a];stepAberrant(g,a,enemyType(a),0,1,1);const shot=g.enemies.shots[0];assert.ok(shot.velocity.x/Math.hypot(shot.velocity.x,shot.velocity.y)<=.5);assert.equal(shot.color,'#ff75cc');
 g.enemies.shots=[];g.flight.position={x:0,y:1000};const b={...a,id:'b2',position:{x:100,y:0},home:{x:100,y:0},slot:2};a.slot=1;a.cooldown=0;g.flight.position={x:0,y:400};g.enemies.units=[a,b];stepAberrant(g,a,enemyType(a),0,1,1);assert.equal(g.enemies.shots[0].targetEnemyId,b.id);a.cooldown=b.cooldown=99;g.tuning={enemies:{speedMultiplier:0}};g.enemies.shots[0].damage=100;stepEnemies(g,.8);assert.equal(b.hp,0);assert.equal(g.enemies.friendlyFireSequence,1);assert.equal(g.score,0);assert.equal(g.enemies.kills,0);
});
test('centipede body geometry matches long moving joints and accepts a swept shot through the tail once',()=>{
 const g=battle(),e=g.campaign.units.find(e=>e.type==='centipede');e.position={x:0,y:0};e.heading=0;e.bodyTime=0;g.enemies.units=[e];const body=enemyBodies(e);assert.equal(body.length,12);assert.equal(body.at(-1).position.y,154*1.5);assert.equal(e.hp,460*1.5);assert.deepEqual(body.map(p=>p.radius),centipedeBody().map(p=>p.radius));const point=body[8].position,from={x:point.x-60,y:point.y},to={x:point.x+60,y:point.y};assert.notEqual(enemySegmentHit(from,to,e,1),null);
 const hp=e.hp;g.weapon.projectiles=[{id:1,stage:1,origin:from,position:from,heading:Math.PI/2,velocity:{x:220,y:0},remaining:120,radius:1,damage:10}];stepProjectiles(g,1/60);assert.equal(e.hp,hp-10);assert.equal(g.weapon.hits,1);
});
test('centipede tail can ram the hull; scorpion pursues rapidly while firing; paused simulation freezes both',()=>{
 const g=battle();g.campaign.bossCleared=true;const e=g.campaign.units.find(e=>e.type==='centipede'),cell=cellToWorld(shipCells(g.ship)[8],g.flight),tail=centipedeBody()[8];e.position={x:cell.x-tail.x,y:cell.y-tail.y};e.home={...e.position};e.heading=0;g.campaign.units=g.campaign.units.filter(x=>x.id==='final-boss'||x===e);const before=g.ship.cells.reduce((n,c)=>n+c.hp,0);stepEnemies(g,0);assert.ok(g.ship.cells.reduce((n,c)=>n+c.hp,0)<before);
 const h=battle(),scorpion=h.campaign.units.find(x=>x.type==='scorpion');scorpion.position={x:0,y:300};scorpion.heading=0;scorpion.cooldown=0;h.enemies.units=[scorpion];stepAberrant(h,scorpion,enemyType(scorpion),1,1,1);assert.equal(scorpion.position.y,210);assert.equal(h.enemies.shots.length,3);h.commands.push({type:'pause-toggle'});stepGame(h,0,1/60);const position={...scorpion.position};stepGame(h,0,2);assert.deepEqual(scorpion.position,position);
});
test('giant signals precede code red by distance and elapsed time, and warning portraits remain interruptible',()=>{
 const g=createGame({campaign:false}),t=snapshot(g);t.flight.elapsed=10;t.nebula.observableIds=[];t.campaign={giantSignals:[{id:'giant',distance:550}]};const o=createPilotStoryObserver();assert.equal(o.observe(t).event.trigger,'giantBydoSignal');o.accepted('giantBydoSignal',10);t.flight.elapsed=12;t.campaign.giantSignals[0].distance=300;assert.notEqual(o.observe(t).event?.trigger,'giantCodeRed');t.flight.elapsed=18;assert.equal(o.observe(t).event.trigger,'giantCodeRed');o.accepted('giantCodeRed',18);t.flight.elapsed=40;assert.notEqual(o.observe(t).event?.trigger,'giantCodeRed');const select=createPilotController();t.flight.elapsed=50;t.campaign.giantSignals=[{id:'new',distance:550}];const a=select(t);assert.equal(a.line,'高バイド係数感知、何かいる！');assert.equal(a.portraitId,'bikkuri-02');t.flight.elapsed++;t.ship.cells[0].hp=90;assert.equal(select(t).id,'damage');
});
test('all species reactions use exact surprised portraits, and infighting dialogue requires a real recent hit',()=>{
 for(const [species,first,second] of [['berserk','berserkDiscovered','berserkInfighting'],['centipede','centipedeDiscovered','centipedeDread'],['scorpion','scorpionDiscovered','scorpionFear']]){const t=snapshot(createGame({campaign:false}));t.nebula.observableIds=[];t.flight.elapsed=10;t.enemies.units=[{id:species,type:species,detected:true,hp:100,position:{x:100,y:0}}];const o=createPilotStoryObserver();assert.equal(o.observe(t).event.trigger,first);assert.equal(o.select(first,10).portrait,'bikkuri-02');assert.equal(o.select(first,10).line,storyLine(first).line);o.accepted(first,10);t.flight.elapsed=19;if(species==='berserk'){assert.notEqual(o.observe(t).event?.trigger,second);t.enemies.lastFriendlyFire={at:18};}assert.equal(o.observe(t).event.trigger,second);assert.equal(o.select(second,19).portrait,'bikkuri-02');}
});

test('centipede destruction restores four VITAL once, respects the cap and ignores nonfatal or other-enemy hits',()=>{
 const g=battle(),enemies=g.campaign.units.filter(e=>e.type==='centipede');g.vital.value=50;g.flight.elapsed=12;
 const e=enemies[0];damageEnemy(g,e,10,e.position);assert.equal(g.vital.value,50);
 damageEnemy(g,e,10000,e.position);assert.equal(g.vital.value,54);assert.deepEqual(g.vital.lastRecovery,{at:12,amount:4});assert.equal(g.vital.recoveries,1);
 damageEnemy(g,e,10000,e.position);assert.equal(g.vital.value,54);assert.equal(g.vital.recoveries,1);
 g.vital.value=98;damageEnemy(g,enemies[1],10000,enemies[1].position);assert.equal(g.vital.value,100);assert.equal(g.vital.lastRecovery.amount,2);
 g.vital.value=60;const other=g.campaign.units.find(e=>e.type==='berserk');damageEnemy(g,other,10000,other.position);assert.equal(g.vital.value,60);
});

test('scorpion destruction restores three VITAL once with existing recovery feedback and maximum 100',()=>{
 const g=battle(),enemies=g.campaign.units.filter(e=>e.type==='scorpion');g.vital.value=50;g.flight.elapsed=20;
 damageEnemy(g,enemies[0],10,enemies[0].position);assert.equal(g.vital.value,50);
 damageEnemy(g,enemies[0],10000,enemies[0].position);assert.equal(g.vital.value,53);assert.deepEqual(g.vital.lastRecovery,{at:20,amount:3});assert.equal(g.vital.recoveries,1);assert.match(g.notice,/サソリ型敵を撃破/);
 damageEnemy(g,enemies[0],10000,enemies[0].position);assert.equal(g.vital.value,53);assert.equal(g.vital.recoveries,1);
 g.vital.value=99;damageEnemy(g,enemies[1],10000,enemies[1].position);assert.equal(g.vital.value,100);assert.equal(g.vital.lastRecovery.amount,1);
 g.vital.value=50;damageEnemy(g,enemies[2],10000,enemies[2].position,0,'enemy');assert.equal(g.vital.value,50);
});
