import dialogue from './pilotDialogue.json' with {type:'json'};
// Presentation-only configuration. Change expression assignments here without
// touching flight, collection or energy logic. Individual images override sheet.
export const PILOT_SHEET = {
  src: new URL('../assets/pilot/expressions.png', import.meta.url).href,
  columns: 6,
  aspectRatio: '1 / 2',
};
export const PILOT_EXPRESSIONS = dialogue.expressions;
// Ordered JSON conditions choose both the pose and dialogue. First match wins.
export const PILOT_ACTIONS = dialogue.actions;
export const PILOT_TUNING = dialogue.tuning;

export function createPilotController(actions = PILOT_ACTIONS) {
  let previous = null;
  const expires = {};
  return telemetry => {
    const time = telemetry.flight.elapsed;
    const selection = telemetry.nebula.observations.find(r => r.id === telemetry.nebula.selected);
    const current = {
      time,
      shots: telemetry.weapon.shots,
      inventory: Object.values(telemetry.inventory).reduce((n, count) => n + count, 0),
      hp: new Map([...telemetry.ship.cells.map(c => [`cell:${c.x},${c.y}`, c.hp]), ...telemetry.ship.parts.map(p => [`part:${p.id}`, p.hp])]),
      analyzed: new Set(telemetry.nebula.observations.filter(r => r.state === 'analyzed').map(r => r.id)),
    };
    // A new voyage also resets reactions when its elapsed time equals the old one.
    if (previous && (time < previous.time || time === 0)) {
      previous = null;
      for (const key of Object.keys(expires)) delete expires[key];
    }
    const events = {
      damage: previous && [...current.hp].some(([id, hp]) => previous.hp.has(id) && hp < previous.hp.get(id)),
      fired: previous && current.shots > previous.shots,
      recovered: previous && current.inventory > previous.inventory,
      analyzed: previous && [...current.analyzed].some(id => !previous.analyzed.has(id)),
    };
    for (const action of actions) if (action.seconds && events[action.condition??action.id]) expires[action.id] = time + action.seconds * (telemetry.tuning?.animation.reactionDuration??1);
    const analyzing = selection && selection.state !== 'analyzed';
    const states = {
      ended: telemetry.status !== 'running',
      danger: Math.min(telemetry.ship.critical.canopy, telemetry.ship.critical.core) <= PILOT_TUNING.criticalWarningHp,
      boosting: telemetry.boost.remaining > 0,
      charging: telemetry.weapon.holding,
      boostCharging: telemetry.boost.holding,
      analyzing: analyzing && telemetry.nebula.observableIds.includes(selection.id),
      analysisPaused: analyzing && !telemetry.nebula.observableIds.includes(selection.id),
      collecting: telemetry.jobs.some(j => !['complete', 'cancelled'].includes(j.stage)),
      enemyThreat: telemetry.enemies?.units.some(e=>e.hp>0&&e.detected),
      cruising: true,
    };
    previous = current;
    return actions.find(action => action.seconds ? time < (expires[action.id] ?? -1) : states[action.condition??action.id]) ?? { id: 'cruising', expression: 'neutral', label: '航行中' };
  };
}
