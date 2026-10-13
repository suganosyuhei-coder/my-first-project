export const WEAKPOINT_FLASH_SECONDS=.32;
export function weakpointFeedback(enemy,time){const age=time-(enemy.weakHitAt??-Infinity);if(age<0||age>=WEAKPOINT_FLASH_SECONDS||!enemy.parasiteRevealed)return null;return {progress:age/WEAKPOINT_FLASH_SECONDS,alpha:(1-age/WEAKPOINT_FLASH_SECONDS)*.85};}
export function drawWeakpointFeedback(ctx,point,radius,enemy,time){
 const effect=weakpointFeedback(enemy,time);if(!effect)return;const r=radius*(1+effect.progress*.3);
 ctx.save();ctx.globalAlpha=effect.alpha;ctx.strokeStyle='#fff0e5';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(point.x,point.y-r);ctx.lineTo(point.x+r,point.y);ctx.lineTo(point.x,point.y+r);ctx.lineTo(point.x-r,point.y);ctx.closePath();ctx.stroke();
 for(const [x,y] of [[-1,0],[1,0],[0,-1],[0,1]]){ctx.beginPath();ctx.moveTo(point.x+x*r*1.15,point.y+y*r*1.15);ctx.lineTo(point.x+x*r*1.4,point.y+y*r*1.4);ctx.stroke();}ctx.restore();
}
