export const OVERLOAD_RATIO=.65;
import {occupiedCells,cellKey} from './model.js';
import {cancelRailgun} from './railgun.js';
import {cancelBoost} from './boost.js';
export function shipDamageCells(ship){
 const cells=new Map(ship.cells.map(c=>[cellKey(c.x,c.y),{x:c.x,y:c.y,hp:c.hp}]));
 for(const alive of [false,true])for(const part of ship.parts.filter(p=>(p.hp>0)===alive))for(const cell of occupiedCells(part))cells.set(cellKey(cell.x,cell.y),{...cell,hp:part.hp});
 return [...cells.values()];
}
export function shipDamageStatus(ship){
 const cells=shipDamageCells(ship),total=cells.length,destroyed=cells.filter(c=>c.hp<=0).length,damaged=cells.filter(c=>c.hp<100).length,ratio=total?damaged/total:0;
 return {total,destroyed,damaged,ratio,stage:ratio>=OVERLOAD_RATIO?4:ratio>.5?3:ratio>.4?2:ratio>.3?1:0};
}
export function checkShipFailure(game,reason='structural'){
 if(game.status!=='running')return false;
 const critical=Object.entries(game.ship.critical).filter(([,hp])=>hp<=0).map(([role])=>role),overload=shipDamageStatus(game.ship).stage===4;
 if(!critical.length&&!overload)return false;
 game.status='ended';if(game.missiles){game.missiles.units=[];game.missiles.effects=[];}game.end={reason:critical.length?reason:'overload',critical,position:{...game.flight.position},maxDistance:game.flight.maxDistance};game.flight.velocity={x:0,y:0};
 game.weapon.autoFire=false;game.weapon.subspaceGrace=0;cancelRailgun(game.weapon);game.weapon.projectiles=[];game.weapon.effects=[];cancelBoost(game.boost,true);game.enemies.shots=[];game.enemies.beams=[];game.commands.length=0;
 for(const job of game.jobs)if(!['complete','cancelled'].includes(job.stage))job.stage='cancelled';
 for(const bit of game.bits){bit.state='disabled';bit.jobId=null;}
 game.notice=critical.length?'重要部分の破壊により航行を終了しました':'船体損傷セル率65％以上：オーバーロードにより自爆しました';
 return true;
}
