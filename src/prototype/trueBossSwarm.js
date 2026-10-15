import {RAILGUN} from './railgun.js';
export const TRUE_SWARM={count:40,portals:8,radius:380,portalSeconds:1.8};
export function spawnTrueBossSwarm(game,{refill=false,newWave=false}={}){
 const state=game.trueBoss;
 if(!state||state.phase!=='pursuit'||game.status!=='running'||game.paused||state.swarmTriggered&&!refill&&!newWave)return 0;
 state.minions=(state.minions??[]).filter(e=>e.hp>0);
 const count=newWave?TRUE_SWARM.count:Math.max(0,TRUE_SWARM.count-state.minions.length);if(!count)return 0;
 state.swarmTriggered=true;state.swarmWaves=(state.swarmWaves??0)+1;state.swarmSerial??=0;
 const origin=game.flight.position;
 state.swarmPortals=Array.from({length:TRUE_SWARM.portals},(_,i)=>{const a=i*Math.PI*2/TRUE_SWARM.portals;return {x:origin.x+Math.cos(a)*TRUE_SWARM.radius,y:origin.y+Math.sin(a)*TRUE_SWARM.radius};});
 state.swarmAt=game.flight.elapsed;
 for(let i=0;i<count;i++){
  const portal=state.swarmPortals[i%TRUE_SWARM.portals],row=Math.floor(i/TRUE_SWARM.portals),angle=i*2.399;
  const position={x:portal.x+Math.cos(angle)*row*24,y:portal.y+Math.sin(angle)*row*24};
  const serial=++state.swarmSerial;
  state.minions.push({id:`true-swarm-${serial}`,type:'berserk',trueBossMinion:true,campaign:true,hp:RAILGUN.damage[0],maxHp:RAILGUN.damage[0],position,home:{...position},heading:angle,slot:serial,cooldown:.5+(i%5)*.15,ramCooldown:0,detected:true});
 }
 game.notice=`異次元の裂け目から暴走敵${count}体！ 瞳が開いた隙に波動砲を通せ。`;
 return count;
}
