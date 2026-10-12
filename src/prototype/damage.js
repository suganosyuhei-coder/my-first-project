import {cancelRailgun} from './railgun.js';
import { cellToWorld, worldToCell, shipCells } from './ship.js';
export function applyContact(game,event) {
 if(game.status!=='running')return;
 const cell=worldToCell(event.position,game.flight),target=shipCells(game.ship).find(c=>c.x===cell.x&&c.y===cell.y);
 if(!target)return;
 const owner=target.part||game.ship.cells.find(c=>c.x===cell.x&&c.y===cell.y);
 const appearance=owner.appearance;
 if(event.type==='dustContact')appearance.dust=Math.min(1,(appearance.dust||0)+.25);
 if(event.type==='impact')appearance.scratch=Math.min(1,(appearance.scratch||0)+.4);
 if(event.type==='heatContact')appearance.burn=Math.min(1,(appearance.burn||0)+.35);
 const damage=Math.max(0,event.damage||0);owner.hp=Math.max(0,owner.hp-damage);
 if(target.role){game.ship.critical[target.role]=Math.max(0,game.ship.critical[target.role]-damage);if(game.ship.critical[target.role]<=0)for(const c of game.ship.cells)if(c.role===target.role)c.hp=0;}
 game.ship.revision++;
 if(game.ship.critical.canopy<=0||game.ship.critical.core<=0){
  game.status='ended';if(game.weapon){cancelRailgun(game.weapon);game.weapon.projectiles=[];game.weapon.effects=[];}game.flight.velocity={x:0,y:0};game.end={reason:event.type,critical:Object.entries(game.ship.critical).filter(([,hp])=>hp<=0).map(([role])=>role),position:{...game.flight.position},maxDistance:game.flight.maxDistance};
  for(const job of game.jobs)if(!['complete','cancelled'].includes(job.stage))job.stage='cancelled';
  for(const bit of game.bits){bit.state='disabled';bit.jobId=null;}
  game.notice='重要部分の破壊により航行を終了しました';
 }
}
export function checkContacts(game) {
 const live=shipCells(game.ship);
 for(const hazard of game.hazards){
  let hit=null;
  for(const cell of live){const point=cellToWorld(cell,game.flight);const distance=Math.hypot(point.x-hazard.position.x,point.y-hazard.position.y);if(distance<=hazard.radius+3&&(!hit||distance<hit.distance))hit={point,distance};}
  if(hit&&!game.contacts.has(hazard.id))applyContact(game,{type:hazard.type,position:hit.point,damage:hazard.type==='impact'?45:hazard.type==='heatContact'?15:0});
  if(hit)game.contacts.add(hazard.id);else game.contacts.delete(hazard.id);
  if(game.status!=='running')break;
 }
}
