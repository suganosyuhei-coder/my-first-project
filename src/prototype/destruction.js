export function destructionEffect(game,target,kind='enemy',source='normal'){
 (game.enemies.debris??=[]).push({kind,source,position:{...target.position},radius:target.radius,heading:target.heading??0,type:target.type,startedAt:game.flight.elapsed});
}
