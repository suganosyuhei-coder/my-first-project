import {occupiedCells} from './model.js';
export const EQUIPMENT={extraBonus:.05,adjacentBonus:.005,pipeSaving:.02,maxPipeSaving:.1,solarDefense:.03,solarAdjacent:.003};
const live=(parts,type)=>parts.filter(p=>p.type===type&&(p.hp===undefined||p.hp>0));
export function partCount(parts,type){return live(parts,type).length;}
// Count each touching pair once, regardless of the length of their shared edge.
export function adjacentPairs(parts,type){
 const devices=live(parts,type),cells=devices.map(occupiedCells);let count=0;
 for(let i=0;i<devices.length;i++)for(let j=i+1;j<devices.length;j++)if(cells[i].some(a=>cells[j].some(b=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y)===1)))count++;
 return count;
}
export function equipmentBonus(parts,type){const solar=type==='solar';return partCount(parts,type)*(solar?EQUIPMENT.solarDefense:EQUIPMENT.extraBonus)+adjacentPairs(parts,type)*(solar?EQUIPMENT.solarAdjacent:EQUIPMENT.adjacentBonus);}
export function multipleBonus(count){return Math.max(0,count-1)*EQUIPMENT.extraBonus;}
export function pipeEfficiency(parts){return Math.min(EQUIPMENT.maxPipeSaving,Math.max(0,partCount(parts,'pipe')-1)*EQUIPMENT.pipeSaving);}
export function solarDefense(parts){return equipmentBonus(parts,'solar');}
// Equipment bonuses are independent of the hidden energy network.
export function poweredThrust(ship){return partCount(ship.parts,'engine')?12*(1+equipmentBonus(ship.parts,'engine')):0;}
export function solarChargeMultiplier(parts){return 1+equipmentBonus(parts,'solar');}
export function tankBoostMultiplier(parts){return 1+equipmentBonus(parts,'tank');}
export function weaponDamageMultiplier(parts){return 1+equipmentBonus(parts,'railgun');}
