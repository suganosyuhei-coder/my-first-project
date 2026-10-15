import {STABLE_SPACE,stableBoundaryPoints} from './stableSpace.js';
import {worldToScreen} from './model.js';
import {renderCamera} from './camera.js';
const boundary=stableBoundaryPoints();
// Keep the regular space background; only the border identifies the safe region.
export function drawStableSpaceBackground(){}
export function drawStableSpace(ctx,width,height,game){
 if(!game?.stableSpace)return;
 const scale=game.viewport.scale,camera=renderCamera(game),p=worldToScreen(STABLE_SPACE.centre,camera,width,height,scale),r=STABLE_SPACE.radius*scale;
 if(p.x+r<0||p.x-r>width||p.y+r<0||p.y-r>height)return;
 ctx.save();ctx.beginPath();boundary.forEach((point,i)=>{const screen=worldToScreen(point,camera,width,height,scale);if(i===0)ctx.moveTo(screen.x,screen.y);else ctx.lineTo(screen.x,screen.y);});ctx.closePath();ctx.strokeStyle='#8ae3ac';ctx.lineWidth=1.5;ctx.setLineDash([3,8]);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle='#b4e8c7';ctx.font='10px ui-monospace,monospace';ctx.fillText('安定空域 / STABLE SPACE',p.x-90,p.y-r+18);ctx.restore();
}
