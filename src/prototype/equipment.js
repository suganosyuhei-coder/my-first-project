// Provisional synergy values; damaged or disconnected devices never grant power bonuses.
export const EQUIPMENT={extraBonus:.05,maxBonus:.2,pipeSaving:.02,maxPipeSaving:.1,solarDefense:.03,maxSolarDefense:.15};
export function partCount(parts,type){return parts.filter(p=>p.type===type&&(p.hp===undefined||p.hp>0)).length;}
export function multipleBonus(count){return Math.min(EQUIPMENT.maxBonus,Math.max(0,count-1)*EQUIPMENT.extraBonus);}
export function pipeEfficiency(parts){return Math.min(EQUIPMENT.maxPipeSaving,Math.max(0,partCount(parts,'pipe')-1)*EQUIPMENT.pipeSaving);}
export function solarDefense(parts){return Math.min(EQUIPMENT.maxSolarDefense,partCount(parts,'solar')*EQUIPMENT.solarDefense);}
export function poweredThrust(ship,energy){const count=ship.parts.filter(p=>p.type==='engine'&&p.hp>0&&energy.active[p.id]).length;return count*12*(1+multipleBonus(count));}

export function solarChargeMultiplier(parts){return partCount(parts,'solar')>0?1.1:1;}
