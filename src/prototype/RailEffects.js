import {worldToScreen} from './model.js';
import {RAILGUN} from './railgun.js';
import {aimTarget,AIM} from './targeting.js';
export function drawRailgun(ctx,width,height,game,reducedMotion){
 const scale=game.viewport.scale,screen=p=>worldToScreen(p,game.flight.position,width,height,scale),w=game.weapon;
 if(!w)return;ctx.save();
 const target=aimTarget(game,game.flight.heading,RAILGUN.ranges[w.limitStage],RAILGUN.muzzleDistance);
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
  const f=game.flight,origin={x:f.position.x+Math.sin(f.heading)*RAILGUN.muzzleDistance,y:f.position.y-Math.cos(f.heading)*RAILGUN.muzzleDistance},p=screen(origin);
  ctx.save();ctx.translate(p.x,p.y);ctx.rotate(f.heading);const extent=5+w.charge*20;ctx.globalAlpha=.3+w.charge*.6;ctx.fillStyle='#79d2df';ctx.fillRect(-extent,-2,extent*2,4);ctx.fillStyle='#f2ffff';ctx.fillRect(-2,-extent*.5,4,extent);
  if(!reducedMotion)for(let i=0;i<8;i++){const phase=(f.elapsed*.8+i/8)%1,angle=i*Math.PI/4,distance=(1-phase)*45;ctx.fillStyle='#91e1eb';ctx.fillRect(Math.cos(angle)*distance-1,Math.sin(angle)*distance-1,2,2);}
  ctx.restore();
 }
 for(const effect of w.effects){
  const lifetime=effect.type==='beam'?RAILGUN.beamSeconds:RAILGUN.effectSeconds,t=Math.min(1,effect.age/lifetime),opacity=reducedMotion?.65:(1-t)**.4;
  ctx.globalAlpha=opacity;const p=screen(effect.position);
  if(effect.type==='beam'){
   const end=screen(effect.end),beamWidth=effect.radius*2*scale*(.8+.2*(1-t));ctx.lineCap='butt';
   for(const [factor,color] of [[1.7,'#79d2df28'],[1.15,'#62cbe6a0'],[.7,'#a2eef8'],[.3,'#f8ffff']]){ctx.lineWidth=beamWidth*factor;ctx.strokeStyle=color;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(end.x,end.y);ctx.stroke();}
   ctx.save();ctx.translate(p.x,p.y);ctx.rotate(effect.heading);ctx.fillStyle='#e8ffff';ctx.fillRect(-beamWidth*.65,-3,beamWidth*1.3,6);ctx.restore();
  }else if(effect.type==='hit'){
   const count=reducedMotion?5:12;
   for(let i=0;i<count;i++){const angle=i*2.399+effect.heading,distance=6+t*(20+(i%3)*10),size=Math.max(1,4*(1-t));ctx.fillStyle=i%3?'#b3c0c4':'#d9f7f5';ctx.fillRect(Math.round(p.x+Math.cos(angle)*distance),Math.round(p.y+Math.sin(angle)*distance),size,size);}
   ctx.strokeStyle='#b8f4fa';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(p.x-12*(1-t),p.y);ctx.lineTo(p.x+12*(1-t),p.y);ctx.moveTo(p.x,p.y-12*(1-t));ctx.lineTo(p.x,p.y+12*(1-t));ctx.stroke();
  }
 }
 ctx.restore();
}
