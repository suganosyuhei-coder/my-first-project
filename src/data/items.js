import { MATERIALS } from './materials.js';
const box = (size, position = [0,0,0], extra = {}) => ({ kind:'box', size, position, ...extra });
const cylinder = (radius,height,position = [0,0,0],extra={}) => ({kind:'cylinder',radius,height,position,...extra});
const torus = (radius,tube,position=[0,0,0],extra={}) => ({kind:'torus',radius,tube,position,...extra});
const pipe = (radius,innerRadius,height,position=[0,0,0],extra={}) => ({kind:'pipe',radius,innerRadius,height,position,...extra});
const legs = (height, spread) => [-1,1].flatMap(x => [-1,1].map(z => box([.12,height,.12],[x*spread,height/2,z*spread])));
export const ITEMS = {
  wire: {name:'ワイヤー',icon:'〰',material:'iron',initial:5,size:[.7,.7,.18],tier:'near',parts:[torus(.28,.018,[0,.35,0]),torus(.25,.018,[0,.35,.045]),torus(.22,.018,[0,.35,.09])]},
  block: {name:'コンクリートブロック',icon:'▦',material:'concrete',initial:4,size:[.8,.4,.4],tier:'near',parts:[box([.8,.4,.09],[0,.2,-.155]),box([.8,.4,.09],[0,.2,.155]),...[-.34,0,.34].map(x=>box([.12,.4,.22],[x,.2,0]))]},
  pipe: {name:'金属パイプ',icon:'⊙',material:'iron',initial:4,size:[.22,1.5,.22],tier:'near',parts:[pipe(.11,.085,1.5,[0,.75,0])]},
  beam: {name:'鉄骨',icon:'Ⅰ',material:'iron',initial:3,size:[.4,2,.3],tier:'near',parts:[box([.4,2,.05],[0,1,-.125]),box([.4,2,.05],[0,1,.125]),box([.06,2,.2],[0,1,0])]},
  plate: {name:'金属板',icon:'▱',material:'aluminum',initial:3,size:[1.5,.025,1],tier:'near',parts:[box([1.5,.025,1],[0,.0125,0])]},
  ac: {name:'室外機',icon:'▣',material:'aluminum',initial:1,size:[1,.8,.45],tier:'mid',parts:[box([1,.7,.4],[0,.43,0]),...[-.35,.35].map(x=>box([.12,.08,.45],[x,.04,0],{material:'iron'})),cylinder(.24,.035,[-.18,.43,.22],{rotation:[Math.PI/2,0,0],material:'iron'}),...[-.2,0,.2].map(y=>box([.28,.025,.025],[.32,.43+y,.22],{material:'iron'}))]},
  tank: {name:'タンク',icon:'◉',material:'iron',initial:1,size:[1.2,1.8,1.2],tier:'mid',parts:[cylinder(.6,1.5,[0,.85,0]),cylinder(.15,.18,[0,1.69,0]),...legs(.15,.38)]},
  solar: {name:'太陽光パネル',icon:'▤',material:'aluminum',initial:0,size:[2,1,1.3],tier:'mid',parts:[box([2,.08,1.3],[0,.8,0],{rotation:[.25,0,0]}),...[-.6,0,.6].map(x=>box([.52,.025,1.15],[x,.84,0],{rotation:[.25,0,0],material:'resin',color:'#29477b'})),...legs(.65,.45)]},
  plumbing: {name:'配管設備',icon:'╬',material:'iron',initial:0,size:[1.6,1.8,.6],tier:'mid',parts:[pipe(.1,.075,1.5,[-.6,.75,0]),pipe(.1,.075,1.5,[.6,.75,0]),pipe(.1,.075,1.2,[0,1.4,0],{rotation:[0,0,Math.PI/2]}),torus(.18,.025,[0,1.4,.2],{material:'resin',color:'#ba665f'})]},
  vent: {name:'換気設備',icon:'≋',material:'aluminum',initial:0,size:[1.2,1.4,1],tier:'mid',parts:[box([1.2,.15,1],[0,.075,0]),box([.7,1,.7],[0,.65,0]),...Array.from({length:5},(_,i)=>box([1,.05,.85],[0,1.12+i*.07,0]))]},
  sorin: {name:'相輪',icon:'♜',material:'gold',initial:0,size:[1.1,4,1.1],tier:'far',parts:[cylinder(.06,4,[0,2,0]),...Array.from({length:7},(_,i)=>torus(.5-i*.035,.04,[0,.5+i*.42,0],{rotation:[Math.PI/2,0,0]})),cylinder(.18,.2,[0,3.8,0])]},
  elevated: {name:'高架水槽',icon:'♧',material:'iron',initial:0,size:[2.4,5,2.4],tier:'far',parts:[...legs(3,.85),cylinder(1.2,1.8,[0,3.9,0]),pipe(.09,.065,4.5,[.9,2.25,0]),box([2.2,.1,2.2],[0,2.8,0])]},
  rooftop: {name:'高置水槽',icon:'▧',material:'resin',initial:0,size:[2.2,2.3,2.2],tier:'far',parts:[box([2.2,1.8,2.2],[0,1.25,0]),...legs(.35,.8),...[-.65,0,.65].flatMap(x=>[box([.04,1.8,2.25],[x,1.25,0],{material:'aluminum'}),box([2.25,1.8,.04],[0,1.25,x],{material:'aluminum'})])]},
  reservoir: {name:'大型貯水タンク',icon:'◍',material:'iron',initial:0,size:[5,4.2,5],tier:'far',parts:[cylinder(2.5,3.8,[0,2,0]),torus(2.48,.055,[0,.2,0],{rotation:[Math.PI/2,0,0]}),torus(2.48,.055,[0,3.8,0],{rotation:[Math.PI/2,0,0]}),cylinder(.4,.2,[0,4,0])]},
  special: {name:'特殊建築設備',icon:'⌘',material:'aluminum',initial:0,size:[3,3,2],tier:'far',parts:[box([3,.25,2],[0,.125,0]),...[-1,0,1].map(x=>cylinder(.35,2.2,[x,1.35,0])),pipe(.09,.06,2.5,[0,2.7,0],{rotation:[0,0,Math.PI/2]}),box([.6,.5,.2],[0,1.5,1],{material:'resin'})]},
};
export function componentVolume(p) {
  if (p.kind === 'box') return p.size.reduce((a,b)=>a*b,1);
  if (p.kind === 'torus') return 2 * Math.PI ** 2 * p.radius * p.tube ** 2;
  if (p.kind === 'pipe') return Math.PI * (p.radius ** 2 - p.innerRadius ** 2) * p.height;
  return Math.PI * p.radius ** 2 * p.height;
}
export const itemMass = id => ITEMS[id].parts.reduce((mass,p)=>mass+componentVolume(p)*MATERIALS[p.material || ITEMS[id].material].density,0);
export const createInventory = () => Object.fromEntries(Object.entries(ITEMS).map(([id,item])=>[id,item.initial]));
// Smooth weights, not discrete area boundaries; edit these parameters to tune rarity.
export const LOOT_SETTINGS = {nearScale:35,midCenter:60,midWidth:32,farCenter:90,farSlope:18};
export function lootWeights(distance) {
  const d=Math.max(0,distance),c=LOOT_SETTINGS;
  return {near:1/(1+(d/c.nearScale)**3),mid:Math.exp(-.5*((d-c.midCenter)/c.midWidth)**2),far:1/(1+Math.exp(-(d-c.farCenter)/c.farSlope))};
}
export function chooseLoot(distance, random = Math.random) {
  const weights=lootWeights(distance);
  const ids=Object.keys(ITEMS);
  const counts=ids.reduce((o,id)=>(o[ITEMS[id].tier]=(o[ITEMS[id].tier]||0)+1,o),{});
  const sum=Object.values(weights).reduce((a,b)=>a+b,0);
  let roll=random()*sum;
  return ids.find(id=>(roll-=weights[ITEMS[id].tier]/counts[ITEMS[id].tier])<0) || ids.at(-1);
}
export function createCollectionPoints(random = Math.random) {
  const distances=[2,8,16,26,38,52,68,85,105,125];
  return [0,Math.PI/2,Math.PI,Math.PI*1.5].flatMap((angle,route)=>distances.map((d,i)=>({id:`star-${route}-${i}`,position:[Math.sin(angle)*d,1.1,-Math.cos(angle)*d],itemId:route===0&&i===0?'wire':chooseLoot(d,random),count:1})));
}
export function placeInventoryItem(inventory, placed, itemId, position, id) {
  if (!ITEMS[itemId] || !(inventory[itemId]>0)) return {inventory,placed};
  return {inventory:{...inventory,[itemId]:inventory[itemId]-1},placed:[...placed,{id,itemId,position}]};
}
export function recoverInventoryItem(inventory, placed, id) {
  const item=placed.find(p=>p.id===id);
  if (!item) return {inventory,placed};
  return {inventory:{...inventory,[item.itemId]:inventory[item.itemId]+1},placed:placed.filter(p=>p.id!==id)};
}
