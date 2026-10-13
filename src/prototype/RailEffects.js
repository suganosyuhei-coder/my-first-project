import {renderCamera,flightAnchor} from './camera.js';
import {diffusionVisualRadius} from './diffusion.js';
import {weaponMuzzleDistance,forceTuning} from './force.js';
import {worldToScreen} from './model.js';
import {RAILGUN} from './railgun.js';
import {aimTarget,AIM} from './targeting.js';
export function drawRailgun(ctx,width,height,game,reducedMotion){
 const scale=game.viewport.scale,screen=p=>worldToScreen(p,renderCamera(game),width,height,scale),w=game.weapon;
 if(!w)return;ctx.save();
 const muzzleDistance=weaponMuzzleDistance(game,RAILGUN.muzzleDistance);
 const target=aimTarget(game,game.flight.heading,(game.force?.equipped&&w.limitStage===0?forceTuning(game).normalRange:RAILGUN.ranges[w.limitStage]),muzzleDistance);
 if(target){
  const p=screen(target.rock.position),size=target.rock.radius*scale+8;ctx.strokeStyle='#79d2df';ctx.lineWidth=1;ctx.setLineDash([]);
  for(const [x,y] of [[-1,-1],[1,-1],[-1,1],[1,1]]){ctx.beginPath();ctx.moveTo(p.x+x*(size-5),p.y+y*size);ctx.lineTo(p.x+x*size,p.y+y*size);ctx.lineTo(p.x+x*size,p.y+y*(size-5));ctx.stroke();}
  ctx.fillStyle='#a7eced';ctx.font='9px ui-monospace,monospace';ctx.fillText('LOCK',p.x-size,p.y-size-6);
 }
 for(const rock of game.hazards.filter(h=>['impact','obstacle'].includes(h.type))){
  const started=game.rockAlerts.get(rock.id);if(started===undefined||game.flight.elapsed-started>AIM.warningSeconds)continue;
  const p=screen(rock.position),x=Math.max(12,Math.min(width-110,p.x-35)),y=Math.max(100,Math.min(height-70,p.y-rock.radius*scale-22));
  ctx.fillStyle='#101820e6';ctx.fillRect(x-4,y-12,103,19);ctx.fillStyle='#eeaa72';ctx.font='9px ui-monospace,monospace';ctx.fillText(`△ ROCK / ${Math.round(Math.hypot(rock.position.x-game.flight.position.x,rock.position.y-game.flight.position.y))}m`,x,y);
 }
 if(w.holding){
  const f=game.flight,origin={x:f.position.x+Math.sin(f.heading)*muzzleDistance,y:f.position.y-Math.cos(f.heading)*muzzleDistance},p=screen(origin);
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(f.heading);const charge=Math.min(1,w.charge);const extent=5+charge*20;ctx.globalAlpha=.3+charge*.6;ctx.fillStyle=w.convergenceReady?'#d6a6ff':'#79d2df';ctx.fillRect(-extent,-2,extent*2,4);ctx.fillStyle='#f2ffff';ctx.fillRect(-2,-extent*.5,4,extent);
  if(!reducedMotion)for(let i=0;i<8;i++){const phase=(f.elapsed*.8+i/8)%1,angle=i*Math.PI/4,distance=(1-phase)*45;ctx.fillStyle='#91e1eb';ctx.fillRect(Math.cos(angle)*distance-1,Math.sin(angle)*distance-1,2,2);}
  ctx.restore();
 }
 for(const shot of w.projectiles){
  const p=screen(shot.position),dx=Math.sin(shot.heading),dy=-Math.cos(shot.heading),length=RAILGUN.tracerLength*scale,tail={x:p.x-dx*length,y:p.y-dy*length};
  const glow=ctx.createLinearGradient(tail.x,tail.y,p.x,p.y);glow.addColorStop(0,'#79d2df00');glow.addColorStop(.6,'#a4e7ed');glow.addColorStop(1,'#ffffff');ctx.strokeStyle=glow;ctx.lineWidth=3.5*scale;ctx.lineCap='butt';ctx.beginPath();ctx.moveTo(tail.x,tail.y);ctx.lineTo(p.x,p.y);ctx.stroke();
  ctx.strokeStyle='#f6ffff';ctx.lineWidth=1.3*scale;ctx.beginPath();ctx.moveTo(p.x-dx*4*scale,p.y-dy*4*scale);ctx.lineTo(p.x,p.y);ctx.stroke();
 }
 for(const effect of w.effects){
  const lifetime=effect.duration??(effect.type==='beam'?RAILGUN.beamSeconds:effect.type==='muzzle'?RAILGUN.flashSeconds:effect.type==='trail'?RAILGUN.trailSeconds:RAILGUN.effectSeconds),t=Math.min(1,effect.age/lifetime),opacity=reducedMotion?.65:(1-t)**.4;
  ctx.globalAlpha=opacity;const p=screen(effect.position);
  if(effect.type==='beam'){
   const destination=screen(effect.end),extension=effect.path?1:Math.min(1,effect.age/.4),end={x:p.x+(destination.x-p.x)*extension,y:p.y+(destination.y-p.y)*extension},beamWidth=(effect.stage===3?diffusionVisualRadius(effect.radius):effect.radius)*2*scale*(.8+.2*(1-t));ctx.lineCap='butt';
   const spiral=effect.enhanced&&effect.stage>0&&effect.stage!==3;
   const coreWidth=spiral?RAILGUN.radii[effect.stage]*2*scale*(.8+.2*(1-t)):beamWidth;
   const beamPath=effect.path?.map(screen)??(effect.stage>0?Array.from({length:49},(_,i)=>({x:p.x+(end.x-p.x)*i/48,y:p.y+(end.y-p.y)*i/48})):null);
   for(const [factor,color] of (effect.converging?[[1.7,'#be8fff33'],[1.15,'#b889efa0'],[.7,'#e3c7ff'],[.3,'#ffffff']]:[[1.7,'#79d2df28'],[1.15,'#62cbe6a0'],[.7,'#a2eef8'],[.3,'#f8ffff']])){ctx.lineWidth=coreWidth*factor;ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(p.x,p.y);if(beamPath){
    ctx.lineCap='round';for(let i=1;i<beamPath.length;i++){const u=i/(beamPath.length-1);ctx.globalAlpha=opacity*(.15+.85*u);ctx.lineWidth=coreWidth*factor*(.12+1.7*u*u)*(1+1.016*u**6)*(effect.path?1:1-.2*u**6);ctx.beginPath();ctx.moveTo(beamPath[i-1].x,beamPath[i-1].y);ctx.lineTo(beamPath[i].x,beamPath[i].y);ctx.stroke();}ctx.globalAlpha=opacity;
   }else{ctx.lineTo(end.x,end.y);ctx.stroke();}}
   if(spiral){
    const dx=end.x-p.x,dy=end.y-p.y,length=Math.hypot(dx,dy),radius=Math.max(14*scale,beamWidth*.72)*1.6,diameter=radius*2,shift=reducedMotion?0:effect.age*55*scale;
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(Math.atan2(dy,dx));ctx.beginPath();ctx.rect(0,-radius-beamWidth,length,radius*2+beamWidth*2);ctx.clip();ctx.lineCap='round';
    for(const strand of [0,1])for(const [factor,color] of [[.28,strand?'#ff617c55':'#79eaff55'],[.12,strand?'#ff617c':'#79eaff'],[.04,strand?'#ffe3e8':'#e3fbff']]){
     ctx.lineWidth=beamWidth*factor;ctx.strokeStyle=color;
     for(let n=Math.floor(-shift/diameter)-1;n*diameter+shift<length;n++){
      const u=Math.max(0,Math.min(1,(n*diameter+shift+radius)/Math.max(1,length))),afterglow=Math.max(0,1-t/(.35+.65*u))**1.4;ctx.globalAlpha=afterglow*(.3+.7*u);if(afterglow<=0)continue;const upper=((n+strand)%2+2)%2===0;ctx.beginPath();ctx.arc(n*diameter+shift+radius,0,radius,upper?Math.PI:0,upper?Math.PI*2:Math.PI);ctx.stroke();
     }
    }
    ctx.restore();ctx.globalAlpha=opacity;
   }
   if(!beamPath){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(effect.heading);ctx.fillStyle='#e8ffff';ctx.fillRect(-beamWidth*.65,-3,beamWidth*1.3,6);ctx.restore();}
  }else if(effect.type==='convergence'){ctx.strokeStyle='#e3c7ff';ctx.lineWidth=2*scale;ctx.beginPath();ctx.arc(p.x,p.y,(7+t*28)*scale,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#ffffff';ctx.fillRect(p.x-3*scale,p.y-3*scale,6*scale,6*scale);
  }else if(effect.type==='muzzle'){
   ctx.save();ctx.translate(p.x,p.y);ctx.rotate(effect.heading);const spread=4+effect.stage*3;ctx.fillStyle='#edffff';ctx.fillRect(-2,-spread,4,spread+2);ctx.strokeStyle='#91d9e7';ctx.lineWidth=1;
   for(let i=0;i<(reducedMotion?3:6);i++){const angle=i*Math.PI/3+Math.PI/6;ctx.beginPath();ctx.moveTo(Math.cos(angle)*3,Math.sin(angle)*3);ctx.lineTo(Math.cos(angle)*spread*1.4,Math.sin(angle)*spread*1.4);ctx.stroke();}ctx.restore();
  }else if(effect.type==='trail'){
   const end=screen(effect.end);ctx.strokeStyle='#79d2df';ctx.lineWidth=.65*scale;ctx.globalAlpha=opacity*.22;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(end.x,end.y);ctx.stroke();
  }else if(effect.type==='hit'){
   const count=reducedMotion?5:12;
   for(let i=0;i<count;i++){const angle=i*2.399+effect.heading,distance=6+t*(20+(i%3)*10),size=Math.max(1,4*(1-t));ctx.fillStyle=i%3?'#b3c0c4':'#d9f7f5';ctx.fillRect(Math.round(p.x+Math.cos(angle)*distance),Math.round(p.y+Math.sin(angle)*distance),size,size);}
   ctx.strokeStyle='#b8f4fa';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x-12*(1-t),p.y);ctx.lineTo(p.x+12*(1-t),p.y);ctx.moveTo(p.x,p.y-12*(1-t));ctx.lineTo(p.x,p.y+12*(1-t));ctx.stroke();
  }
 }
 ctx.restore();
}
