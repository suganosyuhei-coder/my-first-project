import {worldToScreen} from './model.js';
import {RAILGUN} from './railgun.js';
export function drawRailgun(ctx,width,height,game,reducedMotion){
 const scale=game.viewport.scale,screen=p=>worldToScreen(p,game.flight.position,width,height,scale),w=game.weapon;
 if(!w)return;ctx.save();
 const orb=(point,radius,opacity=1)=>{const p=screen(point);ctx.globalAlpha=opacity;const r=Math.max(2,radius*scale);const glow=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,r*2);glow.addColorStop(0,'#ffffff');glow.addColorStop(.22,'#e9fdff');glow.addColorStop(.5,'#8cdaeeaa');glow.addColorStop(1,'#79d2df00');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(p.x,p.y,r*2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#efffff';ctx.beginPath();ctx.arc(p.x,p.y,r*.34,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;};
 if(w.holding){
  const f=game.flight,origin={x:f.position.x+Math.sin(f.heading)*RAILGUN.muzzleDistance,y:f.position.y-Math.cos(f.heading)*RAILGUN.muzzleDistance},p=screen(origin);
  orb(origin,2+w.charge*11);
  const count=reducedMotion?4:16;
  for(let i=0;i<count;i++){const phase=reducedMotion?.7:(f.elapsed*.6+i/count)%1,angle=i*Math.PI*2/count,spread=(1-phase)*(45+w.charge*20);ctx.strokeStyle='#a6edf066';ctx.beginPath();ctx.moveTo(p.x+Math.cos(angle)*spread,p.y+Math.sin(angle)*spread);ctx.lineTo(p.x+Math.cos(angle)*spread*.8,p.y+Math.sin(angle)*spread*.8);ctx.stroke();}
 }
 for(const shot of w.projectiles){const p=screen(shot.position),speed=Math.hypot(shot.velocity.x,shot.velocity.y);ctx.strokeStyle='#79d2df77';ctx.lineWidth=1+shot.stage;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-shot.velocity.x/speed*(10+shot.stage*10),p.y-shot.velocity.y/speed*(10+shot.stage*10));ctx.stroke();orb(shot.position,shot.radius);}
 for(const effect of w.effects){const t=effect.age/RAILGUN.effectSeconds,p=screen(effect.position);orb(effect.position,(effect.type==='hit'?5:3+effect.stage*4)*(1-t),reducedMotion?.25:1-t);if(!reducedMotion){ctx.strokeStyle=`rgba(170,236,248,${(1-t)*.7})`;ctx.lineWidth=1;ctx.beginPath();ctx.arc(p.x,p.y,4+t*(effect.type==='hit'?20:30),0,Math.PI*2);ctx.stroke();}}
 ctx.restore();
}
