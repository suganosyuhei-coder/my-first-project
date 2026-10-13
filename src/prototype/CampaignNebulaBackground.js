import {renderCamera,flightAnchor} from './camera.js';
import {noise} from './nebula.js';
// Small cached pixel sprites anchored in the world, independent of gameplay hazards.
const sprites=new Map();
export function campaignNebulaPlacement(site,index){
 const angle=index*2.399;
 return {x:site.position.x+Math.cos(angle)*300,y:site.position.y+Math.sin(angle)*300,radius:site.kind==='home'?190:140};
}
function sprite(index,fine=false){
 const key=`${index}:${fine}`;
 if(sprites.has(key))return sprites.get(key);
 const canvas=document.createElement('canvas');const size=fine?128:32;canvas.width=size;canvas.height=size;const ctx=canvas.getContext('2d');
 const palette=index%3===0?[[63,25,42],[111,40,64],[167,69,91],[192,128,145]]:index%3===1?[[25,43,68],[38,70,112],[66,113,151],[132,164,180]]:[[66,40,27],[107,68,36],[152,103,53],[181,150,101]];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const nx=(x+.5)/size*64,ny=(y+.5)/size*64,dx=(nx-32)/30,dy=(ny-32)/30,r=Math.hypot(dx,dy),n=noise(nx*.13,ny*.13,index+19),grain=noise(nx*.4,ny*.4,index+53);
  const envelope=Math.max(0,1-r),density=envelope*(.3+n*.9)*grain;if(density<.07)continue;
  const color=palette[Math.min(3,Math.floor(density*9))],alpha=Math.min(.7,density*1.8);
  ctx.fillStyle=`rgba(${color.join(',')},${alpha})`;ctx.fillRect(x,y,1,1);
 }
 sprites.set(key,canvas);return canvas;
}
export function drawCampaignNebula(ctx,width,height,game){
 if(!game?.campaign)return;const scale=game.viewport.scale;
 ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=.7;
 for(const [index,site] of game.campaign.sites.entries()){
  const cloud=campaignNebulaPlacement(site,index),r=cloud.radius*scale,x=width/2+(cloud.x-renderCamera(game).x)*scale,y=height/2+(cloud.y-renderCamera(game).y)*scale;
  if(x+r<0||x-r>width||y+r<0||y-r>height)continue;
  const bounds=[Math.round(x-r),Math.round(y-r),Math.round(r*2),Math.round(r*2)];
  ctx.drawImage(sprite(index),...bounds);
  const observation=game.observation*scale;
  if(observation>0&&Math.hypot(x-flightAnchor(game,width,height).x,y-flightAnchor(game,width,height).y)<observation+r){
   ctx.save();ctx.beginPath();ctx.arc(flightAnchor(game,width,height).x,flightAnchor(game,width,height).y,observation,0,Math.PI*2);ctx.clip();ctx.drawImage(sprite(index,true),...bounds);ctx.restore();
  }
 }
 ctx.restore();
}
