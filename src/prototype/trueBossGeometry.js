// Provisional encounter balance, isolated from existing enemies and saved tuning.
export const TRUE_BOSS = {
  riftSeconds: 3, absorptionSeconds: 2.4, dormantHits: 6,
  pursuitSpeed: 120, pursuitDistance: 220, coreCycle: 8, coreOpenSeconds: 2.8,
  warningSeconds: 1, endingSeconds: 22,
};
export const TRUE_BOSS_TYPES = [
  { id: 'trueHull', name: '同化戦艦・装甲区画', hp: 500, radius: 60, damage: 8, cooldown: 3, ramDamage: 6 },
  { id: 'trueCannon', name: '同化戦艦・主砲塔', hp: 260, radius: 22, damage: 12, cooldown: 4, ramDamage: 3 },
  { id: 'trueTank', name: '同化戦艦・エネルギータンク', hp: 220, radius: 25, damage: 0, cooldown: 4, ramDamage: 2 },
  { id: 'trueBarnacle', name: '吸着バイド', hp: 100, radius: 15, damage: 3, cooldown: 2.6, ramDamage: 2 },
  { id: 'trueEscort', name: '戦艦随伴レーザー敵', hp: 180, radius: 16, damage: 6, cooldown: 3.8, ramDamage: 2 },
  { id: 'trueEye', name: '帝国中枢・巨大眼球', hp: 1, radius: 60, damage: 8, cooldown: 3, ramDamage: 0 },
].map(type => ({ ...type, speed: 0, shootRange: 1000, shotSpeed: 110, color: '#ff6278' }));
export const trueBossType = enemy => TRUE_BOSS_TYPES.find(t => t.id === enemy.type);
export const trueCore = eye => ({ position: { ...eye.position }, radius: 20 });
export function coreIsOpen(state) {
  return state?.phase === 'pursuit' && state.timer % TRUE_BOSS.coreCycle >= TRUE_BOSS.coreCycle - TRUE_BOSS.coreOpenSeconds;
}
export function trueBossParts(position) {
  const parts = [];
  const add = (type, x, y, required) => {
    const stats = TRUE_BOSS_TYPES.find(t => t.id === type), id = `true-${parts.length}`;
    parts.push({ id, type, hp: stats.hp, campaign: true, trueBossPart: true, required,
      offset: { x, y }, position: { x: position.x + x, y: position.y + y },
      heading: 0, cooldown: 1 + parts.length * .13, ramCooldown: 0, detected: true });
  };
  for (const y of [-100, 0, 100]) add('trueHull', 0, y, true);
  for (const x of [-85, 85]) for (const y of [-80, 70]) add('trueCannon', x, y, true);
  for (const x of [-38, 38]) add('trueTank', x, 135, true);
  for (const x of [-130, 130]) for (const y of [-100, 0, 100]) add('trueBarnacle', x, y, false);
  for (const x of [-195, 195]) for (const y of [-90, 90]) add('trueEscort', x, y, false);
  return parts;
}
