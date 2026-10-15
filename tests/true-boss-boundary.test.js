import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame,snapshot} from '../src/prototype/game.js';
import {stepTrueBoss,triggerTrueBoss} from '../src/prototype/trueBoss.js';
import {trueBossTouchesStable,constrainTrueBossMove} from '../src/prototype/trueBossBoundary.js';
import {stableBoundaryRadius} from '../src/prototype/stableSpace.js';
import {createPilotStoryObserver} from '../src/prototype/pilotStory.js';
import {createPilotController} from '../src/prototype/pilotExpressions.js';
function chase(){
 const g=createGame({stableStart:true,campaign:false});g.stableSpace.phase='normal';g.viewport.width=2000;g.viewport.height=1600;
 const eye={id:'true-eye',type:'trueEye',hp:1,position:{x:900,y:0},trueBossPart:true,campaign:true,detected:true};
 g.trueBoss={phase:'pursuit',timer:0,position:{...eye.position},parts:[eye],debris:[],attackClock:100,absorbed:true};return g;
}
test('eye and tentacles stop outside the irregular boundary and can resume chasing outside it',()=>{
 const g=chase();stepTrueBoss(g,5);assert.equal(g.trueBoss.stableBlocked,true);assert.ok(!trueBossTouchesStable(g,g.trueBoss.position,112));assert.ok(g.trueBoss.position.x>stableBoundaryRadius(0)+100);
 const stopped={...g.trueBoss.position};for(let i=0;i<60;i++)stepTrueBoss(g,1/60);assert.ok(Math.hypot(g.trueBoss.position.x-stopped.x,g.trueBoss.position.y-stopped.y)<.01);
 g.flight.position={x:1500,y:0};stepTrueBoss(g,.5);assert.ok(g.trueBoss.position.x>stopped.x);assert.equal(g.trueBoss.stableBlocked,false);
});
test('swept motion cannot tunnel through the stable area in a long frame; nonstable scenes remain unchanged',()=>{
 const g=chase();for(let i=0;i<12;i++){const a=i*Math.PI/6,from={x:900*Math.cos(a),y:900*Math.sin(a)},to={x:-from.x,y:-from.y},r=constrainTrueBossMove(g,from,to,112);assert.equal(r.blocked,true);assert.ok(!trueBossTouchesStable(g,r.position,112));assert.ok(r.position.x*from.x+r.position.y*from.y>0);}
 const plain=createGame({campaign:false}),to={x:0,y:0};assert.deepEqual(constrainTrueBossMove(plain,{x:900,y:0},to,112),{position:to,blocked:false});
});
test('battleship spawn and every live part remain outside stable space even when triggered from inside it',()=>{
 const g=createGame({stableStart:true});g.campaign.bossCleared=true;for(const e of g.campaign.units)if(e.clusterId)e.hp=0;assert.equal(triggerTrueBoss(g),true);assert.ok(!trueBossTouchesStable(g,g.trueBoss.position,240));stepTrueBoss(g,3);for(const p of g.trueBoss.parts)assert.ok(!trueBossTouchesStable(g,p.position,p.type==='trueHull'?60:25));
});
test('only seeing the blocked eye triggers the exact cute surprised portrait and line, once per voyage',()=>{
 const g=chase();g.flight.elapsed=10;stepTrueBoss(g,5);const t=snapshot(g);assert.equal(t.trueBoss.stableBlockedVisible,true);
 const offscreen=structuredClone(t);offscreen.trueBoss.stableBlockedVisible=false;const observer=createPilotStoryObserver();assert.notEqual(observer.observe(offscreen).event?.trigger,'trueBossStableBlocked');
 t.flight.elapsed++;assert.equal(observer.observe(t).event.trigger,'trueBossStableBlocked');observer.accepted('trueBossStableBlocked',t.flight.elapsed);t.flight.elapsed+=30;assert.notEqual(observer.observe(t).event?.trigger,'trueBossStableBlocked');
 const result=createPilotController()(snapshot(g));assert.equal(result.portraitId,'bikkuri-02');assert.equal(result.line,'あ、こいつ、私たちの星には入れないのか…');
 g.viewport.width=1;g.viewport.height=1;assert.equal(snapshot(g).trueBoss.stableBlockedVisible,false);
});
