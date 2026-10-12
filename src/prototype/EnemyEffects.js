import {worldToScreen} from './model.js';
import {ENEMY_TYPES,BIT_DEFENSE} from './enemies.js';
export function drawEnemies(ctx,width,height,game){
 const state=game.enemies;if(!state)return;const scale=game.viewport.scale,screen=p=>worldToScreen(p,game.flight.position,width,height,scale);
 ctx.save();
 for(const enemy of state.units){if(enemy.hp<=0||!enemy.detected)continue;const type=ENEMY_TYPES.find(t=>t.id===enemy.type),p=screen(enemy.position),r=type.radius*scale;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(enemy.heading);ctx.fillStyle='#16202e';ctx.strokeStyle=type.color;ctx.lineWidth=1.5;
  if(type.supportRange){ctx.strokeStyle='#D6B7F433';ctx.setLineDash([3,8]);ctx.beginPath();ctx.arc(0,0,type.supportRange*scale,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle=type.color;ctx.fillRect(-r,-r,r*2,r*2);ctx.strokeRect(-r,-r,r*2,r*2);ctx.strokeRect(-r*.5,-r*.5,r,r);}
  else{ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(r,r);ctx.lineTo(0,r*.5);ctx.lineTo(-r,r);ctx.closePath();ctx.fill();ctx.stroke();if(type.shootRange>0)ctx.fillRect(-2,-r-4,4,7);}
  ctx.fillStyle=enemy.supported?'#f7d6ff':type.color;ctx.fillRect(-2,-2,4,4);ctx.restore();ctx.fillStyle=type.color;ctx.font='9px ui-monospace,monospace';ctx.fillText(type.name,p.x+r+5,p.y);ctx.fillStyle='#ffffff55';ctx.fillRect(p.x-r,p.y+r+5,r*2,2);ctx.fillStyle=type.color;ctx.fillRect(p.x-r,p.y+r+5,r*2*enemy.hp/type.hp,2);
 }
 for(const shot of state.shots){const p=screen(shot.position);ctx.fillStyle='#D95757';ctx.fillRect(p.x-2,p.y-3,4,6);}
 for(const beam of state.beams){const from=screen(beam.from),to=screen(beam.to);ctx.globalAlpha=Math.max(0,1-beam.age/BIT_DEFENSE.beamSeconds);ctx.strokeStyle='#79D2DF';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.lineTo(to.x,to.y);ctx.stroke();ctx.strokeStyle='#efffff';ctx.lineWidth=1.3;ctx.stroke();}
 ctx.restore();
}
