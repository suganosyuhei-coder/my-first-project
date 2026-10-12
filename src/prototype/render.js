import {drawEnemies} from './EnemyEffects.js';
import {nearbyPlanets,nearbyGalaxies,PLANET_FLOW} from './planetFlow.js';
import {flightScale} from './camera.js';
import {drawRailgun} from './RailEffects.js';
import { RESOURCE_TYPES } from './collection.js';
import { worldToScreen } from './model.js';
const TAU=Math.PI*2;
function drawGas(ctx,image,width,height,state,scale){ctx.save();ctx.imageSmoothingEnabled=false;const camera=image.worldCamera||state.position;ctx.drawImage(image,Math.round((camera.x-state.position.x)*scale),Math.round((camera.y-state.position.y)*scale),width,height);ctx.restore();}
function circle(ctx,x,y,r){ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke();}
export function drawFlight(ctx,width,height,state,{observation,reducedMotion,game,nebulaImage}) {
  const scale=game?.viewport.scale||flightScale(),screen=p=>worldToScreen(p,state.position,width,height,scale);
  ctx.clearRect(0,0,width,height);ctx.fillStyle='#101820';ctx.fillRect(0,0,width,height);
  // Remote spiral galaxies move slowly by parallax, sharing the current's world layout.
  for(const galaxy of nearbyGalaxies(state.position)){const p={x:width/2+(galaxy.position.x-state.position.x)*.14,y:height/2+(galaxy.position.y-state.position.y)*.14},r=galaxy.radius*.65;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-.35);ctx.scale(1,.55);ctx.strokeStyle='#809ab01b';ctx.lineWidth=1;for(let arm=0;arm<3;arm++){ctx.beginPath();for(let n=0;n<80;n++){const a=n*.095+arm*TAU/3,d=r*n/80,x=Math.cos(a)*d,y=Math.sin(a)*d;if(n===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}ctx.fillStyle='#c5d7df66';ctx.fillRect(-2,-2,4,4);ctx.restore();}
  // A deterministic world lattice supplies stars; the camera never changes world data.
  const span=60,startX=Math.floor((state.position.x-width/scale/2)/span)-1,startY=Math.floor((state.position.y-height/scale/2)/span)-1;
  const rows=Math.ceil(height/scale/span)+3,cols=Math.ceil(width/scale/span)+3;
  for(let r=0;r<rows;r++)for(let c=0;c<cols;c++){
    const gx=startX+c,gy=startY+r,hash=Math.abs(Math.sin(gx*127.1+gy*311.7));
    const p=screen({x:(gx+hash*.8)*span,y:(gy+Math.abs(Math.cos(gx*73+gy*57))*.8)*span});
    ctx.fillStyle=hash>.65?'#d0d9dd':'#53636e';ctx.fillRect(p.x,p.y,hash>.85?2:1,hash>.85?2:1);
    if(hash>.8&&!reducedMotion){ctx.strokeStyle='#79d2df22';ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-state.velocity.x*.32,p.y-state.velocity.y*.32);ctx.stroke();}
  }
  if(nebulaImage){ctx.save();ctx.globalAlpha=game?.tuning?.nebula.opacity??1;drawGas(ctx,nebulaImage,width,height,state,scale);ctx.restore();}
  ctx.lineWidth=1;ctx.font='10px ui-monospace, monospace';
  for(const planet of nearbyPlanets(state.position)){
    const i=planet.index,world=planet.position,p=screen(world),radius=planet.radius*scale;
    if(p.x+radius*2<0||p.x-radius*2>width||p.y+radius*2<0||p.y-radius*2>height)continue;
    ctx.strokeStyle='#eeaa7245';ctx.setLineDash([4,7]);circle(ctx,p.x,p.y,(planet.radius+(game?.environment?.hullRadius??50)+6+PLANET_FLOW.reach)*scale);ctx.setLineDash([]);
    for(let a=0;a<6;a++){const angle=a*TAU/6+state.elapsed*.1*planet.direction,r=(planet.radius+(game?.environment?.hullRadius??50)+26)*scale,x=p.x+Math.cos(angle)*r,y=p.y+Math.sin(angle)*r,dx=-Math.sin(angle)*planet.direction,dy=Math.cos(angle)*planet.direction;ctx.strokeStyle='#eeaa7277';ctx.beginPath();ctx.moveTo(x-dx*5,y-dy*5);ctx.lineTo(x+dx*5,y+dy*5);ctx.lineTo(x+dx*2+dy*3,y+dy*2-dx*3);ctx.stroke();}
    ctx.strokeStyle='#eeaa72';circle(ctx,p.x,p.y,radius);
    ctx.strokeStyle='#eeaa7266';
    for(const ratio of [.35,.7]){ctx.beginPath();ctx.ellipse(p.x,p.y,radius*ratio,radius,0,0,TAU);ctx.stroke();}
    for(const offset of [-.45,0,.45]){ctx.beginPath();ctx.ellipse(p.x,p.y+radius*offset,radius*Math.sqrt(1-offset**2),radius*.15,0,0,TAU);ctx.stroke();}
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(-.45);ctx.beginPath();ctx.ellipse(0,0,radius*2.1,radius*.6,0,0,TAU);ctx.stroke();ctx.restore();
    ctx.fillStyle='#eeaa72';ctx.fillText(`P-${String(Math.abs(i)+1).padStart(2,'0')} / GRAVITY FLOW`,p.x-radius,p.y+radius+23);
    ctx.strokeStyle='#eeaa7255';ctx.beginPath();ctx.moveTo(p.x-radius*1.4,p.y);ctx.lineTo(p.x-radius*1.1,p.y);ctx.moveTo(p.x,p.y-radius*1.4);ctx.lineTo(p.x,p.y-radius*1.1);ctx.stroke();
  }
  ctx.strokeStyle='#79d2df';ctx.lineWidth=1;ctx.setLineDash([2,6]);ctx.beginPath();
  state.trail.forEach((point,i)=>{const p=screen(point);if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});
  const center=screen(state.position);ctx.lineTo(center.x,center.y);ctx.stroke();ctx.setLineDash([]);
  if(observation&&game?.observation>0){ctx.save();ctx.strokeStyle=`rgba(121,210,223,${game.tuning?.observation.opacity??68/255})`;ctx.lineWidth=game.tuning?.observation.lineWidth??1;circle(ctx,center.x,center.y,game.observation*scale);ctx.restore();ctx.fillStyle='#79d2df';const labelY=center.y-game.observation*scale-10;if(labelY>86&&labelY<height-50)ctx.fillText(`OBSERVATION / ${game.observation.toFixed(0)} m`,center.x-92,labelY);}
  ctx.strokeStyle='#94a8b12b';ctx.beginPath();ctx.moveTo(center.x-12,center.y);ctx.lineTo(center.x+12,center.y);ctx.moveTo(center.x,center.y-12);ctx.lineTo(center.x,center.y+12);ctx.stroke();
  ctx.save();ctx.translate(center.x,center.y);ctx.rotate(state.heading);ctx.strokeStyle='#79d2df77';ctx.beginPath();ctx.moveTo(0,-105);ctx.lineTo(0,-140);ctx.lineTo(-4,-134);ctx.moveTo(0,-140);ctx.lineTo(4,-134);ctx.stroke();ctx.restore();
  if(game){
    for(const hazard of game.hazards){const p=screen(hazard.position);
      if(['impact','obstacle'].includes(hazard.type)){
        const r=hazard.radius*scale;ctx.fillStyle='#53616a';ctx.strokeStyle='#a8b8bc';ctx.lineWidth=1;ctx.beginPath();
        for(let i=0;i<7;i++){const angle=i*TAU/7,variation=.78+(i%3)*.11,x=p.x+Math.cos(angle)*r*variation,y=p.y+Math.sin(angle)*r*variation;if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.fill();ctx.stroke();
        ctx.strokeStyle='#7e9097';ctx.beginPath();ctx.moveTo(p.x-r*.6,p.y-r*.25);ctx.lineTo(p.x,p.y-r*.6);ctx.lineTo(p.x+r*.35,p.y-r*.1);ctx.stroke();
      }else{ctx.strokeStyle=hazard.type==='dustContact'?'#c5bba255':'#d9575799';ctx.setLineDash(hazard.type==='dustContact'?[1,7]:[]);circle(ctx,p.x,p.y,hazard.radius*scale);ctx.setLineDash([]);ctx.fillStyle=ctx.strokeStyle;ctx.fillText(hazard.type==='dustContact'?'宇宙塵':'熱領域',p.x+12,p.y-12);}
    }
    for(const resource of game.resources){if(!resource.discovered||!['available','reserved'].includes(resource.state))continue;const p=screen(resource.position);ctx.strokeStyle=resource.state==='reserved'?'#eeaa72':'#79d2df';ctx.beginPath();ctx.moveTo(p.x,p.y-8);ctx.lineTo(p.x+8,p.y);ctx.lineTo(p.x,p.y+8);ctx.lineTo(p.x-8,p.y);ctx.closePath();ctx.stroke();ctx.fillStyle=ctx.strokeStyle;ctx.fillText(`${RESOURCE_TYPES[resource.type].name} / ${RESOURCE_TYPES[resource.type].bits}基`,p.x+13,p.y+3);}
    for(const bit of game.bits){ctx.strokeStyle=bit.state==='orbiting'?'#79d2df66':'#79d2df';ctx.beginPath();bit.trail.forEach((point,i)=>{const p=screen(point);if(!i)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);});ctx.stroke();const p=screen(bit.position);ctx.fillStyle='#d1fafb';ctx.beginPath();ctx.arc(p.x,p.y,4,0,TAU);ctx.fill();ctx.strokeStyle='#79d2df66';circle(ctx,p.x,p.y,8);}
  }
  if(game){drawEnemies(ctx,width,height,game);drawRailgun(ctx,width,height,game,reducedMotion);}
  if(nebulaImage){ctx.save();ctx.globalAlpha=.08*(game?.tuning?.nebula.opacity??1);drawGas(ctx,nebulaImage,width,height,state,scale);ctx.restore();}
  // Ruler labels correspond to world position; minor marks are 20m apart.
  ctx.strokeStyle='#9cacb74d';ctx.fillStyle='#9cacb7';ctx.font='9px ui-monospace, monospace';
  const left=Math.floor((state.position.x-width/scale/2)/20)*20;
  for(let x=left;x<state.position.x+width/scale/2;x+=20){const p=screen({x,y:state.position.y});const major=x%100===0;ctx.beginPath();ctx.moveTo(p.x,height-22);ctx.lineTo(p.x,height-(major?36:29));ctx.stroke();if(major)ctx.fillText(`${x} m`,p.x+3,height-9);}
}
