import { RESOURCE_TYPES } from './collection.js';
import { worldToScreen } from './model.js';
const TAU=Math.PI*2;
function circle(ctx,x,y,r){ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke();}
export function drawFlight(ctx,width,height,state,{observation,reducedMotion,game}) {
  const scale=1.55,screen=p=>worldToScreen(p,state.position,width,height,scale);
  ctx.clearRect(0,0,width,height);ctx.fillStyle='#101820';ctx.fillRect(0,0,width,height);
  // A deterministic world lattice supplies stars; the camera never changes world data.
  const span=60,startX=Math.floor((state.position.x-width/scale/2)/span)-1,startY=Math.floor((state.position.y-height/scale/2)/span)-1;
  const rows=Math.ceil(height/scale/span)+3,cols=Math.ceil(width/scale/span)+3;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const gx=startX+c,gy=startY+r,hash=Math.abs(Math.sin(gx*127.1+gy*311.7));
    const p=screen({x:(gx+hash*.8)*span,y:(gy+Math.abs(Math.cos(gx*73+gy*57))*.8)*span});
    ctx.fillStyle=hash>.65?'#d0d9dd':'#53636e';ctx.fillRect(p.x,p.y,hash>.85?2:1,hash>.85?2:1);
    if(hash>.8&&!reducedMotion){ctx.strokeStyle='#79d2df22';ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-state.velocity.x*.32,p.y-state.velocity.y*.32);ctx.stroke();}
  }
  ctx.lineWidth=1;ctx.font='10px ui-monospace, monospace';
  const sector=Math.floor(-state.position.y/420);
  for(let i=sector-2;i<=sector+2;i++){
    const world={x:i%2===0?135:-135,y:-i*420-115},p=screen(world),radius=(38+Math.abs(i%3)*10)*scale;
    if(p.x+radius*2<0||p.x-radius*2>width||p.y+radius*2<0||p.y-radius*2>height)continue;
    ctx.strokeStyle='#eeaa7245';ctx.setLineDash([4,7]);circle(ctx,p.x,p.y,radius*1.7);ctx.setLineDash([]);
    ctx.strokeStyle='#eeaa72';circle(ctx,p.x,p.y,radius);
    ctx.strokeStyle='#eeaa7266';
    for(const ratio of [.35,.7]){ctx.beginPath();ctx.ellipse(p.x,p.y,radius*ratio,radius,0,0,TAU);ctx.stroke();}
    for(const offset of [-.45,0,.45]){ctx.beginPath();ctx.ellipse(p.x,p.y+radius*offset,radius*Math.sqrt(1-offset**2),radius*.15,0,0,TAU);ctx.stroke();}
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-.45);ctx.beginPath();ctx.ellipse(0,0,radius*2.1,radius*.6,0,0,TAU);ctx.stroke();ctx.restore();
    ctx.fillStyle='#eeaa72';ctx.fillText(`P-${String(Math.abs(i)+1).padStart(2,'0')} / FIELD DEMO`,p.x-radius,p.y+radius+23);
    ctx.strokeStyle='#eeaa7255';ctx.beginPath();ctx.moveTo(p.x-radius*1.4,p.y);ctx.lineTo(p.x-radius*1.1,p.y);ctx.moveTo(p.x,p.y-radius*1.4);ctx.lineTo(p.x,p.y-radius*1.1);ctx.stroke();
  }
  ctx.strokeStyle='#79d2df';ctx.lineWidth=1;ctx.setLineDash([2,6]);ctx.beginPath();
  state.trail.forEach((point,i)=>{const p=screen(point);if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});
  const center=screen(state.position);ctx.lineTo(center.x,center.y);ctx.stroke();ctx.setLineDash([]);
  if(observation&&game?.observation>0){ctx.strokeStyle='#79d2df44';circle(ctx,center.x,center.y,game.observation*scale);ctx.fillStyle='#79d2df';ctx.fillText(`OBSERVATION / ${game.observation} m`,center.x-92,center.y-game.observation*scale-10);}
  ctx.strokeStyle='#94a8b12b';ctx.beginPath();ctx.moveTo(center.x-12,center.y);ctx.lineTo(center.x+12,center.y);ctx.moveTo(center.x,center.y-12);ctx.lineTo(center.x,center.y+12);ctx.stroke();
  ctx.save();ctx.translate(center.x,center.y);ctx.rotate(state.heading);ctx.strokeStyle='#79d2df77';ctx.beginPath();ctx.moveTo(0,-105);ctx.lineTo(0,-140);ctx.lineTo(-4,-134);ctx.moveTo(0,-140);ctx.lineTo(4,-134);ctx.stroke();ctx.restore();
  if(game){
    for(const hazard of game.hazards){const p=screen(hazard.position);ctx.strokeStyle=hazard.type==='dustContact'?'#c5bba255':hazard.type==='heatContact'?'#d9575799':'#aab4ba';ctx.setLineDash(hazard.type==='dustContact'?[1,7]:[]);circle(ctx,p.x,p.y,hazard.radius*scale);ctx.setLineDash([]);ctx.fillStyle=ctx.strokeStyle;ctx.fillText(hazard.type==='dustContact'?'宇宙塵':hazard.type==='heatContact'?'熱領域':'岩',p.x+12,p.y-12);}
    for(const resource of game.resources){if(!resource.discovered||!['available','reserved'].includes(resource.state))continue;const p=screen(resource.position);ctx.strokeStyle=resource.state==='reserved'?'#eeaa72':'#79d2df';ctx.beginPath();ctx.moveTo(p.x,p.y-8);ctx.lineTo(p.x+8,p.y);ctx.lineTo(p.x,p.y+8);ctx.lineTo(p.x-8,p.y);ctx.closePath();ctx.stroke();ctx.fillStyle=ctx.strokeStyle;ctx.fillText(`${RESOURCE_TYPES[resource.type].name} / ${RESOURCE_TYPES[resource.type].bits}基`,p.x+13,p.y+3);}
    for(const bit of game.bits){ctx.strokeStyle=bit.state==='orbiting'?'#79d2df66':'#79d2df';ctx.beginPath();bit.trail.forEach((point,i)=>{const p=screen(point);if(!i)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});ctx.stroke();const p=screen(bit.position);ctx.fillStyle='#d1fafb';ctx.beginPath();ctx.arc(p.x,p.y,4,0,TAU);ctx.fill();ctx.strokeStyle='#79d2df66';circle(ctx,p.x,p.y,8);}
  }
  // Ruler labels correspond to world position; minor marks are 20m apart.
  ctx.strokeStyle='#9cacb74d';ctx.fillStyle='#9cacb7';ctx.font='9px ui-monospace, monospace';
  const left=Math.floor((state.position.x-width/scale/2)/20)*20;
  for(let x=left;x<state.position.x+width/scale/2;x+=20){const p=screen({x,y:state.position.y});const major=x%100===0;ctx.beginPath();ctx.moveTo(p.x,height-22);ctx.lineTo(p.x,height-(major?36:29));ctx.stroke();if(major)ctx.fillText(`${x} m`,p.x+3,height-9);}
}
