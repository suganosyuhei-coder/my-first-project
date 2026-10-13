import {LARGE_ICE} from './world.js';
import {recoverVital} from './vital.js';
import {repairShip,repairFromPickup} from './repair.js';
import {PARTS} from './model.js';
import {installRecoveredPart} from './autoInstall.js';
import {destructionEffect} from './destruction.js';
export const ENEMY_SCORE={berserk:50,centipede:1800,scorpion:200,sniper:800,moss:1500,mossSnake:33,mossCrab:1200,commander:1500,miniboss:4000,finalBoss:10000,pow:250};
export const CLUSTER_SCORE={moss:12000,snake:400,crab:18000};
export const OBJECT_LOOT_CHANCE=.12;
// Normal PAWs: 1/km; green supply PAWs: 1/5 km; missile carriers: about 1/10 km.
export const PAW_MISSILE_CHANCE=.1;
export const LOOT_PARTS=['tank','engine','railgun','solar'];
export function grantPart(game,type){
 if(type==='pipe')return null;
 repairFromPickup(game,type);
 const part=installRecoveredPart(game,type);if(!part)game.inventory[type]=(game.inventory[type]??0)+1;
 game.recoveredCount=(game.recoveredCount??0)+1;return part;
}
export function grantRareParts(game){for(const type of LOOT_PARTS)grantPart(game,type);game.observationBonus=(game.observationBonus??0)+20;game.observation=(game.tuning?.observation.radius??140)+game.observationBonus;game.notice='レアアイテム：装備各＋1・観測半径＋20m（空きがない装備は保管）';}
export function enemyReward(game,enemy,source='normal'){
 game.lastEnemyDefeat={id:enemy.id,type:enemy.type,source,at:game.flight.elapsed,sequence:(game.lastEnemyDefeat?.sequence??0)+1};
 const group=enemy.clusterId?game.campaign?.mossGroups?.find(g=>g.id===enemy.clusterId):null,total=group?CLUSTER_SCORE[group.kind??'moss']:undefined;
 const points=total!==undefined?Math.floor(total/group.count):(ENEMY_SCORE[enemy.type]??500);game.score=(game.score??0)+points;
 if(group&&total!==undefined){group.scoreAwarded=(group.scoreAwarded??0)+points;const members=game.campaign.units.filter(e=>e.clusterId===group.id);if(!group.rewardGranted&&members.length===group.count&&members.every(e=>e.hp<=0)){game.score+=Math.max(0,total-group.scoreAwarded);group.scoreAwarded=total;group.rewardGranted=true;}}

 if(enemy.type==='pow'){const previousEffects=game.repairEffects;const index=Array.from(enemy.id).reduce((n,c)=>n+c.charCodeAt(0),0)%LOOT_PARTS.length;const type=(enemy.carriesMissile??pawMissileDrop(enemy.id,game.nebula.seed))?'missile':LOOT_PARTS[index],part=grantPart(game,type),count=game.ship.parts.filter(p=>p.type===type&&p.hp>0).length;game.equipmentPickup={sequence:(game.equipmentPickup?.sequence??0)+1,type,partId:part?.id??null,x:part?.x,y:part?.y,count,installed:!!part,at:game.flight.elapsed};game.notice=`PAWアーマー：${PARTS[type].name}＋1 / ${part?'自動装着完了（装備 '+count+'個）':'空きなし・所持品へ保管'}`;if(game.repairEffects!==previousEffects)game.notice+=' / 船体を修復しました';}
}
export function destroySpaceObject(game,object){
 if(game.destroyedRocks.has(object.id))return false;
 game.destroyedRocks.add(object.id);game.spaceObjectDamage?.delete(object.id);game.contacts.delete(object.id);game.rockAlerts.delete(object.id);
 game.score=(game.score??0)+(object.material==='container'?1000:100);destructionEffect(game,object,'rock');
 if(object.material==='container'){if(object.rare)grantRareParts(game);}else{const drop=spaceObjectDrop(object.id,game.nebula.seed);if(drop){grantPart(game,drop);game.notice='岩・氷から強化パーツを発見し、自動追加しました';}}
 if(object.material!=='container'&&object.material!=='ice'&&rockMetalDrop(object.id,game.nebula.seed)){game.inventory.plate=(game.inventory.plate??0)+1;game.recoveredCount=(game.recoveredCount??0)+1;const repaired=repairShip(game,4,2.5);game.notice='岩から金属板＋1を自動取得'+(repaired.length?' / 船体を修復しました':'')+(spaceObjectDrop(object.id,game.nebula.seed)?' / 強化パーツも取得':'');}
 if(object.material==='ice'){game.inventory.water=(game.inventory.water??0)+1;game.recoveredCount=(game.recoveredCount??0)+1;const recovered=recoverVital(game,object.large?LARGE_ICE.vital:5);game.notice=(object.large?'大きな氷塊':'氷')+'から水＋1を取得'+(recovered>0?` / バイタル＋${recovered}`:'')+(spaceObjectDrop(object.id,game.nebula.seed)?' / 強化パーツも取得':'');}
 return true;
}

function objectHash(id,seed=0){let hash=(2166136261^seed)>>>0;for(const c of id)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;hash^=hash>>>16;hash=Math.imul(hash,0x7feb352d);hash^=hash>>>15;hash=Math.imul(hash,0x846ca68b);hash=(hash^(hash>>>16))>>>0;return hash;}
export function spaceObjectDrop(id,seed=0){const hash=objectHash(id,seed);return hash/4294967296<OBJECT_LOOT_CHANCE?LOOT_PARTS[(hash>>>8)%LOOT_PARTS.length]:null;}
export function pawMissileDrop(id,seed=0){return objectHash('paw-missile:'+id,seed)/4294967296<PAW_MISSILE_CHANCE;}
export function rockMetalDrop(id,seed=0){return objectHash('metal:'+id,seed)/4294967296<.8;}
export function damageSpaceObject(game,object,damage){
 if(game.destroyedRocks.has(object.id))return false;
 const hits=game.spaceObjectDamage??=new Map(),total=(hits.get(object.id)??0)+Math.max(0,damage);hits.set(object.id,total);
 return total>=40?destroySpaceObject(game,object):false;
}
