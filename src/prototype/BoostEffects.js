import {renderCamera,flightAnchor} from './camera.js';
import {subspaceActive} from './subspace.js';
import {shipCells,CELL_METERS} from './ship.js';
import {worldToScreen} from './model.js';
export function boostChargeGeometry(game){
 const rear=Math.max(0,...shipCells(game.ship).map(c=>(c.y-8)*CELL_METERS+CELL_METERS/2))+10,f=game.flight;
 return {rear,position:{x:f.position.x-Math.sin(f.heading)*rear,y:f.position.y+Math.cos(f.heading)*rear},charge:Math.max(0,game.boost.charge)};
}
export function drawBoostCharge(ctx,width,height,game,reducedMotion){
 drawDiveWake(ctx,width,height,game);
 if(subspaceActive(game))drawHyperspaceDive(ctx,width,height,game,reducedMotion);
 if(!game.boost.holding||game.status!=='running')return;
 const g=boostChargeGeometry(game),scale=game.viewport.scale,p=worldToScreen(g.position,renderCamera(game),width,height,scale),radius=(4+Math.sqrt(Math.min(4,g.charge))*12)*scale;
 ctx.save();ctx.translate(p.x,p.y);ctx.rotate(game.flight.heading);ctx.globalCompositeOperation='lighter';
 const glow=ctx.createRadialGradient(0,0,0,0,0,radius*2);glow.addColorStop(0,'#e8ffff');glow.addColorStop(.25,'#7cdfffaa');glow.addColorStop(1,'#77aaff00');ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,radius*2,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#99e5ff';ctx.lineWidth=scale;ctx.beginPath();ctx.ellipse(0,0,radius,radius*.55,0,0,Math.PI*2);ctx.stroke();
 for(let i=0;i<12;i++){const phase=(game.flight.elapsed*(reducedMotion?.3:1)*1.8+i/12)%1,distance=(1-phase)*48*scale,angle=Math.PI*.1+i/11*Math.PI*.8,x=Math.cos(angle)*distance,y=Math.sin(angle)*distance;ctx.globalAlpha=(.25+Math.min(1,g.charge)*.65)*phase;ctx.strokeStyle=i%2?'#b5eaff':'#a8baff';ctx.beginPath();ctx.moveTo(x*1.2,y*1.2);ctx.lineTo(x,y);ctx.stroke();ctx.fillStyle='#efffff';ctx.fillRect(x-scale,y-scale,2*scale,2*scale);}
 ctx.restore();
}

// Smooth translucent membranes and displaced background bands suggest a liquid space.
const diveBuffers=new WeakMap();
export function drawHyperspaceDive(ctx,width,height,game,reducedMotion){
 const scale=game.viewport.scale,time=game.flight.elapsed*(reducedMotion?.25:1),fade=game.flight.planetDive?1:Math.min(1,game.boost.remaining/.2),rx=24*scale,ry=43*scale;
 let buffer=diveBuffers.get(ctx);if(!buffer){buffer=ctx.canvas.ownerDocument.createElement('canvas');diveBuffers.set(ctx,buffer);}if(buffer.width!==width||buffer.height!==height){buffer.width=width;buffer.height=height;}
 const copy=buffer.getContext('2d');copy.clearRect(0,0,width,height);copy.drawImage(ctx.canvas,0,0);
 ctx.save();ctx.globalAlpha=fade;ctx.translate(flightAnchor(game,width,height).x,flightAnchor(game,width,height).y);ctx.rotate(game.flight.heading);
 ctx.save();ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.clip();ctx.rotate(-game.flight.heading);ctx.translate(-flightAnchor(game,width,height).x,-flightAnchor(game,width,height).y);
 const band=12;for(let y=Math.max(0,Math.floor(flightAnchor(game,width,height).y-ry-rx));y<Math.min(height,flightAnchor(game,width,height).y+ry+rx);y+=band){const shift=Math.sin(y*.045-time*3)*2*scale;ctx.drawImage(buffer,0,y,width,Math.min(band,height-y),shift,y,width,Math.min(band,height-y));}ctx.restore();
 const film=ctx.createRadialGradient(-rx*.25,-ry*.3,4,0,0,ry*1.2);film.addColorStop(0,'rgba(195,227,220,.03)');film.addColorStop(.55,'rgba(75,127,145,.05)');film.addColorStop(.8,'rgba(129,181,183,.17)');film.addColorStop(1,'rgba(80,122,150,0)');ctx.fillStyle=film;ctx.beginPath();ctx.ellipse(0,0,rx*1.05,ry*1.05,0,0,Math.PI*2);ctx.fill();
 // A shallow bow wave meets the nose; three short ripples slide down the hull.
 for(let layer=0;layer<3;layer++){
  const phase=(time*.7+layer/3)%1,y=-ry*.8+phase*ry*1.55,r=rx*(.65+phase*.35);
  ctx.beginPath();ctx.ellipse(0,y,r,5*scale,0,Math.PI*.95,Math.PI*2.05);
  ctx.strokeStyle=`rgba(195,231,232,${Math.sin(phase*Math.PI)*.32})`;ctx.lineWidth=.9*scale;ctx.stroke();
 }
 for(const side of [-1,1]){
  const wobble=Math.sin(time*2+side)*1.5*scale;
  ctx.beginPath();ctx.moveTo(side*rx*.25,-ry*.98);ctx.bezierCurveTo(side*rx*.95,-ry*.65,side*(rx+wobble),ry*.15,side*rx*.55,ry*.9);
  ctx.strokeStyle='rgba(185,224,225,.24)';ctx.lineWidth=1.1*scale;ctx.stroke();
  ctx.beginPath();ctx.moveTo(side*rx*.75,ry*.15);ctx.bezierCurveTo(side*rx*.8,ry*.45,side*rx*.6,ry*.8,side*rx*.35,ry*1.18);
  ctx.strokeStyle='rgba(142,198,211,.13)';ctx.lineWidth=.7*scale;ctx.stroke();
 }
 ctx.restore();
}

// Keep the wake in world coordinates so it stays behind when the craft moves or turns.
const diveWakes=new WeakMap();
function drawDiveWake(ctx,width,height,game){
 if(game.status!=='running'){diveWakes.delete(game);return;}
 const now=game.flight.elapsed,active=subspaceActive(game)||game.boost.remaining>0;
 let points=diveWakes.get(game);if(!points){points=[];diveWakes.set(game,points);}
 while(points.length&&now-points[0].time>1.1)points.shift();
 if(active){const rear=boostChargeGeometry(game).position,position={x:rear.x+Math.sin(game.flight.heading)*14,y:rear.y-Math.cos(game.flight.heading)*14},last=points.at(-1);if(!last||Math.hypot(position.x-last.x,position.y-last.y)>1.5)points.push({...position,time:now});}
 if(points.length<2)return;
 const scale=game.viewport.scale;ctx.save();ctx.lineJoin='round';
 for(let i=1;i<points.length;i++){
  const a=worldToScreen(points[i-1],renderCamera(game),width,height,scale),b=worldToScreen(points[i],renderCamera(game),width,height,scale),dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);if(length<.01)continue;
  const life=Math.max(0,1-(now-points[i].time)/1.1),tail=Math.min(1,i/6),half=(4+8*life)*scale*tail,nx=-dy/length*half,ny=dx/length*half;
  ctx.fillStyle=`rgba(108,187,210,${.18*life*tail})`;ctx.beginPath();ctx.moveTo(a.x+nx,a.y+ny);ctx.lineTo(b.x+nx,b.y+ny);ctx.lineTo(b.x-nx,b.y-ny);ctx.lineTo(a.x-nx,a.y-ny);ctx.closePath();ctx.fill();
  ctx.strokeStyle=`rgba(195,234,235,${.3*life*tail})`;ctx.lineWidth=.8*scale;
  for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(a.x+nx*side,a.y+ny*side);ctx.lineTo(b.x+nx*side,b.y+ny*side);ctx.stroke();}
 }
 ctx.restore();
}
