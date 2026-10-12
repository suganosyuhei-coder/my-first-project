// Provisional approach lanes give players time to align a beam before collision.
export const ROCKS={spacing:480,approach:400,laneOffset:18,radius:14};
export function initialResources() {
 return [
  {id:'resource-wire',type:'wire',position:{x:10,y:-85}},
  {id:'resource-plate',type:'plate',position:{x:85,y:-20}},
  {id:'resource-tank',type:'tank',position:{x:-100,y:-90}},
 ].map(r=>({...r,state:'available',discovered:false}));
}
export function updateWorld(game) {
 const {x,y}=game.flight.position,cx=Math.floor(x/240),cy=Math.floor(y/240);
 const existing=new Set(game.resources.map(r=>r.id));
 for(let row=cy-1;row<=cy+1;row++)for(let col=cx-1;col<=cx+1;col++){
  const id=`resource-${col}-${row}`;if(existing.has(id)||game.depleted.has(id))continue;
  const kinds=['wire','plate','tank','solar'],index=Math.abs(col*7+row*13)%4;
  game.resources.push({id,type:kinds[index],position:{x:col*240+80+Math.sin(row*9+col)*45,y:row*240+100+Math.cos(col*7+row)*40},state:'available',discovered:game.discovered.has(id)});
 }
 game.resources=game.resources.filter(r=>{
  if(['collected','vanished'].includes(r.state)){game.depleted.add(r.id);return false;}
  return r.state!=='available'||Math.hypot(r.position.x-x,r.position.y-y)<650;
 });
 const hy=Math.floor(-y/480);
 game.hazards=[];
 for(let i=hy-1;i<=hy+1;i++)game.hazards.push(
  {id:`dust-${i}`,type:'dustContact',position:{x:-12+Math.sin(i)*60,y:-i*480-260},radius:22},
  {id:`heat-${i}`,type:'heatContact',position:{x:65+Math.cos(i)*15,y:-i*480-320},radius:20},
  {id:`rock-${i}`,type:'impact',position:{x:(i%3)*ROCKS.laneOffset,y:-i*ROCKS.spacing-ROCKS.approach},radius:ROCKS.radius});
 game.hazards=game.hazards.filter(h=>!game.destroyedRocks?.has(h.id));
}
