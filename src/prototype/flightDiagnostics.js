import { shipDamageStatus } from './shipDamage.js';

export const DAMAGE_HISTORY_SECONDS = 10;
export const DAMAGE_HISTORY_LIMIT = 80;

export function recordDamage(game, event) {
  if (!(event.hpBefore > event.hpAfter)) return;
  const at = game.flight.elapsed;
  const entry = {
    ...event,
    cell: { ...event.cell },
    position: { ...event.position },
    at,
    sequence: (game.damageSequence ?? 0) + 1,
    damage: event.hpBefore - event.hpAfter,
    ratioAfter: shipDamageStatus(game.ship).ratio,
  };
  game.damageSequence = entry.sequence;
  game.damageHistory = [...(game.damageHistory ?? []).filter(hit => at - hit.at <= DAMAGE_HISTORY_SECONDS), entry]
    .slice(-DAMAGE_HISTORY_LIMIT);
}

export function damageReport(game) {
  const now = game.flight.elapsed;
  const hits = (game.damageHistory ?? [])
    .filter(hit => now - hit.at <= DAMAGE_HISTORY_SECONDS && hit.at <= now)
    .map(hit => ({ ...hit, cell: { ...hit.cell }, position: { ...hit.position } }));
  return {
    seconds: DAMAGE_HISTORY_SECONDS,
    hits,
    damage: hits.reduce((sum, hit) => sum + hit.damage, 0),
    ratioBefore: hits[0]?.ratioBefore ?? shipDamageStatus(game.ship).ratio,
    ratioAfter: shipDamageStatus(game.ship).ratio,
  };
}
