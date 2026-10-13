import {contactReportCause} from './angelReports.js';
import {subspaceActive} from './subspace.js';
import {solarDefense} from './equipment.js';
import {checkShipFailure} from './shipDamage.js';
import { cellToWorld, worldToCell, shipCells } from './ship.js';
export const PLAYER_DAMAGE_MULTIPLIER=.8;
export function applyContact(game,event) {
 if(game.status!=='running'||subspaceActive(game))return;
 const cell=worldToCell(event.position,game.flight),target=shipCells(game.ship).find(c=>c.x===cell.x&&c.y===cell.y);
 if(!target)return;
 const owner=target.part||game.ship.cells.find(c=>c.x===cell.x&&c.y===cell.y);
 const appearance=owner.appearance;
 if(event.type==='dustContact')appearance.dust=Math.min(1,(appearance.dust||0)+.25);
 if(event.type==='impact')appearance.scratch=Math.min(1,(appearance.scratch||0)+.4);
 if(event.type==='heatContact')appearance.burn=Math.min(1,(appearance.burn||0)+.35);
 for(const [channel,amount] of Object.entries(event.appearance||{}))if(['dust','scratch','burn'].includes(channel))appearance[channel]=Math.min(1,(appearance[channel]||0)+Math.max(0,amount));
 const damage=Math.max(0,event.damage||0)*PLAYER_DAMAGE_MULTIPLIER*(1-solarDefense(game.ship.parts));owner.hp=Math.max(0,owner.hp-damage);if(damage>0)owner.lastDamageCell={x:cell.x,y:cell.y};
 if(target.role){game.ship.critical[target.role]=Math.max(0,game.ship.critical[target.role]-damage);if(game.ship.critical[target.role]<=0)for(const c of game.ship.cells)if(c.role===target.role)c.hp=0;}
 if(damage>0)game.lastContact={at:game.flight.elapsed,position:{...event.position},damage,source:event.source??({impact:'岩との衝突',nebulaContact:'熱領域',heatContact:'熱領域',enemyAttack:'敵の攻撃'}[event.type]??'接触')};
 game.ship.revision++;
 if(checkShipFailure(game,event.type)&&damage>0)game.end.reportCause=contactReportCause(event);
}
export function checkContacts(game) {
 const live=shipCells(game.ship);
 for(const hazard of game.hazards){
  let hit=null;
  for(const cell of live){const point=cellToWorld(cell,game.flight);const distance=Math.hypot(point.x-hazard.position.x,point.y-hazard.position.y);if(distance<=hazard.radius+3&&(!hit||distance<hit.distance))hit={point,distance};}
  if(hit&&!game.contacts.has(hazard.id))applyContact(game,{type:hazard.type,position:hit.point,damage:hazard.type==='impact'?45:hazard.type==='heatContact'?1.5:0});
  if(hit)game.contacts.add(hazard.id);else game.contacts.delete(hazard.id);
  if(game.status!=='running')break;
 }
}
