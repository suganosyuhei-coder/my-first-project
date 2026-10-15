import {outsideStableBossPosition,constrainTrueBossMove,trueBossBlockedVisible} from './trueBossBoundary.js';
import {spawnTrueBossSwarm} from './trueBossSwarm.js';
import { TRUE_BOSS, trueBossParts, coreIsOpen, trueBossType } from './trueBossGeometry.js';
import { forceBody } from './force.js';
import { cancelRailgun } from './railgun.js';
import { cancelBoost } from './boost.js';

export function allClustersDefeated(campaign) {
  return !!campaign?.bossCleared && (campaign.mossGroups?.length ?? 0) > 0 && campaign.mossGroups.every(group => {
    const members = campaign.units.filter(e => e.clusterId === group.id);
    return members.length === group.count && members.every(e => e.hp <= 0);
  });
}
export function triggerTrueBoss(game) {
  if (game.trueBoss || game.status !== 'running' || !allClustersDefeated(game.campaign)) return false;
  const f = game.flight;
  game.trueBoss = { phase: 'rift', timer: 0, position: {
    x: f.position.x + Math.sin(f.heading) * 400, y: f.position.y - Math.cos(f.heading) * 400,
  }, parts: [], dormantHits: 0, attackClock: 1, debris: [], defeated: false, absorbed: false };
  game.trueBoss.position=outsideStableBossPosition(game,game.trueBoss.position,240);
  game.enemies.shots=[];game.enemies.beams=[];
  game.notice = '高バイド係数の消失を確認。次元の裂け目が開く――';
  return true;
}
function deployBattleship(state) {
  state.phase = 'battleship'; state.timer = 0;
  state.parts = trueBossParts(state.position);
}
function exposeEye(game) {
  const state = game.trueBoss;
  state.phase = 'dormant'; state.timer = 0;
  for (const part of state.parts) if (part.hp > 0) {
    part.hp = 0;
    state.debris.push({ position: { ...part.position }, type: part.type, at: game.flight.elapsed });
  }
  state.parts.push({ id: 'true-eye', type: 'trueEye', hp: 1, campaign: true, trueBossPart: true,
    required: false, position: { ...state.position }, offset: { x: 0, y: 0 }, heading: 0,
    detected: true, cooldown: 1, ramCooldown: 0 });
  game.notice = '装甲の奥に巨大な眼球。攻撃への反応がない……。';
}
function fireVolley(game, part, angle, offsets, speed = 110) {
  const state = game.enemies, damage = trueBossType(part).damage * (game.tuning?.enemies.damageMultiplier ?? 1);
  for (const offset of offsets) state.shots.push({ id: state.nextShot++, enemyType: part.type, kind: 'bossOrb',
    position: { ...part.position }, velocity: { x: Math.sin(angle + offset) * speed, y: -Math.cos(angle + offset) * speed },
    radius: 5, damage, remaining: 7 });
}
function fireLaser(game, part) {
  const state = game.enemies;
  state.shots.push({ id: state.nextShot++, enemyType: part.type, kind: part.type === 'trueEscort' ? 'sniperLaser' : 'bossLaser',
    position: { ...part.position }, heading: part.attackHeading, velocity: { x: 0, y: 0 },
    radius: part.type === 'trueCannon' ? 13 : 3, length: 1100,
    damage: trueBossType(part).damage * (game.tuning?.enemies.damageMultiplier ?? 1),
    remaining: .8, hitCooldown: 0 });
}
export function stepTrueBoss(game, dt) {
  if (game.status !== 'running' || game.paused) return;
  triggerTrueBoss(game);
  const state = game.trueBoss;
  if (!state) return;
  const radius=['rift','battleship'].includes(state.phase)?240:112;
  const safe=outsideStableBossPosition(game,state.position,radius),shift={x:safe.x-state.position.x,y:safe.y-state.position.y};
  if(shift.x||shift.y){state.position=safe;for(const part of state.parts){part.position.x+=shift.x;part.position.y+=shift.y;}}
  state.stableBlocked=false;
  state.timer += dt;
  for(const part of state.parts)part.ramCooldown=Math.max(0,(part.ramCooldown??0)-dt);
  state.debris = state.debris.filter(e => game.flight.elapsed - e.at < 2);
  if (state.phase === 'rift') {
    if (state.timer >= TRUE_BOSS.riftSeconds) deployBattleship(state);
    return;
  }
  if (state.phase === 'battleship') {
    if (state.parts.filter(p => p.required).every(p => p.hp <= 0)) { exposeEye(game); return; }
    for (const part of state.parts.filter(p => p.hp > 0)) {
      const dx = game.flight.position.x - part.position.x, dy = game.flight.position.y - part.position.y;
      if (Math.hypot(dx, dy) > 1100) continue;
      part.cooldown = Math.max(0, part.cooldown - dt);
      if (part.type === 'trueTank') continue;
      if (part.type === 'trueCannon' || part.type === 'trueEscort') {
        if (part.cooldown <= 0 && part.warning === undefined) {
          part.warning = TRUE_BOSS.warningSeconds;
          part.attackHeading = Math.atan2(dx, -dy);
        }
        if (part.warning !== undefined) {
          part.warning = Math.max(0, part.warning - dt);
          if (part.warning === 0) { fireLaser(game, part); delete part.warning; part.cooldown = trueBossType(part).cooldown; }
        }
      } else if (part.cooldown <= 0) {
        fireVolley(game, part, Math.atan2(dx, -dy), part.type === 'trueHull' ? [-.22, 0, .22] : [-.4, -.2, 0, .2, .4]);
        part.cooldown = trueBossType(part).cooldown;
      }
    }
  } else if (state.phase === 'absorption') {
    state.forcePosition = forceBody(game)?.position ?? state.forcePosition;
    if (state.timer >= TRUE_BOSS.absorptionSeconds * .5 && !state.absorbed) {
      state.absorbed = true;
      game.force.equipped = false; game.force.absorbed = true;
      cancelRailgun(game.weapon); game.weapon.autoFire = false;
      game.notice = 'フォースの反応消失。自機の波動砲でコアを狙え。';
    }
    if (state.timer >= TRUE_BOSS.absorptionSeconds) {
      state.phase = 'pursuit'; state.timer = 0; state.attackClock = 1;
    }
  } else if (state.phase === 'pursuit') {
    const eye = state.parts.find(p => p.type === 'trueEye');
    const dx = game.flight.position.x - eye.position.x, dy = game.flight.position.y - eye.position.y, d = Math.hypot(dx, dy);
    const speed = Math.max(TRUE_BOSS.pursuitSpeed, Math.hypot(game.flight.velocity.x, game.flight.velocity.y) * 1.06);
    const move = Math.min(speed * dt, Math.max(0, d - TRUE_BOSS.pursuitDistance));
    if (d > 0) {
      const result=constrainTrueBossMove(game,eye.position,{x:eye.position.x+dx/d*move,y:eye.position.y+dy/d*move},112);
      eye.position=result.position;state.stableBlocked=result.blocked;
    }
    state.position = { ...eye.position }; eye.coreOpen = coreIsOpen(state);
    if(eye.coreOpen){
      const cycle=Math.floor(state.timer/TRUE_BOSS.coreCycle);
      if(state.lastCoreOpeningCycle!==cycle){state.lastCoreOpeningCycle=cycle;if(cycle%2===0)spawnTrueBossSwarm(game,{newWave:true});}
    }
    state.attackClock -= dt;
    if (!eye.coreOpen && state.attackClock <= 0) {
      // Six tentacle tips attack in an aimed fan; the following core opening is the safe firing opportunity.
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3 + Math.sin(state.timer * .4) * .2;
        const tip = { ...eye, position: { x: eye.position.x + Math.cos(a) * 110, y: eye.position.y + Math.sin(a) * 110 } };
        fireVolley(game, tip, Math.atan2(game.flight.position.x - tip.position.x, -(game.flight.position.y - tip.position.y)), [-.12, .12], 150);
      }
      state.attackClock = 2.8;
    }
  }
}
export function finishTrueBoss(game) {
  const state = game.trueBoss;
  if (game.status !== 'running' || !state?.defeated) return false;
  state.phase = 'ending'; state.timer = 0;
  state.minions=[];state.swarmPortals=[];game.enemies.units=game.enemies.units.filter(e=>!e.trueBossMinion);
  game.status = 'cleared'; game.paused = false;
  game.force.equipped = false; game.force.absorbed = true;
  game.end = { reason: 'trueBoss', continuable: false, endingElapsed: 0, critical: [],
    position: { ...game.flight.position }, maxDistance: game.flight.maxDistance };
  game.flight.velocity = { x: 0, y: 0 };
  game.weapon.autoFire = false; game.weapon.subspaceGrace = 0;
  cancelRailgun(game.weapon); cancelBoost(game.boost, true);
  game.weapon.projectiles = []; game.weapon.effects = [];
  game.enemies.shots = []; game.enemies.beams = [];
  game.missiles.units = []; game.missiles.effects = [];
  game.escortPaws.units = []; game.escortPaws.shots = [];
  game.commands.length = 0;
  for (const job of game.jobs) if (!['complete', 'cancelled'].includes(job.stage)) job.stage = 'cancelled';
  for (const bit of game.bits) { bit.state = 'disabled'; bit.jobId = null; }
  game.notice = '機体回収。パイロットの姿を確認できず。消息不明。';
  return true;
}
export function stepTrueEnding(game, dt) {
  if (game.end?.reason !== 'trueBoss') return false;
  game.end.endingElapsed = Math.min(TRUE_BOSS.endingSeconds, (game.end.endingElapsed ?? 0) + Math.max(0, dt));
  game.commands.length = 0;
  return true;
}
export function trueBossSnapshot(game) {
  const state = game.trueBoss;
  if (!state) return null;
  return { phase: state.phase, timer: state.timer, position: { ...state.position },
    absorbed: state.absorbed, coreOpen: coreIsOpen(state),
    stableBlocked:!!state.stableBlocked,stableBlockedVisible:trueBossBlockedVisible(game),
    swarmWaves:state.swarmWaves??0,swarmRemaining:(state.minions??[]).filter(e=>e.hp>0).length,
    remaining: state.parts.filter(p => p.required && p.hp > 0).length,
    total: state.parts.filter(p => p.required).length,
    dormantHits: state.dormantHits,
    distance: Math.hypot(state.position.x - game.flight.position.x, state.position.y - game.flight.position.y) };
}
