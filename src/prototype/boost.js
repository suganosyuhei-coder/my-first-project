import {tankBoostMultiplier,equipmentBonus} from './equipment.js';
import {supplyGraph} from './energy.js';

// Issue #6 provisional balance. Ordinary consumers are paid first; no second fuel.
export const BOOST={chargeSeconds:1.2,initialChargeLimit:.6,extraEngineCharge:.4,minimumChargeSeconds:.15,baseCost:8,extraCost:12,baseImpulse:20,extraImpulse:60,impulseMultiplier:1.65,turnMultiplier:3.5,decay:2.4,duration:1.25,diveGraceFrames:5};
export function createBoost(){return {subspace:false,holding:false,heldSeconds:0,charge:0,enabled:false,engines:0,level:0,chargeLimit:0,velocity:{x:0,y:0},remaining:0,bursts:0,totalSpent:0,lastBurst:null,reason:'Shift長押しでチャージ・離すと加速'};}
export function cancelBoost(state,stop=false){state.holding=false;state.heldSeconds=0;state.charge=0;if(stop){state.subspace=false;state.velocity={x:0,y:0};state.remaining=0;}}
export function boostSupply(game){
 const engines=game.ship.parts.filter(p=>p.type==='engine'&&p.hp>0);
 const groups=supplyGraph(game.ship.parts).filter(group=>group.some(p=>engines.some(e=>e.id===p.id)));
 const tanks=groups.flatMap(group=>group.filter(p=>p.type==='tank'&&p.hp>0));
 return {engines:engines.length,tanks,available:tanks.reduce((n,p)=>n+Math.max(0,p.stored||0),0)};
}
export function stepBoost(game,commands,dt){
 const b=game.boost;if(game.status!=='running'){cancelBoost(b,true);return;}
 const supply=boostSupply(game);b.engines=supply.engines;b.level=supply.engines>=2?2:1;b.enabled=true;b.chargeLimit=BOOST.initialChargeLimit+Math.max(0,supply.engines-1)*BOOST.extraEngineCharge;
 b.charge=Math.min(b.charge,b.chargeLimit);b.heldSeconds=Math.min(b.heldSeconds,BOOST.chargeSeconds*b.chargeLimit);
 for(const action of commands){
  if(action.type==='boost-cancel')cancelBoost(b);
  if(action.type==='boost-press'&&!b.holding){if(!b.enabled){game.notice='急加速には稼働エンジン1基が必要です';continue;}b.holding=true;b.heldSeconds=0;b.charge=0;b.reason='Shift中は急旋回・離すと加速';}
  if(action.type==='boost-release'&&b.holding){
   const charge=b.charge,cost=0,seconds=b.heldSeconds;
   cancelBoost(b);
   if(seconds<BOOST.minimumChargeSeconds){b.reason='短押し：急加速をキャンセル';continue;}
   const heading=action.heading??game.flight.heading,impulse=((BOOST.baseImpulse+BOOST.extraImpulse)*charge)*(game.tuning?.boost.impulseMultiplier??BOOST.impulseMultiplier)*tankBoostMultiplier(game.ship.parts)*(1+equipmentBonus(game.ship.parts,'engine'));
   b.velocity={x:Math.sin(heading)*impulse,y:-Math.cos(heading)*impulse};b.remaining=game.tuning?.boost.duration??BOOST.duration;b.bursts++;b.totalSpent+=cost;b.lastBurst={heading,cost,charge,impulse,level:b.level};b.subspace=Boolean((game.weapon?.subspaceGrace??0)>1e-9);if(b.subspace)game.weapon.subspaceGrace=0;b.reason=b.subspace?'亜空間ブースト':'急加速';game.notice=b.reason;
   game.energy.stored=game.ship.parts.filter(p=>p.type==='tank'&&p.hp>0).reduce((n,p)=>n+(p.stored||0),0);
  }
 }
 if(b.holding){b.heldSeconds=Math.min(BOOST.chargeSeconds*b.chargeLimit,b.heldSeconds+dt);b.charge=Math.min(b.heldSeconds/BOOST.chargeSeconds,b.chargeLimit);b.reason='Shift中は急旋回・離すと加速';}
}
export function decayBoost(game,dt){const b=game.boost;b.remaining=Math.max(0,b.remaining-dt);const decay=Math.exp(-BOOST.decay*dt);b.velocity.x*=decay;b.velocity.y*=decay;if(b.remaining===0){b.velocity={x:0,y:0};b.subspace=false;}}

export function boostTurnMultiplier(game){return game.boost.holding&&game.boost.enabled?(game.tuning?.boost.turnMultiplier??BOOST.turnMultiplier):1;}
