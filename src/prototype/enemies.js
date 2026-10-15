import {stableIntroduction,insideStableSpace} from './stableSpace.js';
import {TRUE_BOSS_TYPES} from './trueBossGeometry.js';
import {stepAberrant} from './aberrantEnemies.js';
import {enemyBodies,enemySegmentHit} from './enemyBodies.js';
import {SNIPER,launchSniperLaser} from './enemyAnatomy.js';
import {escortContact,hitEscort} from './escortPaw.js';
import {pawMissileDrop} from './spaceLoot.js';
import {markEnemyDetected} from './enemyDetection.js';
import {BOSS_ATTACK,launchBossAttack} from './bossAttacks.js';
import {stepTrailDamage} from './trailCombat.js';
import {finishVictory} from './victory.js';
import {activateCampaign,moveCampaignSquads} from './campaign.js';
import {damageEnemy,enemyWeakpoint} from './enemyCombat.js';
import data from './enemyTypes.json' with {type:'json'};
import {shipCells,cellToWorld} from './ship.js';
import {applyContact} from './damage.js';
import {segmentHit} from './railgun.js';
import {forceBody} from './force.js';
export const ENEMY_TYPES=[...data.types,...TRUE_BOSS_TYPES],ENEMY_CONFIG=data.config,BIT_DEFENSE=data.defense;
export function createEnemies(){return {units:[],spawned:new Map(),shots:[],beams:[],nextShot:1,kills:0,bitCooldown:{},time:0};}
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function spawnEnemies(game){
 const state=game.enemies;
 if(stableIntroduction(game)){state.units=game.stableSpace.enemy?.hp>0?[game.stableSpace.enemy]:[];return;}
 if(game.trueBoss){state.units=state.units.filter(e=>e.trueBossPart);return;}
 for(const region of game.nebula.regions){
  if(region.campaignSite||region.type!=='energetic'||state.spawned.has(region.id)||state.units.filter(e=>!e.campaign).length+ENEMY_CONFIG.perNebula>ENEMY_CONFIG.maxEnemies)continue;
  state.spawned.set(region.id,{...region.position});
  for(let i=0;i<ENEMY_CONFIG.perNebula;i++){const type=ENEMY_TYPES[i%ENEMY_TYPES.length],angle=i*Math.PI*2/ENEMY_CONFIG.perNebula,reach=Math.min(region.extent.x,region.extent.y)*.35;
   state.units.push({id:`${region.id}-${type.id}-${i}`,type:type.id,regionId:region.id,hp:type.hp,position:{x:region.position.x+Math.cos(angle)*reach,y:region.position.y+Math.sin(angle)*reach},heading:0,cooldown:.8+i*.35,ramCooldown:0,supported:false,detected:false});
  }
 }
 // Sparse roaming POW robots share the combat pipeline and persistent kill journal.
 const row=Math.floor(game.flight.position.y/1000);
 for(let i=row-1;i<=row+1;i++){const id=`pow-${i}`,position={x:Math.sin(i*3.7)*230,y:i*1000+500};if(state.spawned.has(id))continue;state.spawned.set(id,position);state.units.push({id,type:'pow',carriesMissile:pawMissileDrop(id,game.nebula.seed),variant:['blue','red','yellow'][Math.abs(i)%3],hp:60,position:{...position},heading:0,cooldown:1,ramCooldown:0,supported:false,detected:false});}
 // Preserve killed-region history nearby, bound the endless-world journal.
 for(const [id,p] of state.spawned)if(distance(p,game.flight.position)>ENEMY_CONFIG.maxRange*2)state.spawned.delete(id);
 state.units=state.units.filter(e=>!e.campaign&&e.hp>0&&distance(e.position,game.flight.position)<=ENEMY_CONFIG.maxRange&&!insideStableSpace(game,e.position,70));
}
export function stepEnemies(game,dt){
 game.enemies.debris=(game.enemies.debris??[]).filter(e=>game.flight.elapsed-e.startedAt<1.1);
 if(game.status!=='running'){game.enemies.shots=[];game.enemies.beams=[];return;}
 const state=game.enemies,config=game.tuning?.enemies,stateTime=game.flight.elapsed;
 const speedScale=config?.speedMultiplier??1,damageScale=config?.damageMultiplier??1;
 spawnEnemies(game);activateCampaign(game);moveCampaignSquads(game,dt);state.time=stateTime;state.beams=state.beams.map(b=>({...b,age:b.age+dt})).filter(b=>b.age<BIT_DEFENSE.beamSeconds);
 const leaders=state.units.filter(e=>e.hp>0&&ENEMY_TYPES.find(t=>t.id===e.type).supportRange);
 for(const enemy of state.units){
  if(enemy.hp<=0||enemy.trueBossPart||enemy.tutorialEnemy&&game.stableSpace?.phase==='shooting')continue;
  const type=ENEMY_TYPES.find(t=>t.id===enemy.type),support=leaders.find(e=>e.id!==enemy.id&&distance(e.position,enemy.position)<=ENEMY_TYPES.find(t=>t.id===e.type).supportRange),boost=support?ENEMY_TYPES.find(t=>t.id===support.type):null;
  enemy.supported=Boolean(support);enemy.ramCooldown=Math.max(0,enemy.ramCooldown-dt);enemy.cooldown=Math.max(0,enemy.cooldown-dt*(boost?.fireRateBoost??1));
  const dx=game.flight.position.x-enemy.position.x,dy=game.flight.position.y-enemy.position.y,d=Math.hypot(dx,dy);enemy.bodyTime=stateTime;markEnemyDetected(enemy,d<=Math.max(game.observation,Math.hypot(game.viewport.width,game.viewport.height)/(2*game.viewport.scale)+120)+type.radius,stateTime);
  if(stepAberrant(game,enemy,type,dt,speedScale,damageScale))continue;
  if((!enemy.campaign||enemy.tutorialEnemy)&&d>0&&d<=ENEMY_CONFIG.chaseRange&&type.speed>0){const move=Math.min(type.speed*speedScale*(boost?.speedBoost??1)*dt,Math.max(0,d-12));enemy.position.x+=dx/d*move;enemy.position.y+=dy/d*move;enemy.heading=Math.atan2(dx,-dy);}
  if(type.sniper){
   if(d<=type.shootRange&&enemy.cooldown<=0&&enemy.warning===undefined){enemy.warning=SNIPER.warning;enemy.attackHeading=Math.atan2(dx,-dy);}
   if(enemy.warning!==undefined){enemy.warning=Math.max(0,enemy.warning-dt);if(enemy.warning===0){launchSniperLaser(state,enemy,type,damageScale);enemy.cooldown=type.cooldown;delete enemy.warning;}}
  }else if(type.weakpoint||enemy.type==='miniboss'){
   if(d<=type.shootRange&&enemy.cooldown<=0&&enemy.warning===undefined){enemy.warning=BOSS_ATTACK.warning;enemy.attackHeading=Math.atan2(dx,-dy);}
   if(enemy.warning!==undefined){enemy.warning=Math.max(0,enemy.warning-dt);if(enemy.warning===0){
    launchBossAttack(state,enemy,type,damageScale);enemy.cooldown=type.cooldown;delete enemy.warning;
   }}
  }else if(type.shootRange>0&&d<=type.shootRange&&enemy.cooldown<=0&&d>0){state.shots.push({id:state.nextShot++,enemyType:enemy.type,position:{...enemy.position},velocity:{x:dx/d*type.shotSpeed,y:dy/d*type.shotSpeed},damage:type.damage*damageScale,remaining:4});enemy.cooldown=type.cooldown;}
 }
 stepTrailDamage(game,dt);
 // Recovery owns bit state. Only idle orbiting bits intercept; no jobs are cancelled.
 for(const bit of game.bits){state.bitCooldown[bit.id]=Math.max(0,(state.bitCooldown[bit.id]||0)-dt);if(bit.state!=='orbiting'||state.bitCooldown[bit.id]>0)continue;
  const target=state.units.filter(e=>e.hp>0&&distance(e.position,bit.position)<=BIT_DEFENSE.range).sort((a,b)=>distance(a.position,bit.position)-distance(b.position,bit.position))[0];if(!target)continue;
  damageEnemy(game,target,BIT_DEFENSE.damage*(config?.bitDamageMultiplier??1),target.position,0,'bit');state.bitCooldown[bit.id]=BIT_DEFENSE.cooldown;state.beams.push({bitId:bit.id,from:{...bit.position},to:{...target.position},age:0});
 }
 if(finishVictory(game))return;
 const cells=shipCells(game.ship).map(c=>cellToWorld(c,game.flight)),shield=forceBody(game);
 state.shots=state.shots.filter(shot=>{
  if(['bossLaser','sniperLaser'].includes(shot.kind)){
   shot.remaining-=dt;shot.hitCooldown=Math.max(0,shot.hitCooldown-dt);
   const end={x:shot.position.x+Math.sin(shot.heading)*shot.length,y:shot.position.y-Math.cos(shot.heading)*shot.length};
   const shieldHit=shield?segmentHit(shot.position,end,shield.position,shield.radius+shot.radius):null;
   shot.visibleEnd=end;shot.shieldPoint=shieldHit===null?null:{x:shot.position.x+(end.x-shot.position.x)*shieldHit,y:shot.position.y+(end.y-shot.position.y)*shieldHit};
   if(shot.hitCooldown===0){const ally=escortContact(game,shot.position,end,shot.radius);if(ally&&(shieldHit===null||ally.t<shieldHit)){hitEscort(game,ally.unit);shot.hitCooldown=BOSS_ATTACK.damageInterval;}let contact=null;for(const position of cells){const t=segmentHit(shot.position,end,position,shot.radius+5);if(t!==null&&(!contact||t<contact.t))contact={position,t};}if(contact){applyContact(game,{type:'enemyAttack',enemyType:shot.enemyType,position:contact.position,damage:shot.damage*(shieldHit!==null&&contact.t>=shieldHit?BOSS_ATTACK.forceLeakMultiplier:1)});shot.hitCooldown=BOSS_ATTACK.damageInterval;}}
   return shot.remaining>0;
  }
  const from={...shot.position},to={x:from.x+shot.velocity.x*dt,y:from.y+shot.velocity.y*dt};shot.remaining-=dt;
  let contact=null;for(const position of cells){const t=segmentHit(from,to,position,5+(shot.radius??0));if(t!==null&&(!contact||t<contact.t))contact={position,t};}
  let enemyContact=null;if(shot.friendlyFire)for(const other of state.units){if(other.hp<=0||other.id===shot.sourceEnemyId)continue;const t=enemySegmentHit(from,to,other,shot.radius??2);if(t!==null&&(!enemyContact||t<enemyContact.t))enemyContact={enemy:other,t};}
  const shieldHit=shield?segmentHit(from,to,shield.position,shield.radius+(shot.radius??0)):null;
  const ally=escortContact(game,from,to,shot.radius??0);
  if(enemyContact&&(!contact||enemyContact.t<contact.t)&&(shieldHit===null||enemyContact.t<shieldHit)&&(!ally||enemyContact.t<ally.t)){damageEnemy(game,enemyContact.enemy,shot.damage,enemyContact.enemy.position,shot.radius??2,'enemy');state.friendlyFireSequence=(state.friendlyFireSequence??0)+1;state.lastFriendlyFire={at:stateTime,sourceId:shot.sourceEnemyId,targetId:enemyContact.enemy.id};return false;}
  if(shieldHit!==null&&(!contact||shieldHit<=contact.t)&&(!ally||shieldHit<=ally.t))return false;
  if(ally&&(!contact||ally.t<=contact.t)){hitEscort(game,ally.unit);return false;}
  shot.previousPosition=from;shot.position=to;if(contact){applyContact(game,{type:'enemyAttack',enemyType:shot.enemyType,position:contact.position,damage:shot.damage,source:'敵弾'});return false;}return shot.remaining>0;
 }).slice(-160);
 for(const enemy of state.units){const type=ENEMY_TYPES.find(t=>t.id===enemy.type);if(enemy.hp<=0||type.ramDamage===0||enemy.ramCooldown>0)continue;const bodies=enemyBodies(enemy),cell=cells.find(p=>bodies.some(body=>distance(p,body.position)<=body.radius+3));if(cell){applyContact(game,{type:'enemyAttack',enemyType:enemy.type,position:cell,damage:type.ramDamage*damageScale,source:'敵機との接触'});enemy.ramCooldown=type.cooldown;}}
 state.units=state.units.filter(e=>!insideStableSpace(game,e.position,70));
 if(game.status!=='running'){state.shots=[];state.beams=[];}
}
export function enemySnapshot(state){return {...state,spawned:undefined,units:state.units.map(e=>({...e,position:{...e.position}})),shots:state.shots.map(s=>({...s,position:{...s.position},velocity:{...s.velocity}})),beams:state.beams.map(b=>({...b,from:{...b.from},to:{...b.to}})),bitCooldown:{...state.bitCooldown}};}
