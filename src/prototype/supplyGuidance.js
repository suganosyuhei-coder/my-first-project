export const SUPPLY_GUIDANCE_VITAL = 15;
export const KNOWN_SUPPLY_LIMIT = 64;

export function observeSupplies(game) {
  const known = game.knownSupplies ??= new Map();
  const origin = game.flight.position;
  const visible = unit => Math.hypot(unit.position.x - origin.x, unit.position.y - origin.y)
    <= game.observation + (unit.radius ?? 0);
  for (const ice of game.hazards) {
    if (ice.material !== 'ice' || game.destroyedRocks.has(ice.id) || !visible(ice)) continue;
    known.set(ice.id, { id: ice.id, kind: 'ice', label: ice.large ? '大きな氷塊' : '氷', position: { ...ice.position } });
  }
  for (const paw of game.supplyPaws?.units ?? []) {
    if (game.supplyPaws.supplied.has(paw.id)) continue;
    // Update the last known position, but never track movement outside observation.
    if (visible(paw)) known.set(paw.id, { id: paw.id, kind: 'paw', label: '緑PAW', position: { ...paw.position } });
  }
  for (const [id, supply] of known) {
    if (supply.kind === 'ice' ? game.destroyedRocks.has(id) : game.supplyPaws?.supplied.has(id)) known.delete(id);
  }
  while (known.size > KNOWN_SUPPLY_LIMIT) known.delete(known.keys().next().value);
}

export function supplyGuidance(game) {
  if (game.status !== 'running' || game.vital.value > SUPPLY_GUIDANCE_VITAL) return null;
  let nearest = null;
  for (const supply of game.knownSupplies?.values() ?? []) {
    if (supply.kind === 'ice' ? game.destroyedRocks.has(supply.id) : game.supplyPaws?.supplied.has(supply.id)) continue;
    const dx = supply.position.x - game.flight.position.x;
    const dy = supply.position.y - game.flight.position.y;
    const distance = Math.hypot(dx, dy);
    if (!nearest || distance < nearest.distance) nearest = {
      ...supply, position: { ...supply.position }, distance,
      bearing: Math.atan2(dx, -dy) - game.flight.heading,
    };
  }
  return { target: nearest };
}
