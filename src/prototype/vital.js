import {cancelRailgun} from './railgun.js';
import {cancelBoost} from './boost.js';
export const VITAL_MAX=100;
export const VITAL_INITIAL=80;
export const createVital=()=>({value:VITAL_INITIAL,recoveries:0,fraction:0,lastRecovery:null});
export function recoverVital(game,amount=5){
 if(game.status!=='running')return 0;
 const vital=game.vital??=createVital(),before=vital.value;vital.value=Math.min(VITAL_MAX,before+Math.max(0,amount));
 const recovered=vital.value-before;
 if(recovered>0){vital.recoveries++;vital.lastRecovery={at:game.flight.elapsed,amount:recovered};}
 return recovered;
}
export function stepVital(game,dt){
 if(game.status!=='running'||game.paused)return;
 const vital=game.vital??=createVital();vital.fraction+=Number.isFinite(dt)?Math.max(0,dt):0;
 const seconds=Math.floor(vital.fraction+1e-9);vital.fraction=Math.max(0,vital.fraction-seconds);vital.value=Math.max(0,vital.value-seconds);
 if(vital.value>0)return;
 game.status='ended';if(game.missiles){game.missiles.units=[];game.missiles.effects=[];}game.end={reason:'vital',critical:[],position:{...game.flight.position},maxDistance:game.flight.maxDistance};game.flight.velocity={x:0,y:0};
 game.weapon.autoFire=false;game.weapon.subspaceGrace=0;cancelRailgun(game.weapon);game.weapon.projectiles=[];game.weapon.effects=[];cancelBoost(game.boost,true);game.enemies.shots=[];game.enemies.beams=[];game.commands.length=0;
 for(const job of game.jobs)if(!['complete','cancelled'].includes(job.stage))job.stage='cancelled';
 for(const bit of game.bits){bit.state='disabled';bit.jobId=null;}
 game.notice='パイロットのバイタル低下により航行を終了しました';
}
