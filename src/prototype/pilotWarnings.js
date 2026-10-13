import {shipDamageStatus} from './shipDamage.js';
export function vitalWarningStage(value){return value<=5?4:value<=8?3:value<=10?2:value<=15?1:0;}
export function pilotWarning(telemetry){
 const structure=telemetry.damageStatus??shipDamageStatus(telemetry.ship),vitalStage=vitalWarningStage(telemetry.vital?.value??100);
 const warnings=[];
 if(structure.stage>0){const level=Math.min(3,structure.stage);warnings.push({id:`warning-structure-${level}`,expression:['worried','panicked','pain'][level-1],scene:level===3?'pain':level===2?'danger':'search',priority:94+level,label:['船体損傷・警戒','船体損傷・危険','船体崩壊寸前'][level-1],type:'structure'});}
 if(vitalStage>0)warnings.push({id:`warning-vital-${vitalStage}`,expression:['worried','panicked','tearful','pain'][vitalStage-1],scene:vitalStage>=3?'pain':vitalStage===2?'danger':'search',priority:94+vitalStage,label:`VITAL ${telemetry.vital.value}%・${['警戒','危険','限界接近','生命維持限界'][vitalStage-1]}`,type:'vital'});
 return warnings.sort((a,b)=>b.priority-a.priority)[0]??null;
}
