import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, stepGame, snapshot, TUNING } from '../src/prototype/game.js';
import { cruiseSpeed } from '../src/prototype/flightSpeed.js';
import { poweredThrust } from '../src/prototype/equipment.js';
import { defaultTuning, validateTuning, TUNING_FIELDS } from '../src/prototype/devTuning.js';
import { productionTuning } from '../src/prototype/runtimeTuning.js';
import { validateProductionTuning } from '../src/prototype/productionTuningValidation.js';
import { compareTuning } from '../src/prototype/tuningComparison.js';
import { createDevelopmentGame, DEV_SCENARIOS } from '../src/prototype/devScenarios.js';
import { applyContact } from '../src/prototype/damage.js';
import { cellToWorld } from '../src/prototype/ship.js';
import { damageReport, DAMAGE_HISTORY_LIMIT } from '../src/prototype/flightDiagnostics.js';
import { observeSupplies, supplyGuidance, KNOWN_SUPPLY_LIMIT } from '../src/prototype/supplyGuidance.js';
import { createAngelRecorder } from '../src/prototype/angelRecords.js';

test('comparison distinguishes saved settings from public defaults without changing any settings', () => {
  const saved = defaultTuning(), published = productionTuning(), current = structuredClone(published);
  current.ship.speedMultiplier = 2.8;
  const before = structuredClone([current, saved, published]);
  const rows = compareTuning(current, saved, published);
  assert.equal(rows.length, TUNING_FIELDS.length);
  const speed = rows.find(r => r.key === 'ship.speedMultiplier');
  assert.deepEqual([speed.current, speed.saved, speed.published], [2.8, 1, 5]);
  assert.equal(speed.savedDiffers, true);
  assert.equal(speed.publishedDiffers, true);
  assert.equal(compareTuning(published, published, published).filter(r => r.savedDiffers || r.publishedDiffers).length, 0);
  assert.deepEqual([current, saved, published], before);
});

test('shipping validator rejects partial old exports and invalid values while user imports remain compatible', () => {
  const preset = productionTuning();
  assert.deepEqual(validateProductionTuning(preset), preset);
  const old = structuredClone(preset);
  delete old.boost;
  assert.doesNotThrow(() => validateTuning(old));
  assert.throws(() => validateProductionTuning(old), /boost.impulseMultiplier/);
  const invalid = structuredClone(preset);
  invalid.ship.speedMultiplier = 13;
  assert.throws(() => validateProductionTuning(invalid));
  assert.throws(() => validateProductionTuning({ ...preset, accidentalKey: 1 }));
});

test('shared speed calculation preserves old initial and in-flight formulas for varied engine counts and multipliers', () => {
  for (const engines of [0, 1, 3, 12]) for (const multiplier of [.5, 1, 2.5, 3]) {
    const g = createGame();
    const engine = g.ship.parts.find(p => p.type === 'engine');
    g.ship.parts = g.ship.parts.filter(p => p.type !== 'engine');
    for (let i = 0; i < engines; i++) g.ship.parts.push({ ...engine, id: `engine-test-${i}` });
    g.energy = { ...g.energy, active: Object.fromEntries(g.ship.parts.map(p => [p.id, true])) };
    const tuning = defaultTuning();
    tuning.ship.speedMultiplier = multiplier;
    const base = (TUNING.minimumSpeed + poweredThrust(g.ship, g.energy)) * TUNING.cruiseMultiplier;
    assert.equal(cruiseSpeed(g.ship, g.energy, tuning, { initial: true }), base * multiplier);
    assert.equal(cruiseSpeed(g.ship, g.energy, tuning), Math.max(TUNING.minimumSpeed, Math.min(TUNING.maxSpeed, base) * multiplier));
  }
});

test('damage history records actual shield-reduced HP loss, location and ratios; rejected contacts add nothing', () => {
  const g = createGame({ campaign: false });
  const cell = { x: 2, y: 8 }, position = cellToWorld(cell, g.flight);
  applyContact(g, { type: 'enemyAttack', source: '敵レーザー', damage: 20, position });
  const report = damageReport(g), hit = report.hits[0];
  assert.equal(hit.source, '敵レーザー');
  assert.deepEqual(hit.cell, cell);
  assert.equal(hit.hpBefore - hit.hpAfter, report.damage);
  assert.ok(report.damage > 0 && report.damage <= 16);
  assert.ok(report.ratioAfter > report.ratioBefore);
  hit.cell.x = 999;
  assert.equal(damageReport(g).hits[0].cell.x, 2);
  applyContact(g, { type: 'dustContact', damage: 0, position });
  applyContact(g, { type: 'enemyAttack', damage: 20, position: { x: 9999, y: 9999 } });
  g.status = 'ended';
  applyContact(g, { type: 'enemyAttack', damage: 20, position });
  assert.equal(damageReport(g).hits.length, 1);
  g.flight.elapsed = 10.01;
  assert.equal(damageReport(g).hits.length, 0);
});

test('damage history stays bounded and clears on a fresh voyage', () => {
  const g = createGame({ campaign: false });
  g.ship.parts = [];
  const position = cellToWorld({ x: 2, y: 8 }, g.flight);
  for (let i = 0; i < 100; i++) applyContact(g, { type: 'enemyAttack', damage: .01, position });
  assert.equal(g.damageHistory.length, DAMAGE_HISTORY_LIMIT);
  assert.equal(damageReport(g).hits.at(-1).sequence, 100);
  assert.equal(damageReport(createGame()).hits.length, 0);
});

test('guidance only remembers observed supplies and hides above 15 vital or after ending', () => {
  const g = createGame({ campaign: false });
  g.knownSupplies = new Map();
  g.hazards = [
    { id: 'near-ice', material: 'ice', radius: 10, position: { x: 40, y: -20 } },
    { id: 'far-ice', material: 'ice', radius: 10, position: { x: 900, y: -20 } },
    { id: 'rock', material: 'rock', radius: 10, position: { x: 10, y: -20 } },
  ];
  g.supplyPaws.units = [{ id: 'near-paw', radius: 14, position: { x: 70, y: -20 } }];
  observeSupplies(g);
  assert.deepEqual([...g.knownSupplies.keys()], ['near-ice', 'near-paw']);
  assert.equal(supplyGuidance(g), null);
  g.vital.value = 15;
  assert.equal(supplyGuidance(g).target.id, 'near-ice');
  g.flight.heading = .8;
  assert.equal(supplyGuidance(g).target.bearing, Math.atan2(40, 20) - .8);
  g.destroyedRocks.add('near-ice');
  assert.equal(supplyGuidance(g).target.id, 'near-paw');
  g.supplyPaws.supplied.add('near-paw');
  observeSupplies(g);
  assert.equal(supplyGuidance(g).target, null);
  g.status = 'ended';
  assert.equal(supplyGuidance(g), null);
});

test('green PAW guidance retains its last observed position and never tracks unseen movement', () => {
  const g = createGame({ campaign: false });
  g.knownSupplies = new Map(); g.hazards = [];
  const paw = { id: 'moving', position: { x: 50, y: 0 }, radius: 14 };
  g.supplyPaws.units = [paw]; observeSupplies(g);
  paw.position.x = 900; observeSupplies(g);
  assert.equal(g.knownSupplies.get(paw.id).position.x, 50);
  for (let i = 0; i < 100; i++) g.hazards.push({ id: `ice-${i}`, material: 'ice', radius: 10, position: { x: 50, y: 0 } });
  observeSupplies(g);
  assert.equal(g.knownSupplies.size, KNOWN_SUPPLY_LIMIT);
});

test('all development scenes preserve tuning, start isolated and pause without accumulating time', () => {
  const tuning = productionTuning(), before = structuredClone(tuning);
  for (const { id } of DEV_SCENARIOS) {
    const g = createDevelopmentGame(id, tuning);
    assert.equal(g.tuning, tuning);
    assert.equal(g.developmentScenario, id);
    const elapsed = g.flight.elapsed;
    stepGame(g, 0, 2);
    assert.equal(g.flight.elapsed, elapsed);
    if (g.status === 'running') assert.equal(g.paused, true);
    const recorder = createAngelRecorder(() => ({ getItem: () => null, setItem() { throw new Error('test scene must not save'); } }));
    assert.equal(recorder.accumulate(g), false);
    assert.equal(recorder.record(g), false);
    assert.equal(recorder.replay(g), false);
    assert.equal(recorder.snapshot().data.totalSeconds, 0);
    assert.equal(recorder.snapshot().data.totalFlights, 0);
  }
  assert.deepEqual(tuning, before);
  assert.throws(() => createDevelopmentGame('unknown', tuning));
});

test('development supply, escort and result scenes expose the features they are meant to inspect', () => {
  const low = createDevelopmentGame('low-vital', productionTuning());
  assert.equal(low.vital.value, 12);
  assert.equal(snapshot(low).supplyGuidance.target.kind, 'ice');
  const escort = createDevelopmentGame('escort', productionTuning());
  assert.equal(escort.escortPaws.units[0].joinedAt, 0);
  const result = createDevelopmentGame('result', productionTuning());
  assert.equal(result.status, 'ended');
  assert.equal(result.end.reason, 'vital');
  assert.ok(snapshot(result).damageReport.hits.length > 0);
});
