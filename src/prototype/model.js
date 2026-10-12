// Prototype tuning only: these values do not fix the final game's balance.
export const GRID = { columns: 11, rows: 17 };
export const DEMO = { canopy: 100, core: 100, observation: 140, hullMass: 420, speed: 24, steeringRate: .32 };
export const PARTS = {
  pipe: { name: '配管', label: 'PIPE', width: 1, height: 1, mass: 8, thrust: 0 },
  tank: { name: 'タンク', label: 'TANK', width: 2, height: 2, mass: 60, thrust: 0 },
  engine: { name: 'エンジン', label: 'ENGINE', width: 1, height: 2, mass: 35, thrust: 12 },
  railgun: { name: '射撃強化装置', label: 'RAIL', width: 1, height: 1, mass: 24, thrust: 0 },
  observer: { name: '観測装置', label: 'SENSOR', width: 1, height: 1, mass: 12, thrust: 0 },
  solar: { name: 'ソーラーパネル', label: 'SOLAR', width: 2, height: 3, mass: 18, thrust: 0 },
};
export const cellKey = (x,y) => `${x},${y}`;
export function isHull(x,y) {
  const widths = [1,3,5,5,7,7,7,7,7,5,5,3,1];
  return y >= 2 && y <= 14 && Math.abs(x-5) <= (widths[y-2]-1)/2;
}
export function criticalAt(x,y) {
  if (x === 5 && y >= 3 && y <= 7) return 'canopy';
  return x === 5 && y === 9 ? 'core' : null;
}
export function occupiedCells(part) {
  const kind = PARTS[part.type];
  return Array.from({length:kind.width*kind.height},(_,i)=>({x:part.x+i%kind.width,y:part.y+Math.floor(i/kind.width)}));
}
export function partAt(parts,x,y) {
  return parts.find(p=>occupiedCells(p).some(c=>c.x===x && c.y===y));
}
export function validatePlacement(parts,type,x,y) {
  if (!PARTS[type] || !Number.isInteger(x) || !Number.isInteger(y)) return {valid:false,reason:'セルを選択してください'};
  const cells=occupiedCells({type,x,y});
  if(cells.some(c=>c.x<0||c.y<0||c.x>=GRID.columns||c.y>=GRID.rows))return {valid:false,reason:'グリッドの外には配置できません'};
  if(cells.some(c=>criticalAt(c.x,c.y)))return {valid:false,reason:'キャノピー・中核部には配置できません'};
  if(cells.some(c=>partAt(parts,c.x,c.y)))return {valid:false,reason:'他のパーツと重なっています'};
  const connected=cells.some(c=>isHull(c.x,c.y)||[[0,-1],[1,0],[0,1],[-1,0]].some(([dx,dy])=>isHull(c.x+dx,c.y+dy)||partAt(parts,c.x+dx,c.y+dy)));
  return {valid:connected,reason:connected?'配置可能':'船体かパーツに隣接させてください'};
}
export function pipeMask(parts,x,y) {
  return [[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]].reduce((mask,[dx,dy,bit])=>partAt(parts,x+dx,y+dy)?.type==='pipe'?mask|bit:mask,0);
}
export function initialParts() {
  return [{id:'tank-0',type:'tank',x:3,y:8},{id:'engine-0',type:'engine',x:5,y:12},{id:'solar-0',type:'solar',x:1,y:5},
    {id:'pipe-0',type:'pipe',x:6,y:8},{id:'pipe-1',type:'pipe',x:6,y:9},{id:'pipe-2',type:'pipe',x:7,y:9}];
}
export function shipStats(parts) {
  let mass=DEMO.hullMass,thrust=0,mx=0,my=0;
  for(const p of parts){const d=PARTS[p.type];mass+=d.mass;thrust+=d.thrust;mx+=d.mass*(p.x+(d.width-1)/2-5);my+=d.mass*(p.y+(d.height-1)/2-8);}
  return {mass,thrust,center:{x:mx/mass,y:my/mass}};
}
export function createFlight() {
  return {position:{x:0,y:0},start:{x:0,y:0},velocity:{x:0,y:-DEMO.speed},heading:0,angularVelocity:0,elapsed:0,maxDistance:0,trail:[{x:0,y:0}]};
}
export function stepFlight(state,steering,dt,speed=DEMO.speed,environment=null,impulse=null) {
  const target=Math.max(-1,Math.min(1,steering))*DEMO.steeringRate;
  state.angularVelocity+=(target-state.angularVelocity)*(1-Math.exp(-5*dt));
  state.heading+=(state.angularVelocity+(environment?.turn||0))*dt;
  if(environment)speed=Math.max(environment.minimumSpeed,speed-environment.drag);
  state.velocity={x:Math.sin(state.heading)*speed,y:-Math.cos(state.heading)*speed};
  if(environment){state.velocity.x+=Math.cos(state.heading)*environment.lateral;state.velocity.y+=Math.sin(state.heading)*environment.lateral;}
  if(impulse){state.velocity.x+=impulse.x;state.velocity.y+=impulse.y;
    const forward=state.velocity.x*Math.sin(state.heading)-state.velocity.y*Math.cos(state.heading),minimum=environment?.minimumSpeed||0;
    if(forward<minimum){state.velocity.x+=Math.sin(state.heading)*(minimum-forward);state.velocity.y-=Math.cos(state.heading)*(minimum-forward);}
  }
  state.position.x+=state.velocity.x*dt;state.position.y+=state.velocity.y*dt;
  state.elapsed+=dt;
  state.maxDistance=Math.max(state.maxDistance,Math.hypot(state.position.x-state.start.x,state.position.y-state.start.y));
  const last=state.trail.at(-1);
  if(Math.hypot(state.position.x-last.x,state.position.y-last.y)>3){state.trail.push({...state.position});if(state.trail.length>500)state.trail.shift();}
  return state;
}
export function worldToScreen(point,camera,width,height,scale) {
  return {x:width/2+(point.x-camera.x)*scale,y:height/2+(point.y-camera.y)*scale};
}
export function screenToWorld(point,camera,width,height,scale) {
  return {x:camera.x+(point.x-width/2)/scale,y:camera.y+(point.y-height/2)/scale};
}
