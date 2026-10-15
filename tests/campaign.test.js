import {createEquippedGame} from './helpers/equippedGame.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,stepGame,snapshot} from '../src/prototype/game.js';
import {CAMPAIGN,createCampaign,activateCampaign,moveCampaignSquads,campaignSnapshot} from '../src/prototype/campaign.js';
import {enemyType,enemyWeakpoint,damageEnemy} from '../src/prototype/enemyCombat.js';
import {stepRailgun,stepProjectiles} from '../src/prototype/railgun.js';
import {stepEnemies} from '../src/prototype/enemies.js';
import {finishVictory} from '../src/prototype/victory.js';
import {createPilotController} from '../src/prototype/pilotExpressions.js';

function battle(){const g=createEquippedGame();g.nebula.regions=[];g.enemies.units=[];g.resources=[];g.hazards=[];g.bits.forEach(b=>b.state='returning');return g;}
function shoot(g,seconds=0){g.ship.parts.find(p=>p.type==='tank').stored=160;stepRailgun(g,[{type:'weapon-press'}],seconds);stepRailgun(g,[{type:'weapon-release'}],0);stepProjectiles(g,1/60);}

test('campaign contains exactly 3 forward bases, 5 home bases, 45 squads, 12 snipers, 4 twelve-member moss clusters, 2 twenty-member large moss clusters, a 16-member snake, a 19-member crab, 6 commanders, 4 minibosses and 1 boss',()=>{
 const c=createCampaign();assert.equal(c.sites.filter(s=>s.kind==='front').length,3);assert.equal(c.sites.filter(s=>s.kind==='home-base').length,5);assert.equal(c.squads.length,45);assert.equal(c.units.length,265);assert.equal(new Set(c.units.map(e=>e.id)).size,265);
 for(const site of c.sites){const units=c.units.filter(e=>e.siteId===site.id);assert.equal(units.filter(e=>e.squadId).length,20);assert.equal(units.filter(e=>e.type==='commander').length,site.kind==='front'?0:1);}
 for(const squad of c.squads)assert.equal(c.units.filter(e=>e.squadId===squad.id).length,4);
 assert.equal(c.units.filter(e=>e.type==='guard').length,20);assert.equal(c.units.filter(e=>e.type==='miniboss').length,4);
 assert.equal(c.units.filter(e=>e.type==='finalBoss').length,1);
 const commander=c.units.find(e=>e.type==='commander'),soldier=c.units.find(e=>e.type==='soldier');assert.ok(commander.hp>soldier.hp);assert.ok(enemyType(commander).radius>enemyType(soldier).radius);
});

test('campaign activates only nearby units, preserves damage/death outside range, and fresh voyages reset all units',()=>{
 const g=battle();activateCampaign(g);assert.equal(g.enemies.units.length,24);
 g.flight.position={...CAMPAIGN.approachBases[0]};activateCampaign(g);const activeCount=g.enemies.units.length;assert.ok(activeCount>=20);
 const dead=g.enemies.units[0],damaged=g.enemies.units[1];damageEnemy(g,dead,1000,dead.position);damageEnemy(g,damaged,7,damaged.position);
 g.flight.position={x:10000,y:10000};activateCampaign(g);assert.equal(g.enemies.units.length,0);
 g.flight.position={...CAMPAIGN.approachBases[0]};activateCampaign(g);assert.equal(g.enemies.units.length,activeCount-1);assert.equal(g.enemies.units.find(e=>e.id===damaged.id).hp,41);assert.ok(!g.enemies.units.some(e=>e.id===dead.id));
 assert.equal(createEquippedGame().campaign.units.find(e=>e.id===dead.id).hp,48);
 const view=campaignSnapshot(g);assert.equal(view.defeated,1);view.sites[0].position.x=999;assert.equal(g.campaign.sites[0].position.x,0);
});

test('four-member squads keep their spacing while approaching and return toward their base',()=>{
 const g=battle();g.flight.position={x:0,y:-1100};activateCampaign(g);const squad=g.campaign.squads[0],before={...squad.position};
 moveCampaignSquads(g,.5);assert.notDeepEqual(squad.position,before);
 const units=g.enemies.units.filter(e=>e.squadId===squad.id);assert.equal(units.length,4);
 const d=(a,b)=>Math.hypot(a.position.x-b.position.x,a.position.y-b.position.y);
 assert.ok(Math.abs(d(units[0],units[1])-CAMPAIGN.squadSpacing)<1e-8);assert.ok(Math.abs(d(units[0],units[2])-CAMPAIGN.squadSpacing)<1e-8);
 g.flight.position={x:0,y:-300};const distanceBefore=Math.hypot(squad.position.x-squad.home.x,squad.position.y-squad.home.y);moveCampaignSquads(g,.5);assert.ok(Math.hypot(squad.position.x-squad.home.x,squad.position.y-squad.home.y)<=distanceBefore);
});

test('normal shots hit nearest targets; charged beams pierce rocks without duplicate kill credit',()=>{
 const g=battle();g.flight.position={x:0,y:-1000};const enemy=g.campaign.units[0];enemy.position={x:0,y:-1250};enemy.hp=1000;g.enemies.units=[enemy];
 shoot(g);for(let i=0;i<20;i++)stepProjectiles(g,1/60);assert.ok(enemy.hp<1000);assert.equal(g.weapon.lastHit.enemyId,enemy.id);
 const first=g.enemies.kills;damageEnemy(g,enemy,1000,enemy.position);damageEnemy(g,enemy,1000,enemy.position);assert.equal(g.enemies.kills,first+1);
 const h=battle();h.force.equipped=false;h.flight.position={x:0,y:-1000};const other=h.campaign.units[0];other.position={x:0,y:-1250};h.enemies.units=[other];h.hazards=[{id:'shield-rock',type:'impact',position:{x:0,y:-1100},radius:10}];shoot(h,2.4);assert.equal(other.hp,0);assert.ok(h.destroyedRocks.has('shield-rock'));
});

test('exposed abdominal parasite takes boosted damage, armor reduces damage, and real beams recognize the weakpoint',()=>{
 const g=battle(),boss=g.campaign.units.find(e=>e.id==='final-boss');boss.parasiteRevealed=true;const core=enemyWeakpoint(boss);
 const weak=damageEnemy(g,boss,10,core.position),armored=damageEnemy(g,boss,10,{x:boss.position.x+85,y:boss.position.y});assert.equal(weak.damage,36);assert.equal(armored.damage,2);
 g.flight.position={x:core.position.x,y:core.position.y+400};g.enemies.units=[boss];const hp=boss.hp;shoot(g,2.4);assert.equal(g.weapon.lastHit.weak,true);assert.ok(boss.hp<hp-100);
});

test('boss alternates a warned broad laser with a large spreading barrage',()=>{
 const g=battle(),boss=g.campaign.units.find(e=>e.id==='final-boss');g.campaign.units=g.campaign.units.filter(e=>e===boss);g.campaign.squads=[];
 g.flight.position={x:300,y:boss.position.y+400};boss.cooldown=0;boss.parasiteRevealed=true;
 stepEnemies(g,0);assert.equal(boss.warning,1.1);assert.equal(g.enemies.shots.length,0);
 stepEnemies(g,.5);assert.ok(boss.warning>0);assert.equal(g.enemies.shots.length,0);
 stepEnemies(g,.61);assert.equal(g.enemies.shots.length,22);assert.equal(g.enemies.shots[0].kind,'bossLaser');assert.equal(g.enemies.shots[0].radius,22);
 g.enemies.shots=[];boss.cooldown=0;stepEnemies(g,0);stepEnemies(g,1.11);assert.equal(g.enemies.shots.length,27);assert.ok(g.enemies.shots.every(s=>s.kind==='bossOrb'&&s.radius===9));
});

test('boss defeat clears exactly once, preserves max straight distance, cancels attacks, preserves recovery jobs and waits for continuation',()=>{
 const g=battle();g.flight.maxDistance=7100;g.flight.elapsed=300;g.jobs=[{id:'unfinished',stage:'outbound'},{id:'done',stage:'complete'}];g.weapon.holding=true;g.boost.holding=true;
 const boss=g.campaign.units.find(e=>e.id==='final-boss');boss.hp=0;
 assert.equal(finishVictory(g),true);assert.equal(g.status,'cleared');assert.equal(g.end.maxDistance,7100);assert.equal(g.jobs[0].stage,'outbound');assert.equal(g.jobs[1].stage,'complete');assert.equal(g.weapon.holding,false);assert.equal(g.boost.holding,false);assert.ok(g.bits.every(b=>b.state!=='disabled'));
 const elapsed=g.flight.elapsed,position={...g.flight.position};g.commands.push({type:'weapon-press'},{type:'place',partType:'pipe',x:7,y:10,id:'late'});stepGame(g,1,1);assert.equal(g.flight.elapsed,elapsed);assert.deepEqual(g.flight.position,position);assert.equal(g.weapon.shots,0);assert.equal(finishVictory(g),false);
 assert.equal(createPilotController()(snapshot(g)).id,'cleared');assert.equal(createEquippedGame().status,'running');
});

test('a shot killing the boss finishes before later enemy fire or hull hazards in that tick',()=>{
 const g=battle(),boss=g.campaign.units.find(e=>e.id==='final-boss');g.campaign.units=g.campaign.units.filter(e=>e===boss);g.campaign.squads=[];boss.hp=1;
 g.flight.position={x:boss.position.x,y:boss.position.y+400};g.flight.maxDistance=6400;g.ship.parts.find(p=>p.type==='tank').stored=160;stepRailgun(g,[{type:'weapon-press'}],1.2);g.commands.push({type:'weapon-release'});stepGame(g,0,1/60);
 assert.equal(g.status,'cleared');assert.equal(g.end.maxDistance,6400);assert.equal(g.enemies.shots.length,0);assert.equal(g.weapon.projectiles.length,0);
});
