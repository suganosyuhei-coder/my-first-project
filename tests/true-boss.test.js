import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, stepGame, snapshot } from '../src/prototype/game.js';
import { triggerTrueBoss, stepTrueBoss, finishTrueBoss, allClustersDefeated } from '../src/prototype/trueBoss.js';
import { TRUE_BOSS, coreIsOpen } from '../src/prototype/trueBossGeometry.js';
import { damageEnemy } from '../src/prototype/enemyCombat.js';
import { activateCampaign, clusterObjectives } from '../src/prototype/campaign.js';
import { stepRailgun, stepProjectiles } from '../src/prototype/railgun.js';
import { forceBody } from '../src/prototype/force.js';
import { continueVoyage } from '../src/prototype/victory.js';
import { createAngelRecorder } from '../src/prototype/angelRecords.js';
import { createDevelopmentGame } from '../src/prototype/devScenarios.js';
import { productionTuning } from '../src/prototype/runtimeTuning.js';
import { createPilotStoryObserver } from '../src/prototype/pilotStory.js';

function ready() {
  const game = createGame();
  for (const e of game.campaign.units) if (e.clusterId || e.id === 'final-boss') e.hp = 0;
  game.campaign.bossCleared = true;
  return game;
}
function battleship() {
  const g = ready(); stepTrueBoss(g, 0); stepTrueBoss(g, TRUE_BOSS.riftSeconds); activateCampaign(g); return g;
}
function dormant() {
  const g = battleship();
  for (const e of g.trueBoss.parts) if (e.required) damageEnemy(g, e, 10000, e.position);
  stepTrueBoss(g, 0); activateCampaign(g); return g;
}
function pursuit() {
  const g = dormant(), eye = g.trueBoss.parts.find(e => e.type === 'trueEye');
  for (let i = 0; i < TRUE_BOSS.dormantHits; i++) damageEnemy(g, eye, 10, eye.position, 0, 'normal');
  stepTrueBoss(g, TRUE_BOSS.absorptionSeconds); activateCampaign(g); return g;
}

test('true boss requires the homeworld victory and every member of all eight clusters, and spawns only once', () => {
  const g = ready(), clusters = g.campaign.mossGroups;
  assert.equal(clusters.length, 8);
  const last = g.campaign.units.find(e => e.clusterId === clusters.at(-1).id);
  last.hp = 1;
  assert.equal(allClustersDefeated(g.campaign), false);
  assert.equal(triggerTrueBoss(g), false);
  last.hp = 0;
  g.campaign.bossCleared = false;
  assert.equal(triggerTrueBoss(g), false);
  g.campaign.bossCleared = true;
  assert.equal(triggerTrueBoss(g), true);
  const state = g.trueBoss;
  assert.equal(triggerTrueBoss(g), false);
  assert.equal(g.trueBoss, state);
  assert.equal(clusterObjectives(g.campaign, g.flight.position).length, 8);
  const missing = ready(); missing.campaign.units.pop();
  const member = missing.campaign.units.find(e => e.clusterId); missing.campaign.units = missing.campaign.units.filter(e => e.id !== member.id);
  assert.equal(allClustersDefeated(missing.campaign), false);
  assert.equal(triggerTrueBoss(createGame({ campaign: false })), false);
});

test('rift deploys a sectional battleship, destroyed guns stop shooting, and pause freezes all encounter timers', () => {
  const g = battleship();
  assert.equal(g.trueBoss.parts.length, 19);
  assert.equal(g.trueBoss.parts.filter(p => p.required).length, 9);
  const cannon = g.trueBoss.parts.find(p => p.type === 'trueCannon');
  g.flight.position = { x: cannon.position.x, y: cannon.position.y + 300 };
  cannon.cooldown = 0;
  stepTrueBoss(g, 0);
  assert.equal(cannon.warning, TRUE_BOSS.warningSeconds);
  damageEnemy(g, cannon, 10000, cannon.position);
  const before = g.enemies.shots.length;
  stepTrueBoss(g, .5);
  assert.equal(g.enemies.shots.length, before);
  assert.ok(g.trueBoss.debris.some(d => d.type === 'trueCannon'));
  g.paused = true;
  const frozen = structuredClone(g.trueBoss); stepTrueBoss(g, 10);
  assert.deepEqual(g.trueBoss, frozen);
});

test('core is hidden until required sections detach; dormant fire triggers absorption without reducing the eye HP', () => {
  const g = battleship(), required = g.trueBoss.parts.filter(e => e.required);
  for (const e of required.slice(0, -1)) damageEnemy(g, e, 10000, e.position);
  stepTrueBoss(g, 0); assert.equal(g.trueBoss.phase, 'battleship');
  damageEnemy(g, required.at(-1), 10000, required.at(-1).position);
  stepTrueBoss(g, 0); activateCampaign(g);
  assert.equal(g.trueBoss.phase, 'dormant');
  const eye = g.trueBoss.parts.find(e => e.type === 'trueEye');
  damageEnemy(g, eye, 1000, eye.position, 0, 'bit');
  assert.equal(g.trueBoss.dormantHits, 0);
  for (let i = 0; i < TRUE_BOSS.dormantHits - 1; i++) damageEnemy(g, eye, 1000, eye.position, 0, 'normal');
  assert.equal(eye.hp, 1); assert.equal(g.trueBoss.phase, 'dormant');
  damageEnemy(g, eye, 1000, eye.position, 0, 'wave');
  assert.equal(g.trueBoss.phase, 'absorption');
  assert.equal(g.force.equipped, true);
  stepTrueBoss(g, TRUE_BOSS.absorptionSeconds);
  assert.equal(g.force.equipped, false); assert.equal(forceBody(g), null);
  assert.equal(g.trueBoss.phase, 'pursuit');
  assert.equal(eye.hp, 1);
});

test('pursuit chases, launches tentacle fire and only a wave actually hitting the open core can win', () => {
  const g = pursuit(), eye = g.trueBoss.parts.find(e => e.type === 'trueEye');
  g.flight.position = { x: eye.position.x + 500, y: eye.position.y + 500 };
  const before = { ...eye.position }; stepTrueBoss(g, 1.1);
  assert.ok(eye.position.x > before.x && eye.position.y > before.y);
  assert.ok(g.enemies.shots.length > 0);
  assert.equal(damageEnemy(g, eye, 10000, eye.position, 0, 'wave').destroyed, false);
  g.trueBoss.timer = 5.3; eye.coreOpen = true;
  assert.equal(coreIsOpen(g.trueBoss), true);
  for (const source of ['normal', 'missile', 'ally', 'bit']) assert.equal(damageEnemy(g, eye, 10000, eye.position, 0, source).destroyed, false);
  assert.equal(damageEnemy(g, eye, 10000, { x: eye.position.x + 40, y: eye.position.y }, 0, 'wave').destroyed, false);
  assert.equal(damageEnemy(g, eye, 1, eye.position, 0, 'wave').destroyed, true);
  assert.equal(finishTrueBoss(g), true);
  const score = g.score;
  assert.equal(finishTrueBoss(g), false); assert.equal(g.score, score);
});

test('real Space charge and release still fires without the Force and penetrates the eye core in one hit', () => {
  const g = pursuit(), eye = g.trueBoss.parts.find(e => e.type === 'trueEye');
  g.trueBoss.timer = 5.3; eye.coreOpen = true;
  g.flight.position = { x: eye.position.x, y: eye.position.y + 220 }; g.flight.heading = 0;
  g.hazards = []; g.enemies.units = [eye]; g.bits = [];
  stepRailgun(g, [{ type: 'weapon-press' }], 1.2);
  stepRailgun(g, [{ type: 'weapon-release', heading: 0 }], 0);
  assert.ok(g.weapon.lastShot.stage > 0); assert.equal(g.weapon.lastShot.enhanced, false);
  stepProjectiles(g, 0);
  assert.equal(eye.hp, 0); assert.equal(g.trueBoss.defeated, true);
});

test('ending freezes gameplay, retains the recovered-ship/missing-pilot report, records only once and never continues the same ship', () => {
  const g = pursuit(), eye = g.trueBoss.parts.find(e => e.type === 'trueEye');
  g.trueBoss.timer = 5.3; eye.coreOpen = true;
  damageEnemy(g, eye, 1, eye.position, 0, 'wave'); finishTrueBoss(g);
  const elapsed = g.flight.elapsed, vital = g.vital.value, hp = structuredClone(g.ship);
  stepGame(g, 0, 99);
  assert.equal(g.end.endingElapsed, TRUE_BOSS.endingSeconds);
  assert.equal(g.flight.elapsed, elapsed); assert.equal(g.vital.value, vital); assert.deepEqual(g.ship, hp);
  assert.equal(g.force.equipped, false); assert.equal(g.end.reason, 'trueBoss');
  assert.equal(continueVoyage(g), false);
  const recorder = createAngelRecorder(() => ({ getItem: () => null, setItem() {} }));
  assert.equal(recorder.record(g), true); assert.equal(recorder.record(g), false);
  assert.equal(recorder.snapshot().data.entries[0].reason, 'trueBoss');
  assert.equal(createGame().force.equipped, true); assert.equal(createGame().trueBoss, undefined);
});

test('replacement biological encounters retain all eight objective IDs and have no old armor multiplier', () => {
  const g = createGame();
  for (const [kind, count, captives] of [['moss', 6, 0], ['largeMoss', 1, 0], ['snake', 8, 0], ['crab', 1, 0]]) {
    const group = g.campaign.mossGroups.find(c => c.kind === kind), member = g.campaign.units.find(e => e.clusterId === group.id);
    assert.equal(group.count, count); assert.equal(group.captives, captives);
    const hp = member.hp; assert.equal(damageEnemy(g, member, 20, member.position).damage, 20); assert.equal(member.hp, hp - 20);
  }
  const ordinary = g.campaign.units.find(e => e.type === 'soldier');
  assert.equal(damageEnemy(g, ordinary, 20, ordinary.position).damage, 20);
});

test('development scenes reach each true-boss phase and story lines only apply in the current phase', () => {
  for (const [scene, phase] of [['true-boss', 'battleship'], ['true-eye', 'pursuit'], ['true-ending', 'ending']]) {
    const g = createDevelopmentGame(scene, productionTuning());
    assert.equal(g.trueBoss.phase, phase); assert.ok(g.developmentScenario);
  }
  const t = snapshot(battleship()); t.flight.elapsed = 10;
  const observer = createPilotStoryObserver();
  assert.equal(observer.observe(t).event.trigger, 'trueBossBattleship');
  assert.equal(observer.select('trueBossBattleship', 10).portrait, 'bikkuri-02');
  t.trueBoss.phase = 'pursuit'; observer.observe(t);
  assert.equal(observer.select('trueBossBattleship', 11), null);
});
