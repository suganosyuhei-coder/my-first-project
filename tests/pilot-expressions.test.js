import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, snapshot } from '../src/prototype/game.js';
import { createPilotController, PILOT_ACTIONS, PILOT_EXPRESSIONS } from '../src/prototype/pilotExpressions.js';

function state() { const t = snapshot(createGame()); t.flight.elapsed = 1; t.jobs = []; return t; }
test('pilot prioritizes damage and end over charges; controller never changes telemetry', () => {
  const t = state(), select = createPilotController();
  assert.equal(select(t).id, 'cruising');
  t.weapon.holding = true; assert.equal(select(t).id, 'charging');
  t.ship.parts[0].hp -= 10; t.flight.elapsed = 2;
  const before = structuredClone(t); assert.equal(select(t).id, 'damage'); assert.deepEqual(t, before);
  t.flight.elapsed = 4; assert.equal(select(t).id, 'charging');
  t.status = 'ended'; assert.equal(select(t).id, 'ended');
});
test('pilot reacts once to shots, inventory credit and analysis; reactions expire and reset', () => {
  const t = state(), select = createPilotController(); select(t);
  t.weapon.shots++; t.flight.elapsed = 2; assert.equal(select(t).id, 'fired');
  t.flight.elapsed = 2.5; assert.equal(select(t).id, 'fired');
  t.flight.elapsed = 3.1; assert.equal(select(t).id, 'cruising');
  t.inventory.wire++; assert.equal(select(t).id, 'recovered');
  t.flight.elapsed = 5; assert.equal(select(t).id, 'cruising');
  t.nebula.observations = [{ id: 'a', state: 'analyzed' }]; assert.equal(select(t).id, 'analyzed');
  t.flight.elapsed = 0; assert.equal(select(t).id, 'cruising');
});
test('pilot handles analysis suspension, collection and boost without classifying removal as damage', () => {
  const t = state(), select = createPilotController(); select(t);
  t.ship.parts.pop(); assert.equal(select(t).id, 'cruising');
  t.jobs = [{ stage: 'returning' }]; assert.equal(select(t).id, 'collecting');
  t.nebula.observations = [{ id: 'a', state: 'detected' }]; t.nebula.selected = 'a';
  t.nebula.observableIds = ['a']; assert.equal(select(t).id, 'analyzing');
  t.nebula.observableIds = []; assert.equal(select(t).id, 'analysisPaused');
  t.boost.holding = true; assert.equal(select(t).id, 'boostCharging');
  t.boost.remaining = .5; assert.equal(select(t).id, 'boosting');
});
test('all action portraits exist and assignments are configurable without game changes', () => {
  for (const action of PILOT_ACTIONS) assert.ok(PILOT_EXPRESSIONS[action.expression]);
  const configured = PILOT_ACTIONS.map(a => a.id === 'cruising' ? { ...a, expression: 'smile' } : a);
  assert.equal(createPilotController(configured)(state()).expression, 'smile');
});
