import {stableIntroduction,stableTrainingObjects,stableVisibleHazards,insideStableSpace} from './stableSpace.js';
// Provisional approach lanes give players time to align a beam before collision.
export const ROCKS={spacing:720,approach:400,laneOffset:18,radius:14};
export const RESOURCE_SPAWN_RATE=.25;
export const LARGE_ICE={spacing:5000,radius:36,vital:8};
export function largeIceInBand(index,seed=7309){return {id:`large-ice-${seed}-${index}`,type:'impact',material:'ice',large:true,position:{x:Math.sin(index*2.67+seed*.023)*160,y:index*LARGE_ICE.spacing+3400+Math.sin(index*1.7+seed*.009)*300},radius:LARGE_ICE.radius};}
export function resourceInSector(col,row){const value=Math.sin(col*127.1+row*311.7+41.3)*43758.5453;return value-Math.floor(value)<RESOURCE_SPAWN_RATE;}
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
  const id=`resource-${col}-${row}`;if(existing.has(id)||game.depleted.has(id)||!resourceInSector(col,row))continue;
  const kinds=['wire','plate','tank','solar','engine','railgun'],index=Math.abs(col*7+row*13)%kinds.length;
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
  {id:`heat-${i}`,type:'heatContact',position:{x:65+Math.cos(i)*15,y:-i*480-320},radius:20});
 const rockSector=Math.floor(-y/ROCKS.spacing);
 for(let i=rockSector-1;i<=rockSector+1;i++)game.hazards.push({id:`rock-${i}`,type:'impact',position:{x:(i%3)*ROCKS.laneOffset,y:-i*ROCKS.spacing-ROCKS.approach},radius:ROCKS.radius});
 // Additional objects are deterministic; revisiting never recreates destroyed loot.
 for(let row=cy-2;row<=cy+2;row++)for(let col=cx-2;col<=cx+2;col++){
  const seed=Math.abs(col*37+row*19),material=spaceObjectMaterial(col,row);if(!material)continue;
  game.hazards.push({id:`space-object-${col}-${row}`,type:'impact',material,rare:material==='container'&&sectorRandom(col,row,97)<.2,position:{x:col*240+130+Math.sin(seed)*65,y:row*240+80+Math.cos(seed)*65},radius:material==='container'?13:10+seed%11});
 }
 const iceBand=Math.floor(y/LARGE_ICE.spacing);
 for(let i=iceBand-1;i<=iceBand+1;i++){const ice=largeIceInBand(i,game.nebula.seed);if(Math.hypot(ice.position.x-x,ice.position.y-y)<game.viewport.height/game.viewport.scale+400)game.hazards.push(ice);}
 if(stableIntroduction(game))game.hazards=stableTrainingObjects(game);
 else if(game.stableSpace)game.hazards.push(...stableTrainingObjects(game));
 game.hazards=stableVisibleHazards(game,game.hazards);
 game.hazards=game.hazards.filter(h=>!game.destroyedRocks?.has(h.id)&&!insideStableSpace(game,h.position,h.radius));
 for(const id of game.spaceObjectDamage?.keys()??[])if(!game.hazards.some(h=>h.id===id))game.spaceObjectDamage.delete(id);
}

export function sectorRandom(col,row,salt=0){const n=Math.sin(col*127.1+row*311.7+salt*71.3+23.7)*43758.5453;return n-Math.floor(n);}
// A straight route reveals about five new sectors per 240m: 0.048% => ~100,000m/container.
export function spaceObjectMaterial(col,row){const chance=sectorRandom(col,row);if(chance<.00048)return 'container';if(chance>.22)return null;return sectorRandom(col,row,11)<.35?'ice':'rock';}
