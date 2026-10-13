export const MISSILE_PHASES={drop:.18,ignite:.34,launch:.58,effectSeconds:.7};
export function missilePhase(age){return age<MISSILE_PHASES.drop?'drop':age<MISSILE_PHASES.ignite?'ignite':age<MISSILE_PHASES.launch?'launch':'track';}
// The same release/ignition/launch sequence is used by the ship and its white escort.
export function advanceMissile(missile,dt,target,speed=180,turnRate=4){
 const phase=missilePhase(missile.age);missile.phase=phase;
 if(target&&phase==='track'){const desired=Math.atan2(target.position.x-missile.position.x,-(target.position.y-missile.position.y)),difference=Math.atan2(Math.sin(desired-missile.heading),Math.cos(desired-missile.heading));missile.heading+=Math.max(-turnRate*dt,Math.min(turnRate*dt,difference));}
 const from={...missile.position},heading=missile.heading;
 if(phase==='drop'){const side=missile.side??1,velocity=missile.releaseVelocity??{x:0,y:0};return {from,to:{x:from.x+(velocity.x*.5+Math.cos(heading)*side*24)*dt,y:from.y+(velocity.y*.5+Math.sin(heading)*side*24+12)*dt},armed:false};}
 const acceleration=phase==='ignite'?.15:phase==='launch'?.35+.65*(missile.age-MISSILE_PHASES.ignite)/(MISSILE_PHASES.launch-MISSILE_PHASES.ignite):1;
 return {from,to:{x:from.x+Math.sin(heading)*speed*acceleration*dt,y:from.y-Math.cos(heading)*speed*acceleration*dt},armed:phase!=='ignite'};
}
