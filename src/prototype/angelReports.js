import dialogue from './angelReportDialogue.json' with {type:'json'};
export const ANGEL_REPORT_DIALOGUE=dialogue;
const tier=(rows,value)=>Number.isFinite(value)?rows.filter(row=>value>=row.threshold).at(-1):undefined;
export function contactReportCause(event){
 if(event.type==='enemyAttack'){
  if(event.enemyType==='finalBoss')return 'finalBossAttack';
  if(event.enemyType==='miniboss')return 'minibossAttack';
  if(event.enemyType==='pow'&&event.source==='敵機との接触')return 'pawContact';
  return 'enemyAttack';
 }
 if(['heatContact','nebulaContact'].includes(event.type))return 'heat';
 if(event.type==='impact')return 'naturalContact';
 return null;
}
export function angelReports(telemetry,records){
 if(telemetry.status!=='ended')return [];
 const result=[],cause=telemetry.end?.reason==='vital'?'vital':telemetry.end?.reportCause??({impact:'naturalContact',enemyAttack:'enemyAttack',heatContact:'heat',nebulaContact:'heat'}[telemetry.end?.reason]);
 const reason=dialogue.causes.find(row=>row.flag===cause&&row.implemented);
 if(reason)result.push({id:`cause-${reason.flag}`,label:reason.label,line:reason.line});
 for(const [kind,label,rows,value,unit] of [['score','得点',dialogue.scores,telemetry.score??0,'点'],['time','累計プレイ時間',dialogue.hours,(records?.totalSeconds??0)/3600,'時間'],['retry','再プレイ回数',dialogue.retries,records?.replayCount??0,'回']]){
  const row=tier(rows,value);if(row)result.push({id:`${kind}-${row.threshold}`,label:`${label} · ${row.threshold.toLocaleString()}${unit}以上`,line:row.line});
 }
 return result;
}
