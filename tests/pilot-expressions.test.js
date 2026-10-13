import {createEquippedGame} from './helpers/equippedGame.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {snapshot} from '../src/prototype/game.js';
import {createPilotController,PILOT_ACTIONS,PILOT_EXPRESSIONS,PILOT_SCENES,pilotFrame} from '../src/prototype/pilotExpressions.js';
function state(){const t=snapshot(createEquippedGame());t.flight.elapsed=10;t.jobs=[];return t;}
function finish(t,action){t.flight.elapsed=action.until+.1;}
test('departure, readable speech, damage interruption, victory and reset never mutate telemetry',()=>{
 const t=state(),select=createPilotController();t.flight.elapsed=0;assert.equal(select(t).id,'departure');
 t.flight.elapsed=5;select(t);t.weapon.holding=true;t.flight.elapsed=10;assert.equal(select(t).id,'charging');
 t.ship.parts[0].hp-=10;t.flight.elapsed=11;const before=structuredClone(t),hurt=select(t);assert.equal(hurt.id,'damage');assert.equal(hurt.expression,'pain');assert.deepEqual(t,before);
 t.weapon.shots++;t.flight.elapsed=11.1;assert.equal(select(t).serial,hurt.serial);
 finish(t,hurt);assert.equal(select(t).id,'charging');t.status='cleared';assert.equal(select(t).scene,'return');
 t.flight.elapsed=100;assert.equal(select(t).scene,'return');t.status='running';t.flight.elapsed=0;assert.equal(select(t).id,'departure');
});
test('shots do not restart speech; item and analysis lines last long enough and rotate without repeats',()=>{
 const t=state(),select=createPilotController();select(t);t.weapon.shots++;t.flight.elapsed=11;const fired=select(t);assert.equal(fired.id,'fired');
 t.weapon.shots++;t.flight.elapsed=11.2;assert.equal(select(t).serial,fired.serial);finish(t,fired);select(t);
 t.inventory.wire++;const item=select(t);assert.equal(item.id,'recovered');assert.ok(item.until-item.startedAt>=4);
 finish(t,item);select(t);t.inventory.wire++;const next=select(t);assert.equal(next.id,'recovered');assert.notEqual(next.line,item.line);
 finish(t,next);select(t);t.nebula.observations=[{id:'a',state:'analyzed'}];assert.equal(select(t).id,'analyzed');
});
test('analysis, boost and collection remain supported; removal is not damage',()=>{
 const t=state(),select=createPilotController();let a=select(t);t.ship.parts.pop();assert.equal(select(t).id,'cruising');
 finish(t,a);t.jobs=[{stage:'returning'}];a=select(t);assert.equal(a.id,'collecting');
 finish(t,a);t.nebula.observations=[{id:'a',state:'detected'}];t.nebula.selected='a';t.nebula.observableIds=['a'];a=select(t);assert.equal(a.id,'analyzing');
 finish(t,a);t.nebula.observableIds=[];a=select(t);assert.equal(a.id,'analysisPaused');
 finish(t,a);t.boost.holding=true;a=select(t);assert.equal(a.id,'boostCharging');finish(t,a);t.boost.remaining=.5;assert.equal(select(t).id,'boosting');
});
test('all supplied scenes have portraits, 3-frame poses animate and crops remain within source bounds',()=>{
 assert.equal(Object.values(PILOT_SCENES).reduce((n,s)=>n+s.lines.length,0),93);
 for(const scene of Object.values(PILOT_SCENES))assert.ok(PILOT_EXPRESSIONS[scene.expression]);
 for(const action of PILOT_ACTIONS)assert.ok(PILOT_EXPRESSIONS[action.expression]);
 for(const pose of Object.values(PILOT_EXPRESSIONS))for(const crop of pose.frames??[pose.crop]){assert.ok(crop.x>=0&&crop.y>=0);assert.ok(crop.x+crop.width<=crop.sourceWidth);assert.ok(crop.y+crop.height<=crop.sourceHeight);}
 const pose=PILOT_EXPRESSIONS.blink;assert.notDeepEqual(pilotFrame(pose,0),pilotFrame(pose,4.6));
 const configured=PILOT_ACTIONS.map(a=>a.id==='cruising'?{...a,expression:'smile'}:a);assert.equal(createPilotController(configured)(state()).expression,'smile');
});
test('POW encounter, upgrades, boss, main fleet and diffusion multi kill use specific dialogue',()=>{
 for(const [id,edit] of [['pow',t=>t.enemies.units=[{id:'p',type:'pow',hp:1,detected:true}]],['upgraded',t=>t.ship.parts.push({id:'new',type:'engine',hp:100})],['boss',t=>t.enemies.units=[{id:'b',type:'miniboss',hp:1,detected:true}]],['mainFleet',t=>t.enemies.units=[{id:'g',type:'guard',hp:1,detected:true}]],['multiKill',t=>t.weapon.diffusionMultiKills=1]]){
  const t=state(),select=createPilotController();select(t);t.flight.elapsed=11;edit(t);assert.equal(select(t).id,id);
 }
 const t=state(),select=createPilotController();select(t);t.flight.elapsed=31;assert.equal(select(t).storyTrigger,'hummingShy');assert.ok(PILOT_SCENES.mutation.lines.length);assert.ok(!PILOT_ACTIONS.some(a=>a.scene==='mutation'));
});
import {createGame} from '../src/prototype/game.js';
import {stepRailgun,stepProjectiles} from '../src/prototype/railgun.js';
test('diffusion volley counts two actual enemy kills once, not unrelated destroyed objects',()=>{
 const g=createGame({campaign:false});g.hazards=[];g.enemies.units=[];stepRailgun(g,[{type:'weapon-press'}],3.6);stepRailgun(g,[{type:'weapon-release'}],0);
 const rays=g.weapon.projectiles.filter(p=>p.stage===3),point=rays[4].path[20];g.enemies.units=[{id:'a',type:'soldier',hp:1,position:{...point},heading:0},{id:'b',type:'soldier',hp:1,position:{x:point.x+1,y:point.y},heading:0}];
 for(let i=0;i<60;i++)stepProjectiles(g,1/60);assert.equal(g.enemies.kills,2);assert.equal(g.weapon.diffusionMultiKills,1);
});
