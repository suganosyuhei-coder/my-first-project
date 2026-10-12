import {supplyGraph} from './energy.js';

// Issue #6 provisional balance. Ordinary consumers are paid first; no second fuel.
export const BOOST={chargeSeconds:1.2,minimumChargeSeconds:.15,baseCost:8,extraCost:12,baseImpulse:20,extraImpulse:60,impulseMultiplier:1.65,turnMultiplier:3.5,decay:2.4,duration:1.25};
export function createBoost(){return {holding:false,heldSeconds:0,charge:0,enabled:false,engines:0,velocity:{x:0,y:0},remaining:0,bursts:0,totalSpent:0,lastBurst:null,reason:'稼働エンジン2基で解放'};}
export function cancelBoost(state,stop=false){state.holding=false;state.heldSeconds=0;state.charge=0;if(stop){state.velocity={x:0,y:0};state.remaining=0;}}
export function boostSupply(game){
 const engines=game.ship.parts.filter(p=>p.type==='engine'&&p.hp>0&&game.energy.active[p.id]);
 const groups=supplyGraph(game.ship.parts).filter(group=>group.some(p=>engines.some(e=>e.id===p.id)));
 const tanks=groups.flatMap(group=>group.filter(p=>p.type==='tank'&&p.hp>0));
 return {engines:engines.length,tanks,available:tanks.reduce((n,p)=>n+Math.max(0,p.stored||0),0)};
}
export function stepBoost(game,commands,dt){
 const b=game.boost;if(game.status!=='running'){cancelBoost(b,true);return;}
 const supply=boostSupply(game);b.engines=supply.engines;b.enabled=supply.engines>=2;
 if(!b.enabled){cancelBoost(b,true);b.reason='稼働エンジン2基で解放';}
 for(const action of commands){
  if(action.type==='boost-cancel')cancelBoost(b);
  if(action.type==='boost-press'&&!b.holding){if(!b.enabled){game.notice='急加速には稼働エンジン2基が必要です';continue;}b.holding=true;b.heldSeconds=0;b.charge=0;b.reason='Shift中は急旋回・離すと加速';}
  if(action.type==='boost-release'&&b.holding){
   const charge=b.charge,cost=BOOST.baseCost+BOOST.extraCost*charge,seconds=b.heldSeconds;
   cancelBoost(b);
   if(seconds<BOOST.minimumChargeSeconds){b.reason='短押し：急加速をキャンセル';continue;}
   if(cost>supply.available+1e-9){b.reason='急加速のエネルギー不足';game.notice=b.reason;continue;}
   let remaining=cost;for(const tank of supply.tanks){const take=Math.min(tank.stored,remaining);tank.stored-=take;remaining-=take;}
   const heading=action.heading??game.flight.heading,impulse=(BOOST.baseImpulse+BOOST.extraImpulse*charge)*(game.tuning?.boost.impulseMultiplier??BOOST.impulseMultiplier);
   b.velocity={x:Math.sin(heading)*impulse,y:-Math.cos(heading)*impulse};b.remaining=game.tuning?.boost.duration??BOOST.duration;b.bursts++;b.totalSpent+=cost;b.lastBurst={heading,cost,charge,impulse};b.reason='急加速';game.notice=`急加速：${cost.toFixed(1)} E 消費`;
   game.energy.stored=game.ship.parts.filter(p=>p.type==='tank'&&p.hp>0).reduce((n,p)=>n+(p.stored||0),0);
  }
 }
 if(b.holding){b.heldSeconds=Math.min(BOOST.chargeSeconds,b.heldSeconds+dt);b.charge=b.heldSeconds/BOOST.chargeSeconds;const cost=BOOST.baseCost+BOOST.extraCost*b.charge;b.reason=supply.available+1e-9>=cost?'Shift中は急旋回・離すと加速':'急加速のエネルギー不足';}
}
export function decayBoost(game,dt){const b=game.boost;b.remaining=Math.max(0,b.remaining-dt);const decay=Math.exp(-BOOST.decay*dt);b.velocity.x*=decay;b.velocity.y*=decay;if(b.remaining===0)b.velocity={x:0,y:0};}

export function boostTurnMultiplier(game){return game.boost.holding&&game.boost.enabled?(game.tuning?.boost.turnMultiplier??BOOST.turnMultiplier):1;}
