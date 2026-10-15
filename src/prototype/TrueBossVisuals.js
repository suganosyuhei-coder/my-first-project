import {TRUE_SWARM} from './trueBossSwarm.js';
import { worldToScreen } from './model.js';
import { renderCamera } from './camera.js';
import { trueBossType, coreIsOpen, TRUE_BOSS } from './trueBossGeometry.js';

export function drawTrueBoss(ctx, width, height, game) {
  const b = game.trueBoss;
  if (!b || b.phase === 'ending') return;
  const scale = game.viewport.scale, screen = p => worldToScreen(p, renderCamera(game), width, height, scale);
  const centre = screen(b.position);
  ctx.save();
  ctx.strokeStyle = '#ff526d'; ctx.fillStyle = '#30151bd9'; ctx.lineWidth = 1.5;
  if (b.phase === 'rift') {
    ctx.save(); ctx.translate(centre.x, centre.y);
    const opening = Math.min(1, b.timer / TRUE_BOSS.riftSeconds);
    ctx.shadowColor = '#ff253e'; ctx.shadowBlur = 20;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      for (let i = 0; i <= 12; i++) {
        const y = (i / 12 - .5) * 350 * scale, x = side * (12 + Math.sin(i * 2.1) * 10) * opening * scale;
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  if(b.swarmAt!==undefined&&game.flight.elapsed-b.swarmAt<TRUE_SWARM.portalSeconds){
    const age=game.flight.elapsed-b.swarmAt;
    ctx.save();ctx.globalAlpha=Math.max(0,1-age/TRUE_SWARM.portalSeconds);ctx.strokeStyle='#ff8edb';ctx.lineWidth=2;
    for(const portal of b.swarmPortals??[]){const p=screen(portal),r=(14+age*16)*scale;ctx.beginPath();ctx.moveTo(p.x-r*.4,p.y-r);ctx.lineTo(p.x+r*.3,p.y-r*.3);ctx.lineTo(p.x-r*.2,p.y+r*.2);ctx.lineTo(p.x+r*.4,p.y+r);ctx.stroke();}
    ctx.restore();
  }
  for (const part of b.parts.filter(p => p.hp > 0 && p.type !== 'trueEye')) {
    const p = screen(part.position), r = trueBossType(part).radius * scale;
    ctx.save(); ctx.translate(p.x, p.y);
    ctx.fillStyle = part.hitAt !== undefined && game.flight.elapsed - part.hitAt < .1 ? '#ffc1b5' : '#29141c';
    ctx.strokeStyle = part.type === 'trueTank' ? '#ffa273' : '#ff6178';
    if (part.type === 'trueHull') {
      ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * .9, -r * .4); ctx.lineTo(r * .9, r * .5);
      ctx.lineTo(0, r); ctx.lineTo(-r * .9, r * .5); ctx.lineTo(-r * .9, -r * .4); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.strokeRect(-r * .45, -r * .35, r * .9, r * .7);
    } else if (part.type === 'trueTank') {
      ctx.strokeRect(-r * .7, -r, r * 1.4, r * 2); ctx.strokeRect(-r * .4, -r * .7, r * .8, r * 1.4);
    } else if (part.type === 'trueBarnacle') {
      ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5, reach = r * (i % 2 ? .55 : 1); if (i) ctx.lineTo(Math.cos(a) * reach, Math.sin(a) * reach); else ctx.moveTo(Math.cos(a) * reach, Math.sin(a) * reach); }
      ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, r * .3, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.strokeRect(-r, -r * .7, r * 2, r * 1.4);
      ctx.beginPath(); ctx.moveTo(-r * .22, 0); ctx.lineTo(-r * .22, -r * 2);
      ctx.moveTo(r * .22, 0); ctx.lineTo(r * .22, -r * 2); ctx.stroke();
    }
    ctx.fillStyle = '#ff697a'; ctx.fillRect(-r, r + 6, r * 2 * part.hp / trueBossType(part).hp, 2);
    ctx.restore();
    if (part.warning !== undefined) {
      const end = screen({ x: part.position.x + Math.sin(part.attackHeading) * 1100, y: part.position.y - Math.cos(part.attackHeading) * 1100 });
      ctx.strokeStyle = '#ffb3b3'; ctx.setLineDash([5, 8]); ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(end.x, end.y); ctx.stroke(); ctx.setLineDash([]);
    }
  }
  if (['dormant', 'absorption', 'pursuit'].includes(b.phase)) {
    const eye = b.parts.find(p => p.type === 'trueEye'), p = screen(eye.position), open = coreIsOpen(b), r = 60 * scale;
    ctx.save(); ctx.translate(p.x, p.y); ctx.strokeStyle = b.absorbed ? '#ffd184' : '#ff6178';
    ctx.shadowColor = b.absorbed ? '#ffbd4f' : '#ff425e'; ctx.shadowBlur = b.absorbed ? 14 : 0;
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3 + Math.sin(b.timer * .4) * .2;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * .8, Math.sin(a) * r * .8);
      ctx.lineTo(Math.cos(a + .15) * 86 * scale, Math.sin(a + .15) * 86 * scale);
      ctx.lineTo(Math.cos(a) * 110 * scale, Math.sin(a) * 110 * scale); ctx.stroke();
    }
    ctx.fillStyle = '#29151be8'; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, r * .82, r * (open ? .6 : .15), 0, 0, Math.PI * 2); ctx.stroke();
    if (open) { ctx.fillStyle = '#fff3c1'; ctx.beginPath(); ctx.arc(0, 0, 20 * scale, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#b82b40'; ctx.fillRect(-4 * scale, -18 * scale, 8 * scale, 36 * scale); }
    ctx.restore();
    if (b.phase === 'absorption' && b.forcePosition) {
      const from = screen(b.forcePosition); ctx.strokeStyle = '#ebccff'; ctx.lineWidth = 5 * scale;
      ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      const u = Math.min(1, b.timer / TRUE_BOSS.absorptionSeconds);
      ctx.strokeStyle = '#ffd184'; ctx.beginPath(); ctx.arc(from.x + (p.x - from.x) * u, from.y + (p.y - from.y) * u, 12 * scale, 0, Math.PI * 2); ctx.stroke();
    }
  }
  for (const debris of b.debris) {
    const age = game.flight.elapsed - debris.at, p = screen(debris.position);
    ctx.save(); ctx.globalAlpha = Math.max(0, 1 - age / 2); ctx.strokeStyle = '#ffa78d';
    ctx.translate(p.x + Math.sin(debris.position.y) * age * 30, p.y + age * 25); ctx.rotate(age);
    ctx.strokeRect(-12 * scale, -12 * scale, 24 * scale, 24 * scale); ctx.restore();
  }
  ctx.fillStyle = '#ff9a9e'; ctx.font = '11px ui-monospace,monospace';
  ctx.fillText(b.phase === 'rift' ? 'DIMENSION RIFT' : '超高バイド係数 / 異次元戦艦', centre.x - 80, centre.y - 190 * scale);
  ctx.restore();
}
