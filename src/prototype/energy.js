import {multipleBonus,pipeEfficiency} from './equipment.js';
import { occupiedCells } from './model.js';
// Adjustable prototype values; E is the one shared energy unit, never a crafting material.
export const ENERGY={nebulaPort:{x:5,y:9},generation:16,capacity:160,tankLinkBonus:.25,observationCost:3,engineCost:8};
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
    // Equipment uses pipes; adjacent tanks are the one explicit manifold exception.
    if(neighbor&&neighbor!==p.id&&(p.type==='pipe'||nodes.get(neighbor).part.type==='pipe'||p.type==='tank'&&nodes.get(neighbor).part.type==='tank'))nodes.get(p.id).edges.push(neighbor);
  }
  const seen=new Set(),components=[];
  for(const [id] of nodes){if(seen.has(id))continue;const queue=[id],component=[];seen.add(id);
    for(let n=0;n<queue.length;n++){const node=nodes.get(queue[n]);component.push(node.part);for(const next of node.edges)if(!seen.has(next)){seen.add(next);queue.push(next);}}
    components.push(component);
  }
  return components;
}
export function connectionPorts(part,parts) {
 const live=parts.filter(p=>p.hp===undefined||p.hp>0);
 return ports(part).filter(port=>live.some(other=>other.id!==part.id&&(part.type==='pipe'||other.type==='pipe'||part.type==='tank'&&other.type==='tank')&&occupiedCells(other).some(c=>c.x===port.x+port.dx&&c.y===port.y+port.dy)));
}
export function tankCapacity(part,parts,config={}) {
 const linked=connectionPorts(part,parts).some(port=>parts.some(p=>p.id!==part.id&&p.type==='tank'&&(p.hp===undefined||p.hp>0)&&occupiedCells(p).some(c=>c.x===port.x+port.dx&&c.y===port.y+port.dy)));
 return {linked,capacity:ENERGY.capacity*(linked?1+(config.tankLinkBonus??ENERGY.tankLinkBonus):1)};
}
export function stepEnergy(ship,dt,config={}) {
  if(ship.graphRevision!==ship.revision){ship.graph=supplyGraph(ship.parts);ship.graphRevision=ship.revision;}
  const state={generation:0,consumption:0,stored:0,capacity:0,active:{},status:{},components:[],connected:{},tanks:{},overflow:0,nebulaGeneration:0};
  const generation=config.generation??ENERGY.generation;
  const harvest=ship.graph.filter(c=>c.some(p=>p.type==='tank')&&c.some(p=>p.type==='pipe'&&occupiedCells(p).some(cell=>Math.abs(cell.x-ENERGY.nebulaPort.x)+Math.abs(cell.y-ENERGY.nebulaPort.y)===1)));
  for(const component of ship.graph){
    const solar=component.filter(p=>p.type==='solar'),tanks=component.filter(p=>p.type==='tank');
    for(const p of component)state.connected[p.id]=component.length>1;
    for(const tank of tanks){const info=tankCapacity(tank,ship.parts,config);state.tanks[tank.id]=info;state.overflow+=Math.max(0,(tank.stored||0)-info.capacity);tank.stored=Math.max(0,Math.min(info.capacity,tank.stored||0));state.capacity+=info.capacity;}
    const nebula=harvest.includes(component)?Math.max(0,config.nebulaRate??0)/harvest.length:0;state.nebulaGeneration+=nebula;
    const solarRate=solar.length*generation*(1+multipleBonus(solar.length)),saving=pipeEfficiency(component);
    let generated=(solarRate+nebula)*dt,available=generated+tanks.reduce((a,p)=>a+p.stored,0),consumed=0;
    const hasSource=solar.length>0||tanks.length>0;
    const consumers=component.filter(p=>p.type==='observer'||p.type==='engine').sort((a,b)=>(a.type==='observer'?0:1)-(b.type==='observer'?0:1)||a.id.localeCompare(b.id));
    for(const p of consumers){const demand=(p.type==='observer'?ENERGY.observationCost:ENERGY.engineCost)*(1-saving)*dt;const active=hasSource&&available+1e-9>=demand;
      state.active[p.id]=active;state.status[p.id]=active?'稼働':hasSource?'供給不足':'未接続';if(active){available-=demand;consumed+=demand;}}
    let deficit=Math.max(0,consumed-generated);
    for(const tank of tanks){const take=Math.min(tank.stored,deficit);tank.stored-=take;deficit-=take;}
    let surplus=Math.max(0,generated-consumed);
    for(const tank of tanks){const charge=Math.min(state.tanks[tank.id].capacity-tank.stored,surplus);tank.stored+=charge;surplus-=charge;state.stored+=tank.stored;state.status[tank.id]=state.tanks[tank.id].linked?'連結・蓄積':'蓄積';}
    const supplied=solar.length>0||nebula>0||tanks.some(t=>t.stored>0);
    for(const p of component){if(p.type==='pipe'){state.active[p.id]=supplied;state.status[p.id]=supplied?'通電':hasSource?'供給不足':'未接続';}if(p.type==='railgun'){state.active[p.id]=supplied;state.status[p.id]=hasSource?'射撃時精算':'未接続';}if(p.type==='solar'){state.active[p.id]=true;state.status[p.id]=component.length>1?'生成':'生成・未接続';}}
    state.generation+=solarRate+nebula;state.consumption+=dt?consumed/dt:0;state.components.push(component.map(p=>p.id));
  }
  return state;
}
