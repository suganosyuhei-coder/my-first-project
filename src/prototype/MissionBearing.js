import {clusterObjectives} from './campaign.js';
import {flightAnchor} from './camera.js';
export function missionBearing(game,width,height){
 const objective=clusterObjectives(game.campaign,game.flight.position).filter(e=>e.remaining>0).sort((a,b)=>a.distance-b.distance)[0];const boss=game.campaign?.units.find(e=>e.id==='final-boss');const target=game.campaign?.bossCleared?objective:boss;if(!target||(!game.campaign?.bossCleared&&boss.hp<=0))return null;
 const dx=target.position.x-game.flight.position.x,dy=target.position.y-game.flight.position.y,distance=Math.hypot(dx,dy);if(!distance)return null;
 const anchor=flightAnchor(game,width,height),ux=dx/distance,uy=dy/distance,margin=65;
 const radius=Math.max(0,Math.min(game.observation*game.viewport.scale,Math.max(0,(ux>0?width-anchor.x:anchor.x)-margin)/Math.max(1e-9,Math.abs(ux)),Math.max(0,(uy>0?height-anchor.y:anchor.y)-margin)/Math.max(1e-9,Math.abs(uy))));
 return {x:anchor.x+ux*radius,y:anchor.y+uy*radius,angle:Math.atan2(dy,dx),distance,...(objective?{name:objective.name}:{})};
}
export function drawMissionBearing(ctx,width,height,game){
 const p=missionBearing(game,width,height);if(!p)return;
 ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.fillStyle='#ff6262';ctx.shadowColor='#100000';ctx.shadowBlur=5;ctx.beginPath();ctx.moveTo(11,0);ctx.lineTo(-7,-6);ctx.lineTo(-3,0);ctx.lineTo(-7,6);ctx.closePath();ctx.fill();ctx.rotate(-p.angle);ctx.font='bold 11px Arial';ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText(`${p.name??'本星'} ${Math.round(p.distance)} m`,0,12);ctx.restore();
}
