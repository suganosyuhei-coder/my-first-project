// Provisional gentle assist: steering remains manual, only a narrow forward cone snaps.
export const AIM={cone:8*Math.PI/180,warningRange:520,warningSeconds:3};
export function aimTarget(game,heading=game.flight.heading,range=AIM.warningRange,muzzleDistance=0){
 const f=game.flight,origin={x:f.position.x+Math.sin(heading)*muzzleDistance,y:f.position.y-Math.cos(heading)*muzzleDistance};
 let best=null;
 for(const rock of game.hazards){
  if(!['impact','obstacle'].includes(rock.type)||game.destroyedRocks?.has(rock.id))continue;
  const dx=rock.position.x-origin.x,dy=rock.position.y-origin.y,distance=Math.hypot(dx,dy),angle=Math.atan2(dx,-dy),delta=Math.atan2(Math.sin(angle-heading),Math.cos(angle-heading));
  if(distance>range||Math.abs(delta)>AIM.cone)continue;
  if(!best||distance<best.distance)best={rock,distance,heading:angle,origin};
 }
 return best;
}
export function rockWarnings(game){
 for(const rock of game.hazards.filter(h=>h.type==='impact'||h.type==='obstacle')){
  const distance=Math.hypot(rock.position.x-game.flight.position.x,rock.position.y-game.flight.position.y);
  const dx=rock.position.x-game.flight.position.x,dy=rock.position.y-game.flight.position.y,{width,height,scale}=game.viewport;
  const visible=Math.abs(dx)*scale<=width/2+rock.radius*scale&&Math.abs(dy)*scale<=height/2+rock.radius*scale;
  const ahead=dx*Math.sin(game.flight.heading)-dy*Math.cos(game.flight.heading)>0;
  if(distance<=AIM.warningRange&&visible&&ahead&&!game.warnedRocks.has(rock.id)){game.warnedRocks.add(rock.id);game.rockAlerts.set(rock.id,game.flight.elapsed);}
 }
 // Keep recent warnings only; destroyed IDs separately prevent regenerated rocks.
 for(const [id,time] of game.rockAlerts)if(game.flight.elapsed-time>AIM.warningSeconds+10)game.rockAlerts.delete(id);
}
