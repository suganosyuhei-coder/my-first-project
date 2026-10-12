// Presentation-only configuration. Change expression assignments here without
// touching flight, collection or energy logic. Individual images override sheet.
export const PILOT_SHEET = {
  src: new URL('../assets/pilot/expressions.png', import.meta.url).href,
  columns: 6,
  aspectRatio: '1 / 2',
};
export const PILOT_EXPRESSIONS = {
  neutral: { frame: 0, label: '基本' },
  thinking: { frame: 1, label: '考え中' },
  smile: { frame: 2, label: '微笑み' },
  determined: { frame: 3, label: '決意' },
  surprised: { frame: 4, label: '驚き' },
  worried: { frame: 5, label: '不安' },
};
// Higher priority wins; durations use simulation seconds, not wall-clock time.
export const PILOT_ACTIONS = [
  { id: 'ended', expression: 'worried', label: '航行不能' },
  { id: 'damage', expression: 'worried', label: '損傷を確認', seconds: 1.5 },
  { id: 'danger', expression: 'worried', label: '重要部分に損傷' },
  { id: 'boosting', expression: 'surprised', label: '急加速' },
  { id: 'fired', expression: 'determined', label: '射撃', seconds: 1 },
  { id: 'charging', expression: 'determined', label: '射撃チャージ中' },
  { id: 'boostCharging', expression: 'determined', label: '急加速準備' },
  { id: 'recovered', expression: 'smile', label: '資材を搬入', seconds: 1.8 },
  { id: 'analyzed', expression: 'smile', label: '解析完了', seconds: 1.8 },
  { id: 'analyzing', expression: 'thinking', label: '星雲を解析中' },
  { id: 'analysisPaused', expression: 'worried', label: '解析を一時停止' },
  { id: 'collecting', expression: 'thinking', label: 'ビット回収中' },
  { id: 'cruising', expression: 'neutral', label: '航行中' },
];
export const PILOT_TUNING = { criticalWarningHp: 35 };

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
    for (const action of actions) if (action.seconds && events[action.id]) expires[action.id] = time + action.seconds * (telemetry.tuning?.animation.reactionDuration??1);
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
      cruising: true,
    };
    previous = current;
    return actions.find(action => action.seconds ? time < (expires[action.id] ?? -1) : states[action.id]) ?? { id: 'cruising', expression: 'neutral', label: '航行中' };
  };
}
