import { coreIsOpen, trueCore, TRUE_BOSS } from './trueBossGeometry.js';

export function damageTrueBoss(game, enemy, damage, point, radius, source) {
  const state = game.trueBoss;
  const miss = { damage: 0, weak: false, destroyed: false };
  if (!state || enemy.hp <= 0 || game.status !== 'running' || state.phase === 'ending') return miss;
  if (enemy.type === 'trueEye') {
    if (state.phase === 'dormant' && ['normal', 'wave', 'missile'].includes(source) && damage > 0) {
      state.dormantHits++;
      if (state.dormantHits >= TRUE_BOSS.dormantHits) {
        state.phase = 'absorption'; state.timer = 0;
        game.notice = '謎のエネルギーがフォースに取り付いた！';
      }
      return miss;
    }
    const core = trueCore(enemy);
    if (!coreIsOpen(state) || source !== 'wave' || !(damage > 0) ||
      Math.hypot(point.x - core.position.x, point.y - core.position.y) > core.radius + radius + 1e-8) return miss;
    enemy.hp = 0; state.defeated = true; state.finalHit = { ...point };
    game.enemies.kills++; game.score += 10000;
    return { damage: 1, weak: true, destroyed: true };
  }
  if (state.phase !== 'battleship' || !(damage > 0)) return miss;
  const before = enemy.hp;
  enemy.hp = Math.max(0, enemy.hp - damage);
  enemy.hitAt = game.flight.elapsed;
  if (enemy.hp === 0) {
    game.enemies.kills++; game.score += 500;
    state.debris.push({ position: { ...enemy.position }, type: enemy.type, at: game.flight.elapsed });
    state.debris = state.debris.slice(-24);
  }
  return { damage: before - enemy.hp, weak: false, destroyed: enemy.hp === 0 };
}
