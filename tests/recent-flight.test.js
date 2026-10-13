import test from 'node:test';import assert from 'node:assert/strict';
import {createGame,snapshot} from '../src/prototype/game.js';
import {stepRailgun} from '../src/prototype/railgun.js';
import {createWeaponInput} from '../src/prototype/weaponInput.js';
import {launchMissiles,stepMissiles,MISSILE} from '../src/prototype/missiles.js';
import {pawMissileDrop,enemyReward} from '../src/prototype/spaceLoot.js';
import {markEnemyDetected,detectionGlow} from '../src/prototype/enemyDetection.js';
import {renderCamera,flightAnchor} from '../src/prototype/camera.js';
import {worldToScreen,screenToWorld} from '../src/prototype/model.js';
import {applyContact} from '../src/prototype/damage.js';import {cellToWorld} from '../src/prototype/ship.js';
const fixture=()=>{const g=createGame({campaign:false,force:false});g.enemies.units=[{id:'target',type:'commander',position:{x:100,y:-150},hp:420,detected:true}];g.ship.parts.push({id:'launcher',type:'missile',x:0,y:0,hp:100,appearance:{}});return g;};
test('missile carriers are deterministic and close to 10% of normal PAWs, and installs once on PAW reward',()=>{
 let count=0,id;for(let i=0;i<200000;i++)if(pawMissileDrop(`pow-${i}`,7309)){count++;id=`pow-${i}`;}assert.ok(count>19000&&count<21000,count);const g=createGame({campaign:false});assert.equal(g.inventory.missile,0);assert.ok(!g.ship.parts.some(p=>p.type==='missile'));enemyReward(g,{id,type:'pow'});assert.equal(g.equipmentPickup.type,'missile');assert.ok(g.ship.parts.some(p=>p.type==='missile')||g.inventory.missile===1);
});
test('missiles launch a homing pair, block even one remaining slot, and deal normal-shot damage',()=>{
 const g=fixture();assert.equal(launchMissiles(g),true);assert.deepEqual(g.missiles.units.map(m=>m.side),[-1,1]);assert.equal(launchMissiles(g),false);const before=g.enemies.units[0].hp;
 for(let i=0;i<200&&g.missiles.units.length;i++)stepMissiles(g,1/60);assert.equal(g.missiles.hits,2);assert.equal(g.enemies.units[0].hp,before-20);assert.equal(g.missiles.units.length,0);
 g.missiles.cooldown=0;launchMissiles(g);g.missiles.units.pop();g.missiles.cooldown=0;assert.equal(launchMissiles(g),false);
});
test('lost missiles self-destruct, pause freezes them, snapshots isolate and retry clears equipment',()=>{
 const g=fixture();launchMissiles(g);const copy=snapshot(g);copy.missiles.units[0].position.x=999;assert.notEqual(g.missiles.units[0].position.x,999);g.paused=true;const before=JSON.stringify(g.missiles);stepMissiles(g,1);assert.equal(JSON.stringify(g.missiles),before);g.paused=false;g.enemies.units=[];stepMissiles(g,MISSILE.lostLifetime+.01);assert.equal(g.missiles.units.length,0);assert.equal(createGame().missiles.units.length,0);
});
test('normal and wave fire launch missiles; missing launcher or enemy prevents launching',()=>{
 for(const hold of [0,1,3.6]){const g=fixture();stepRailgun(g,[{type:'weapon-press'}],hold);stepRailgun(g,[{type:'weapon-release'}],0);assert.equal(g.missiles.units.length,2);}
 const g=fixture();g.ship.parts=g.ship.parts.filter(p=>p.type!=='missile');assert.equal(launchMissiles(g),false);const h=fixture();h.enemies.units=[];assert.equal(launchMissiles(h),false);
});
test('automatic fire emits six normal volleys per second without Space and cancels safely',()=>{
 const g=createGame({campaign:false,force:false});stepRailgun(g,[{type:'weapon-auto-toggle'}],1/60);for(let i=1;i<60;i++)stepRailgun(g,[],1/60);assert.equal(g.weapon.shots,6);assert.equal(g.weapon.lastShot.stage,0);assert.equal(g.weapon.holding,false);stepRailgun(g,[{type:'weapon-cancel'}],1);assert.equal(g.weapon.autoFire,false);assert.equal(g.weapon.shots,6);
 stepRailgun(g,[{type:'weapon-auto-toggle'}],0);g.paused=true;const shots=g.weapon.shots;stepRailgun(g,[],1);assert.equal(g.weapon.shots,shots);g.status='ended';stepRailgun(g,[],1);assert.equal(g.weapon.autoFire,false);
});
test('Command alone toggles; native shortcuts and typing do not toggle; blur stops autofire',()=>{
 const actions=[],input=createWeaponInput({enqueue:a=>actions.push(a),isRunning:()=>true,heading:()=>0,isAuto:()=>true}),e=code=>({code,target:{tagName:'BODY'},preventDefault(){}});
 input.down(e('MetaLeft'));input.up(e('MetaLeft'));assert.equal(actions.pop().type,'weapon-auto-toggle');input.down(e('MetaLeft'));input.down(e('KeyR'));input.up(e('MetaLeft'));assert.equal(actions.length,0);input.down({...e('MetaLeft'),target:{tagName:'INPUT'}});input.up(e('MetaLeft'));assert.equal(actions.length,0);input.cancel();assert.equal(actions.pop().type,'weapon-cancel');
});
test('shifted camera aligns ship, observation and clicks while leaving world coordinates unchanged',()=>{
 const g=createGame();g.viewport.scale=1.3;const before={...g.flight.position},p=worldToScreen(g.flight.position,renderCamera(g),900,700,1.3),anchor=flightAnchor(g,900,700);assert.deepEqual(p,anchor);assert.equal(p.x,450-76*1.3);assert.equal(p.y,350+108*1.3);const back=screenToWorld(p,renderCamera(g),900,700,1.3);assert.ok(Math.hypot(back.x-before.x,back.y-before.y)<1e-10);assert.deepEqual(g.flight.position,before);
});
test('damage is scaled to 80% and records source at the struck world position',()=>{
 const g=createGame({campaign:false});g.ship.parts=[];const position=cellToWorld({x:2,y:8},g.flight);applyContact(g,{type:'enemyAttack',source:'敵弾',position,damage:10});assert.equal(g.ship.cells.find(c=>c.x===2&&c.y===8).hp,92);assert.equal(g.lastContact.source,'敵弾');assert.deepEqual(g.lastContact.position,position);
});
test('discovery flashes once with increasing strength for regular, commander and boss',()=>{
 const enemy={type:'gunner',detected:false};assert.equal(markEnemyDetected(enemy,false,2),false);assert.equal(markEnemyDetected(enemy,true,3),true);assert.equal(markEnemyDetected(enemy,true,4),false);assert.equal(enemy.detectedAt,3);assert.equal(detectionGlow(enemy,4),null);
 const normal=detectionGlow(enemy,3.15),commander=detectionGlow({...enemy,type:'commander'},3.3),boss=detectionGlow({...enemy,type:'finalBoss'},3.5);assert.ok(normal.radius<commander.radius&&commander.radius<boss.radius);assert.equal(boss.boss,true);assert.equal(detectionGlow({...enemy,type:'pow'},3.1),null);
});
