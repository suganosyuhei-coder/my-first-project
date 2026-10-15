import {stableBoundaryPoints,insideStableSpace} from './stableSpace.js';
import {worldToScreen} from './model.js';
import {renderCamera} from './camera.js';
const boundary=stableBoundaryPoints();
export function trueBossTouchesStable(game,point,radius){
 if(!game.stableSpace)return false;
 if(insideStableSpace(game,point))return true;
 return boundary.some((a,i)=>{const b=boundary[(i+1)%boundary.length],dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(point.x-a.x-t*dx,point.y-a.y-t*dy)<=radius;});
}
export function outsideStableBossPosition(game,point,radius){
 if(!trueBossTouchesStable(game,point,radius))return {...point};
 const angle=Math.atan2(point.y,point.x),direction={x:Math.cos(angle),y:Math.sin(angle)};let reach=Math.hypot(point.x,point.y);
 while(trueBossTouchesStable(game,{x:direction.x*reach,y:direction.y*reach},radius))reach+=2;
 return {x:direction.x*reach,y:direction.y*reach};
}
export function constrainTrueBossMove(game,from,to,radius){
 if(!game.stableSpace)return {position:to,blocked:false};
 const start=outsideStableBossPosition(game,from,radius),distance=Math.hypot(to.x-start.x,to.y-start.y),steps=Math.max(1,Math.ceil(distance/20));let last=start;
 // Sweep the path, so a long frame cannot jump across the safe region.
 for(let i=1;i<=steps;i++){
  const point={x:start.x+(to.x-start.x)*i/steps,y:start.y+(to.y-start.y)*i/steps};
  if(trueBossTouchesStable(game,point,radius)){
   let low=last,high=point;for(let n=0;n<18;n++){const mid={x:(low.x+high.x)/2,y:(low.y+high.y)/2};if(trueBossTouchesStable(game,mid,radius))high=mid;else low=mid;}
   return {position:low,blocked:true};
  }
  last=point;
 }
 return {position:to,blocked:false};
}
export function trueBossBlockedVisible(game){
 const state=game.trueBoss;if(!state?.stableBlocked||game.status!=='running')return false;
 const p=worldToScreen(state.position,renderCamera(game),game.viewport.width,game.viewport.height,game.viewport.scale),r=60*game.viewport.scale;
 return p.x+r>=0&&p.y+r>=0&&p.x-r<=game.viewport.width&&p.y-r<=game.viewport.height;
}
