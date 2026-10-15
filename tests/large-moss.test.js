import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,snapshot} from '../src/prototype/game.js';
import {createCampaign,activateCampaign,campaignSnapshot} from '../src/prototype/campaign.js';
import {damageEnemy} from '../src/prototype/enemyCombat.js';
import {stepEnemies} from '../src/prototype/enemies.js';
import {campaignNebulaRegions} from '../src/prototype/nebula.js';
import {createPilotStoryObserver,storyLine} from '../src/prototype/pilotStory.js';
import {createPilotController} from '../src/prototype/pilotExpressions.js';

test('former large moss sites each contain one independent 2070-HP biological enemy, with no captive PAWs',()=>{
 const c=createCampaign(),groups=c.mossGroups.filter(g=>g.kind==='largeMoss');
 assert.deepEqual(groups.map(g=>g.type),['megadictyon','pambdelurion']);
 for(const group of groups){const members=c.units.filter(e=>e.clusterId===group.id);assert.equal(group.count,1);assert.equal(group.captives,0);assert.equal(members.length,1);assert.equal(members[0].hp,2070);assert.equal(members[0].organicEncounter,true);}
});
test('large ram-only enemy awards the retained site score and twenty VITAL once, remains dead on revisit',()=>{
 const g=createGame(),group=g.campaign.mossGroups.find(g=>g.type==='megadictyon'),enemy=g.campaign.units.find(e=>e.clusterId===group.id);
 g.campaign.units=[enemy,g.campaign.units.find(e=>e.id==='final-boss')];g.campaign.squads=[];g.flight.position={x:group.home.x,y:group.home.y+200};g.bits=[];g.hazards=[];g.nebula.regions=[];g.vital.value=50;enemy.cooldown=0;
 stepEnemies(g,0);assert.equal(g.enemies.shots.length,0);damageEnemy(g,enemy,10000,enemy.position);assert.equal(g.vital.value,70);assert.equal(g.score,24000);assert.equal(campaignSnapshot(g).mossDefeated,1);
 damageEnemy(g,enemy,10000,enemy.position);assert.equal(g.vital.value,70);assert.equal(g.score,24000);
 g.flight.position={x:9999,y:9999};activateCampaign(g);g.flight.position={...group.home};activateCampaign(g);assert.ok(!g.enemies.units.includes(enemy));
});
test('large biological encounter retains harmless red marker until defeated',()=>{
 const g=createGame(),group=g.campaign.mossGroups.find(g=>g.type==='pambdelurion');
 const cloud=()=>campaignNebulaRegions(g.campaign,group.position,500).find(r=>r.campaignSite===group.id);
 assert.deepEqual(cloud().color,[1,.06,.12]);assert.equal(cloud().heat,0);
 g.campaign.units.find(e=>e.clusterId===group.id).hp=0;assert.equal(cloud(),undefined);
});

test('large moss uses excited surprise lines, progresses while visible, and never substitutes the ordinary moss discovery', () => {
  const t = snapshot(createGame({ campaign: false })), observer = createPilotStoryObserver();
  t.flight.elapsed = 10; t.nebula.observableIds = [];
  observer.observe(t);
  t.enemies.units = [{ id: 'large-moss', type: 'moss', clusterId: 'large', clusterKind: 'largeMoss', hp: 120, detected: true, position: { x: 60, y: 0 } }];
  for (const [i, trigger] of ['largeMossDiscovered', 'largeMossCaptives', 'largeMossChallenge'].entries()) {
    t.flight.elapsed = 11 + i * 9;
    assert.equal(observer.observe(t).event.trigger, trigger);
    const line = observer.select(trigger, t.flight.elapsed);
    assert.equal(line.portrait, 'bikkuri-02');
    assert.match(line.line, /！/);
    observer.accepted(trigger, t.flight.elapsed);
  }
  t.enemies.units = [];
  observer.observe(t);
  assert.equal(observer.select('largeMossCaptives', 30), null);
  const fresh = snapshot(createGame({ campaign: false })), controller = createPilotController();
  fresh.flight.elapsed = 10; fresh.nebula.observableIds = [];
  controller(fresh);
  fresh.flight.elapsed = 11; fresh.enemies.units = t.enemies.units = [{ id: 'large-moss', type: 'moss', clusterId: 'large', clusterKind: 'largeMoss', hp: 120, detected: true, position: { x: 60, y: 0 } }];
  assert.equal(controller(fresh).line, storyLine('largeMossDiscovered').line);
});

test('large moss discovery takes precedence over the generic giant signal warning', () => {
  const t = snapshot(createGame({ campaign: false })), observer = createPilotStoryObserver();
  t.flight.elapsed = 10;
  t.campaign = { giantSignals: [{ id: 'large', distance: 100, position: { x: 60, y: 0 } }] };
  t.enemies.units = [{ id: 'large-moss', type: 'moss', clusterId: 'large', clusterKind: 'largeMoss', hp: 120, detected: true, position: { x: 60, y: 0 } }];
  assert.equal(observer.observe(t).event.trigger, 'largeMossDiscovered');
});
