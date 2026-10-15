import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/prototype/game.js';
import {enemySegmentHit,enemyCollisionGeometry} from '../src/prototype/enemyBodies.js';
import {damageEnemy} from '../src/prototype/enemyCombat.js';
import {stepTrailDamage,TRAIL_DAMAGE} from '../src/prototype/trailCombat.js';

function reference(game){
 for(const enemy of game.enemies.units){
  if(enemy.hp<=0||game.flight.elapsed<(enemy.trailNextHit??-1))continue;
  for(let i=1;i<game.flight.trail.length;i++){
   if(enemySegmentHit(game.flight.trail[i-1],game.flight.trail[i],enemy,TRAIL_DAMAGE.radius)===null)continue;
   damageEnemy(game,enemy,TRAIL_DAMAGE.damage,enemy.position);enemy.trailNextHit=game.flight.elapsed+TRAIL_DAMAGE.interval;break;
  }
 }
}
test('cached collision geometry preserves exact hits and core priority across rotated bosses and long bodies',()=>{
 for(const type of ['soldier','finalBoss','centipede','mossCrab','trueEye'])for(const heading of [0,.6,2.1]){
  const enemy={type,position:{x:20,y:-50},heading,bodyTime:10,parasiteRevealed:true,coreOpen:true},geometry=enemyCollisionGeometry(enemy);
  for(let i=0;i<120;i++){
   const from={x:Math.sin(i*1.3)*400,y:Math.cos(i*.8)*400},to={x:Math.cos(i*.9)*400,y:Math.sin(i*.7)*400};
   assert.equal(enemySegmentHit(from,to,enemy,1.5,geometry),enemySegmentHit(from,to,enemy,1.5));
  }
 }
});
test('trail broad phase matches full exact checking for crossings, distant bodies, zero-length segments, cooldowns and kills',()=>{
 for(const points of [
  [{x:-1000,y:0},{x:1000,y:0}],
  [{x:0,y:150},{x:0,y:150}],
  [{x:0,y:-1.5},{x:0,y:1.5}],
  Array.from({length:500},(_,i)=>({x:Math.sin(i*.31)*700,y:Math.cos(i*.17)*800})),
  [{x:10000,y:10000},{x:10100,y:10000}],
 ]){
  const game=createGame({campaign:false});game.flight.trail=points;game.flight.elapsed=10;
  game.enemies.units=['soldier','finalBoss','centipede','mossCrab','soldier'].map((type,i)=>({id:`enemy-${i}`,type,hp:i===0?1:100,position:{x:i*65,y:0},heading:i*.4,bodyTime:4,parasiteRevealed:true,trailNextHit:i===4?11:0}));
  const expected=structuredClone(game);reference(expected);stepTrailDamage(game,1/60);
  assert.deepEqual(game.enemies,expected.enemies);assert.equal(game.score,expected.score);assert.deepEqual(game.lastEnemyDefeat,expected.lastEnemyDefeat);
 }
});
