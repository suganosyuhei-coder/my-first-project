// Simple tunable orbital flow, not an astronomical gravity simulation.
export const PLANET_FLOW={strength:1,nebulaStrength:2,galaxyStrength:1,reach:70,orbitClearance:20,flowSpeed:40,minimumControl:.12};
export function nearbyPlanets(position){const sector=Math.floor(-position.y/420);return Array.from({length:5},(_,n)=>{const index=sector+n-2;return {id:`planet-${index}`,index,position:{x:index%2===0?135:-135,y:-index*420-115},radius:[38,72,24,110][Math.abs(index)%4],direction:index%2===0?1:-1};});}
export function planetInfluence(position,planets,hullRadius=50,strength=PLANET_FLOW.strength){
 let result={weight:0,controlFactor:1,turn:0,flowVelocity:null,planets:[],hullRadius};
 if(strength<=0)return result;
 result.planets=planets;
 for(const planet of planets){const dx=position.x-planet.position.x,dy=position.y-planet.position.y,distance=Math.hypot(dx,dy),safe=planet.radius+hullRadius+6,orbit=safe+PLANET_FLOW.orbitClearance,outer=safe+PLANET_FLOW.reach;
  if(distance>=outer)continue;const t=Math.max(0,Math.min(1,(outer-distance)/(outer-orbit))),weight=Math.min(.94,t*t*(3-2*t)*strength);if(weight<=result.weight)continue;
  const nx=distance?dx/distance:1,ny=distance?dy/distance:0,radial=Math.max(-12,Math.min(12,(orbit-distance)*.35)),speed=PLANET_FLOW.flowSpeed*Math.min(1.5,strength);
  result={...result,weight,controlFactor:Math.max(PLANET_FLOW.minimumControl,1-weight),flowVelocity:{x:-ny*planet.direction*speed+nx*radial,y:nx*planet.direction*speed+ny*radial},planetId:planet.id};
 }
 return result;
}
export function planetEnvironment(base,flight,planets,hullRadius,strength,galaxyStrength=PLANET_FLOW.galaxyStrength){const flow=planetInfluence(flight.position,planets,hullRadius,strength);let turn=base.turn;
 if(flow.flowVelocity){const heading=Math.atan2(flow.flowVelocity.x,-flow.flowVelocity.y),delta=Math.atan2(Math.sin(heading-flight.heading),Math.cos(heading-flight.heading));turn+=delta*flow.weight*1.8;}
 return {...base,...flow,turn,flowMix:flow.weight,galaxyVelocity:galaxyCurrent(flight.position,galaxyStrength)};
}
export function keepOutsidePlanets(state,planets,hullRadius){
 for(const planet of planets||[]){const dx=state.position.x-planet.position.x,dy=state.position.y-planet.position.y,d=Math.hypot(dx,dy),safe=planet.radius+hullRadius+6;if(d>=safe)continue;
  const nx=d?dx/d:1,ny=d?dy/d:0;state.position={x:planet.position.x+nx*safe,y:planet.position.y+ny*safe};
  const tangent={x:-ny*planet.direction,y:nx*planet.direction},speed=Math.max(12,Math.hypot(state.velocity.x,state.velocity.y));state.velocity={x:tangent.x*speed,y:tangent.y*speed};state.heading=Math.atan2(state.velocity.x,-state.velocity.y);state.angularVelocity=0;
 }
}

export function nearbyGalaxies(position){const sector=Math.floor(-position.y/2200);return [-1,0,1].map(n=>{const index=sector+n;return {id:`galaxy-${index}`,position:{x:index%2===0?900:-950,y:-index*2200-700},radius:130+Math.abs(index%3)*25};});}
export function galaxyCurrent(position,strength=PLANET_FLOW.galaxyStrength){const velocity={x:0,y:0};for(const galaxy of nearbyGalaxies(position)){const dx=galaxy.position.x-position.x,dy=galaxy.position.y-position.y,d=Math.hypot(dx,dy);if(d===0)continue;const pull=strength*.9/(1+(d/1500)**2);velocity.x+=dx/d*pull;velocity.y+=dy/d*pull;}return velocity;}
