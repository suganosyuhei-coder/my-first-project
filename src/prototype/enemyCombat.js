import {bossParasite} from './enemyAnatomy.js';
import {enemyReward} from './spaceLoot.js';
import {destructionEffect} from './destruction.js';
import data from './enemyTypes.json' with {type:'json'};
export const enemyType=enemy=>data.types.find(t=>t.id===enemy.type);
export function enemyWeakpoint(enemy){
 const type=enemyType(enemy);if(!type?.weakpoint||enemy.type==='finalBoss'&&!enemy.parasiteRevealed)return null;
 if(enemy.type==='finalBoss')return bossParasite(enemy);
 return {position:{x:enemy.position.x+Math.sin(enemy.heading)*type.radius*.72,y:enemy.position.y-Math.cos(enemy.heading)*type.radius*.72},radius:type.radius*.3};
}
export function damageEnemy(game,enemy,damage,point,shotRadius=0,source='normal'){
 if(enemy.hp<=0)return {damage:0,weak:false,destroyed:false};
 const type=enemyType(enemy),core=enemyWeakpoint(enemy),weak=!!core&&Math.hypot(point.x-core.position.x,point.y-core.position.y)<=core.radius+shotRadius+1e-8;
 const amount=Math.max(0,damage)*(type.weakpoint?(weak?type.weakMultiplier:type.armorMultiplier):1),before=enemy.hp;
 if(weak&&amount>0){enemy.weakHitAt=game.flight.elapsed;enemy.weakHitSequence=(enemy.weakHitSequence??0)+1;}enemy.hp=Math.max(0,enemy.hp-amount);if(enemy.type==='finalBoss'&&amount>0&&!enemy.parasiteRevealed){enemy.parasiteHits=(enemy.parasiteHits??0)+1;if(enemy.parasiteHits>=3){enemy.parasiteRevealed=true;enemy.parasiteRevealedAt=game.flight.elapsed;}}if(enemy.hp===0){if(source!=='enemy'){game.enemies.kills++;enemyReward(game,enemy,source);}destructionEffect(game,enemy,'enemy',source);}
 return {damage:before-enemy.hp,weak,destroyed:enemy.hp===0};
}
