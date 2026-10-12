import { occupiedCells } from './model.js';
// Adjustable prototype values; E is the one shared energy unit, never a crafting material.
export const ENERGY={generation:12,capacity:160,observationCost:3,engineCost:8};
const directions=[[0,-1],[1,0],[0,1],[-1,0]];
function ports(part) {
  const cells=occupiedCells(part),own=new Set(cells.map(c=>`${c.x},${c.y}`));
  return cells.flatMap(c=>directions.filter(([x,y])=>!own.has(`${c.x+x},${c.y+y}`)).map(([x,y])=>({x:c.x,y:c.y,dx:x,dy:y})));
}
export function supplyGraph(parts) {
  const live=parts.filter(p=>p.hp===undefined||p.hp>0),nodes=new Map(live.map(p=>[p.id,{part:p,edges:[]}])) ,index=new Map();
  for(const p of live)for(const port of ports(p))index.set(`${port.x},${port.y},${port.dx},${port.dy}`,p.id);
  for(const p of live)for(const port of ports(p)){
    const neighbor=index.get(`${port.x+port.dx},${port.y+port.dy},${-port.dx},${-port.dy}`);
    // Equipment connects through pipes; incidental hull adjacency never supplies energy.
    if(neighbor&&neighbor!==p.id&&(p.type==='pipe'||nodes.get(neighbor).part.type==='pipe'))nodes.get(p.id).edges.push(neighbor);
  }
  const seen=new Set(),components=[];
  for(const [id] of nodes){if(seen.has(id))continue;const queue=[id],component=[];seen.add(id);
    for(let n=0;n<queue.length;n++){const node=nodes.get(queue[n]);component.push(node.part);for(const next of node.edges)if(!seen.has(next)){seen.add(next);queue.push(next);}}
    components.push(component);
  }
  return components;
}
export function stepEnergy(ship,dt) {
  if(ship.graphRevision!==ship.revision){ship.graph=supplyGraph(ship.parts);ship.graphRevision=ship.revision;}
  const state={generation:0,consumption:0,stored:0,capacity:0,active:{},status:{},components:[]};
  for(const component of ship.graph){
    const solar=component.filter(p=>p.type==='solar'),tanks=component.filter(p=>p.type==='tank');
    for(const tank of tanks){tank.stored=Math.max(0,Math.min(ENERGY.capacity,tank.stored||0));state.capacity+=ENERGY.capacity;}
    let generated=solar.length*ENERGY.generation*dt,available=generated+tanks.reduce((a,p)=>a+p.stored,0),consumed=0;
    const hasSource=solar.length>0||tanks.length>0;
    const consumers=component.filter(p=>p.type==='observer'||p.type==='engine').sort((a,b)=>(a.type==='observer'?0:1)-(b.type==='observer'?0:1)||a.id.localeCompare(b.id));
    for(const p of consumers){const demand=(p.type==='observer'?ENERGY.observationCost:ENERGY.engineCost)*dt;const active=available+1e-9>=demand;
      state.active[p.id]=active;state.status[p.id]=active?'稼働':hasSource?'供給不足':'未接続';if(active){available-=demand;consumed+=demand;}}
    let deficit=Math.max(0,consumed-generated);
    for(const tank of tanks){const take=Math.min(tank.stored,deficit);tank.stored-=take;deficit-=take;}
    let surplus=Math.max(0,generated-consumed);
    for(const tank of tanks){const charge=Math.min(ENERGY.capacity-tank.stored,surplus);tank.stored+=charge;surplus-=charge;state.stored+=tank.stored;state.status[tank.id]='蓄積';}
    const supplied=solar.length>0||tanks.some(t=>t.stored>0);
    for(const p of component){if(p.type==='pipe'){state.active[p.id]=supplied;state.status[p.id]=supplied?'通電':hasSource?'供給不足':'未接続';}if(p.type==='solar'){state.active[p.id]=true;state.status[p.id]='生成';}}
    state.generation+=solar.length*ENERGY.generation;state.consumption+=dt?consumed/dt:0;state.components.push(component.map(p=>p.id));
  }
  return state;
}
