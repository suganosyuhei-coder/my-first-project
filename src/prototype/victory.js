import {cancelRailgun} from './railgun.js';
import {recoverVital} from './vital.js';
import {cancelBoost} from './boost.js';
export const TIME_BONUS={maximum:20000,pointsPerSecond:20};
export function timeBonus(seconds){return Math.max(0,Math.floor(TIME_BONUS.maximum-Math.max(0,seconds)*TIME_BONUS.pointsPerSecond));}
export function finishVictory(game){
 if(game.status!=='running'||!game.campaign||game.campaign.bossCleared||(game.campaign.units.find(e=>e.id==='final-boss')?.hp??1)>0)return false;
 const clearSeconds=game.flight.elapsed,bonus=timeBonus(clearSeconds),baseScore=game.score??0;game.score=baseScore+bonus;
 game.campaign.bossCleared=true;const resumeVelocity={...game.flight.velocity};game.status='cleared';if(game.missiles){game.missiles.units=[];game.missiles.effects=[];}game.flight.velocity={x:0,y:0};
 game.end={reason:'finalBoss',continuable:true,resumeVelocity,clearSeconds,timeBonus:bonus,baseScore,critical:[],position:{...game.flight.position},maxDistance:game.flight.maxDistance};
 game.weapon.autoFire=false;cancelRailgun(game.weapon);game.weapon.projectiles=[];game.weapon.effects=[];cancelBoost(game.boost,true);
 game.enemies.shots=[];game.enemies.beams=[];game.commands.length=0;
 game.notice='敵本星の中枢を撃破。さらなる敵の反応を確認しました。';return true;
}

export function continueVoyage(game){
 if(game.status!=='cleared'||!game.end?.continuable)return false;
 const velocity=game.end.resumeVelocity;game.status='running';game.paused=false;game.end=null;game.commands.length=0;
 if(velocity)game.flight.velocity={...velocity};
 recoverVital(game,15);game.notice='航行再開。VITAL ＋15。未確認反応 ?????? を次の目的地に設定しました。';return true;
}
