import {enemySegmentHit} from './enemyBodies.js';
import {advanceMissile} from './missileFlight.js';
import {enemyType,damageEnemy} from './enemyCombat.js';
import {segmentHit} from './railgun.js';
export const ESCORT_PAW={spacing:5000,radius:14,joinRange:180,duration:30,range:320,bulletDamage:10,bulletSpeed:360,cooldown:.8,missileDamage:10,missileSpeed:180,missileLife:8};
export const createEscortPaws=()=>({units:[],joined:new Set(),shots:[],effects:[],nextShot:1,attackSequence:0,lastKill:null});
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
export function escortPawHome(index,seed=7309){return {x:Math.sin(index*2.13+seed*.031)*160,y:index*ESCORT_PAW.spacing+1600+Math.sin(index*1.9+seed*.007)*300};}
export function escortContact(game,from,to,radius=0){
 let nearest=null;
 for(const unit of game.escortPaws?.units??[]){if(unit.hits>=3||unit.departed)continue;const t=segmentHit(from,to,unit.position,ESCORT_PAW.radius+radius);if(t!==null&&(!nearest||t<nearest.t))nearest={unit,t};}
 return nearest;
}
export function hitEscort(game,unit){
 if(game.status!=='running'||game.paused||unit.hits>=3||unit.departed)return false;
 unit.hits++;unit.hitAt=game.flight.elapsed;
 if(unit.hits===3){game.escortPaws.joined.add(unit.id);game.escortPaws.effects.push({position:{...unit.position},at:game.flight.elapsed,kind:'destroyed'});game.notice='白PAW：敵弾を3回受けて撃破されました';}
 return true;
}
export function stepEscortPaws(game,dt){
 const state=game.escortPaws??=createEscortPaws();
 if(game.status!=='running'){state.units=[];state.shots=[];state.effects=[];return;}
 if(game.paused)return;
 const now=game.flight.elapsed,band=Math.floor(game.flight.position.y/ESCORT_PAW.spacing);
 state.effects=state.effects.filter(e=>now-e.at<1);
 state.units=state.units.filter(u=>u.hits<3&&!u.departed&&(u.joinedAt!==null||distance(u.position,game.flight.position)<2000));
 for(let index=band-1;index<=band+1;index++){
  const id=`escort-paw-${game.nebula.seed}-${index}`;if(state.joined.has(id)||state.units.some(u=>u.id===id))continue;
  const position=escortPawHome(index,game.nebula.seed);if(distance(position,game.flight.position)>game.viewport.height/game.viewport.scale+400)continue;
  state.units.push({id,index,position,joinedAt:null,hits:0,cooldown:0,missileUsed:false,heading:0});
 }
 let escorting=state.units.some(u=>u.joinedAt!==null);
 for(const unit of state.units){
  if(unit.joinedAt===null&&!escorting&&distance(unit.position,game.flight.position)<=ESCORT_PAW.joinRange){unit.joinedAt=now;state.joined.add(unit.id);escorting=true;game.notice='白PAW：30秒間、戦闘を援護します';}
  if(unit.joinedAt===null)continue;
  if(now-unit.joinedAt>=ESCORT_PAW.duration){unit.departed=true;state.effects.push({position:{...unit.position},at:now,kind:'departed'});continue;}
  const heading=game.flight.heading,targetPosition={x:game.flight.position.x+Math.sin(heading)*80+Math.cos(heading)*45,y:game.flight.position.y-Math.cos(heading)*80+Math.sin(heading)*45};
  const follow=1-Math.exp(-6*dt);unit.position.x+=(targetPosition.x-unit.position.x)*follow;unit.position.y+=(targetPosition.y-unit.position.y)*follow;unit.heading=heading;
  unit.cooldown=Math.max(0,unit.cooldown-dt);
  const target=game.enemies.units.filter(e=>e.hp>0&&e.detected&&distance(e.position,unit.position)<=ESCORT_PAW.range).sort((a,b)=>distance(a.position,unit.position)-distance(b.position,unit.position))[0];
  if(!target)continue;
  const angle=Math.atan2(target.position.x-unit.position.x,-(target.position.y-unit.position.y));
  if(unit.cooldown===0){for(const offset of [-.3,-.15,0,.15,.3])state.shots.push({id:state.nextShot++,kind:'bullet',position:{...unit.position},heading:angle+offset,age:0});unit.cooldown=ESCORT_PAW.cooldown;state.attackSequence++;}
  if(!unit.missileUsed){state.shots.push({id:state.nextShot++,kind:'missile',position:{...unit.position},heading:angle,targetId:target.id,age:0,phase:'drop',releaseVelocity:{...game.flight.velocity},lostSeconds:0,trail:[]});unit.missileUsed=true;}
 }
 state.units=state.units.filter(u=>!u.departed&&u.hits<3);
 state.shots=state.shots.filter(shot=>{
  shot.age+=dt;const missile=shot.kind==='missile';
  const target=missile?game.enemies.units.find(e=>e.id===shot.targetId&&e.hp>0):null;
  if(missile){if(!target)shot.lostSeconds+=dt;if(shot.age>=ESCORT_PAW.missileLife||shot.lostSeconds>=1.2){state.effects.push({position:{...shot.position},at:now,kind:'explosion'});return false;}}
  else if(shot.age>=1.2)return false;
  const speed=ESCORT_PAW.bulletSpeed,motion=missile?advanceMissile(shot,dt,target,ESCORT_PAW.missileSpeed):{from:{...shot.position},to:{x:shot.position.x+Math.sin(shot.heading)*speed*dt,y:shot.position.y-Math.cos(shot.heading)*speed*dt},armed:true};
  const {from,to,armed}=motion;let first=null;
  if(armed)for(const enemy of game.enemies.units){if(enemy.hp<=0)continue;const t=enemySegmentHit(from,to,enemy,missile?3:2);if(t!==null&&(!first||t<first.t))first={enemy,t};}
  // Rocks block allied fire too. It does not silently travel through cover.
  if(armed)for(const rock of game.hazards.filter(h=>['impact','obstacle'].includes(h.type)&&!game.destroyedRocks.has(h.id))){const t=segmentHit(from,to,rock.position,rock.radius+(missile?3:2));if(t!==null&&(!first||t<first.t))first={rock,t};}
  shot.position=to;if(missile){shot.trail.push({...to});if(shot.trail.length>32)shot.trail.shift();}
  if(first){const point={x:from.x+(to.x-from.x)*first.t,y:from.y+(to.y-from.y)*first.t};if(first.enemy){const result=damageEnemy(game,first.enemy,missile?ESCORT_PAW.missileDamage:ESCORT_PAW.bulletDamage,point,missile?3:2,'ally');if(result.destroyed)state.lastKill={enemyId:first.enemy.id,at:now,sequence:(state.lastKill?.sequence??0)+1};}state.effects.push({position:point,at:now,kind:missile?'explosion':'hit'});return false;}
  return true;
 }).slice(-80);
}
export function escortPawSnapshot(state){return {attackSequence:state.attackSequence,lastKill:state.lastKill?{...state.lastKill}:null,units:state.units.map(u=>({...u,position:{...u.position}})),shots:state.shots.map(s=>({...s,position:{...s.position},releaseVelocity:s.releaseVelocity?{...s.releaseVelocity}:undefined,trail:s.trail?.map(p=>({...p}))})),effects:state.effects.map(e=>({...e,position:{...e.position}}))};}
