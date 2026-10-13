import {drawPowArmor} from './PowArmor.js';import {worldToScreen} from './model.js';import {renderCamera} from './camera.js';
export function drawSupplyPaws(ctx,width,height,game){
 const state=game.supplyPaws;if(!state)return;const scale=game.viewport.scale,screen=p=>worldToScreen(p,renderCamera(game),width,height,scale);ctx.save();
 for(const unit of state.units){const p=screen(unit.position),r=unit.radius*scale;if(p.x+r<0||p.x-r>width||p.y+r<0||p.y-r>height)continue;ctx.save();ctx.translate(p.x,p.y);drawPowArmor(ctx,r,game.flight.elapsed,'green');ctx.strokeStyle='#9dffb6';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-4,-r-10);ctx.lineTo(4,-r-10);ctx.moveTo(0,-r-14);ctx.lineTo(0,-r-6);ctx.stroke();ctx.fillStyle='#a5f9be';ctx.font='10px ui-monospace,monospace';ctx.textAlign='center';ctx.fillText('SUPPLY PAW',0,r+23);ctx.fillText('接触で補給',0,r+36);ctx.restore();}
 for(const effect of state.effects){const age=game.flight.elapsed-effect.at,p=screen(effect.position);ctx.globalAlpha=Math.max(0,1-age);ctx.strokeStyle='#a5ffbc';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,(18+age*45)*scale,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#d6ffe0';ctx.font='bold 12px ui-monospace,monospace';ctx.fillText('補給完了',p.x+12,p.y-16);}
 ctx.restore();
}
