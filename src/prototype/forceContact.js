import {enemyBodies} from './enemyBodies.js';
import {repairFromPickup} from './repair.js';
import {damageSpaceObject} from './spaceLoot.js';
import {forceBody} from './force.js';
import {enemyType,damageEnemy} from './enemyCombat.js';
import {installRecoveredPart} from './autoInstall.js';
import {RESOURCE_TYPES} from './collection.js';
export const FORCE_CONTACT={damage:20,interval:.35,rockHp:40};
export function stepForceContact(game){
 const body=forceBody(game);if(!body||game.status!=='running')return;
 const now=game.flight.elapsed,cooldowns=game.force.contactCooldown??=new Map();
 for(const [id,until] of cooldowns)if(until<=now)cooldowns.delete(id);
 const overlaps=(p,r)=>Math.hypot(p.x-body.position.x,p.y-body.position.y)<=body.radius+r;
 for(const enemy of game.enemies.units){const key='enemy:'+enemy.id;if(enemy.hp<=0||cooldowns.has(key)||!enemyBodies(enemy).some(shape=>overlaps(shape.position,shape.radius)))continue;damageEnemy(game,enemy,FORCE_CONTACT.damage,body.position,body.radius,'force');cooldowns.set(key,now+FORCE_CONTACT.interval);}
 for(const rock of game.hazards){const key='rock:'+rock.id;if(!['impact','obstacle'].includes(rock.type)||game.destroyedRocks.has(rock.id)||cooldowns.has(key)||!overlaps(rock.position,rock.radius))continue;
  damageSpaceObject(game,rock,FORCE_CONTACT.damage);cooldowns.set(key,now+FORCE_CONTACT.interval);
 }

 game.hazards=game.hazards.filter(h=>!game.destroyedRocks.has(h.id));
 for(const resource of game.resources){if(resource.type==='pipe'||resource.state!=='available'||!RESOURCE_TYPES[resource.type]||!overlaps(resource.position,8))continue;
  resource.state='collected';resource.discovered=true;game.depleted.add(resource.id);game.inventory[resource.type]=(game.inventory[resource.type]??0)+1;game.recoveredCount++;
  const installed=installRecoveredPart(game,resource.type);if(installed)game.inventory[resource.type]--;
  const repaired=repairFromPickup(game,resource.type);
  game.notice=installed?`フォースで${RESOURCE_TYPES[resource.type].name}を取得し、自動設置しました`:`フォースで${RESOURCE_TYPES[resource.type].name}を取得しました`;if(repaired.length)game.notice+=' / 船体を修復しました';
 }
}
