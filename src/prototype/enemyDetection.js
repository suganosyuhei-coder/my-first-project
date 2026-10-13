// Detection effects are keyed to the first encounter, never to each render frame.
export function markEnemyDetected(enemy,visible,time){
 if(enemy.detected||!visible)return false;
 enemy.detected=true;enemy.detectedAt=time;return true;
}
export function detectionGlow(enemy,time){
 if(enemy.type==='pow'||!Number.isFinite(enemy.detectedAt))return null;
 const boss=['miniboss','finalBoss'].includes(enemy.type),commander=['leader','commander'].includes(enemy.type),duration=boss?1.35:commander?.75:.35,age=time-enemy.detectedAt;
 if(age<0||age>=duration)return null;
 const progress=age/duration,strength=Math.sin(Math.PI*progress)*(boss?(.65+.35*Math.cos(age*18)**2):1);
 return {strength,radius:boss?24:commander?12:5,color:boss?'#dc39fa':commander?'#f2a7ff':'#ffb28a',boss};
}
export function drawDetectionGlow(ctx,enemy,time,scale,radius){
 const glow=detectionGlow(enemy,time);if(!glow)return;
 const y=enemy.type==='finalBoss'?-radius*.72:0,r=glow.radius*scale;
 ctx.save();ctx.globalAlpha=glow.strength;ctx.fillStyle=glow.color;ctx.shadowColor=glow.color;ctx.shadowBlur=r*1.5;
 ctx.beginPath();ctx.arc(0,y,r,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;ctx.strokeStyle=glow.color;ctx.lineWidth=glow.boss?2:1;
 ctx.beginPath();ctx.moveTo(-r*2,y);ctx.lineTo(r*2,y);ctx.moveTo(0,y-r*1.5);ctx.lineTo(0,y+r*1.5);ctx.stroke();
 if(glow.boss){ctx.beginPath();ctx.ellipse(0,y,r*1.6,r*.65,time*2,0,Math.PI*2);ctx.stroke();}
 ctx.fillStyle='#fff4ee';ctx.fillRect(-2*scale,y-2*scale,4*scale,4*scale);ctx.restore();
}
