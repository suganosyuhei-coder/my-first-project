import test from 'node:test';import assert from 'node:assert/strict';import {createGame} from '../src/prototype/game.js';import {stepRailgun,stepProjectiles,RAILGUN} from '../src/prototype/railgun.js';import {convergencePath,diffusionPath} from '../src/prototype/diffusion.js';
const fixture=()=>{const g=createGame({campaign:false,force:false});g.ship.parts=[];g.bits=[];g.hazards=[];g.enemies.units=[];return g;};
const press=(g,seconds)=>stepRailgun(g,[{type:'weapon-press'}],seconds),release=g=>stepRailgun(g,[{type:'weapon-release'}],0);
test('normal diffusion still fires before the extra hold; 2.8 seconds after blinking unlocks convergence',()=>{
 const g=fixture(),blink=RAILGUN.thresholds[3]*RAILGUN.baseChargeSeconds;press(g,blink);assert.equal(g.weapon.convergenceReady,false);stepRailgun(g,[],2.799);assert.equal(g.weapon.convergenceReady,false);stepRailgun(g,[],.001);assert.equal(g.weapon.convergenceReady,true);release(g);assert.equal(g.weapon.lastShot.stage,3);assert.equal(g.weapon.lastShot.converging,true);assert.equal(g.weapon.projectiles.length,9);assert.equal(g.weapon.lastShot.cost,64);assert.equal(g.weapon.convergenceReady,false);
 const n=fixture();press(n,3.6);release(n);assert.equal(n.weapon.lastShot.converging,false);assert.equal(n.weapon.projectiles.length,9);
});
test('each converging ray fans outward first and reaches the same centre in any ship heading',()=>{
 for(const heading of [0,Math.PI/2,.8]){const origin={x:50,y:80},paths=[-1.2,-.9,-.6,-.3,0,.3,.6,.9,1.2].map(offset=>convergencePath(origin,heading,offset));const end=paths[0].at(-1);for(const path of paths){assert.equal(path.length,49);assert.ok(Math.hypot(path.at(-1).x-end.x,path.at(-1).y-end.y)<1e-8);}assert.ok(Math.hypot(paths[0][24].x-paths[8][24].x,paths[0][24].y-paths[8][24].y)>100);}
 const normal=diffusionPath({x:0,y:0},0,1.2),converging=convergencePath({x:0,y:0},0,1.2);assert.ok(normal.at(-1).x>200);assert.equal(converging.at(-1).x,0);
});
test('convergence uses the actual swept curved paths and hits each target once per ray, with one focus effect',()=>{
 const g=fixture();press(g,7);release(g);const end=g.weapon.projectiles[0].path.at(-1),enemy={id:'focus',type:'commander',hp:10000,heading:0,position:{...end}};g.enemies.units=[enemy];for(let i=0;i<48;i++)stepProjectiles(g,1/60);assert.equal(g.weapon.projectiles.length,0);assert.equal(g.weapon.hits,9);assert.ok(enemy.hp<10000);assert.equal(g.weapon.effects.filter(e=>e.type==='convergence').length,1);const hp=enemy.hp;stepProjectiles(g,.5);assert.equal(enemy.hp,hp);
});
test('pause, blur/cancel, auto fire and lower charge never retain an armed convergence state',()=>{
 const g=fixture();press(g,7);assert.equal(g.weapon.convergenceReady,true);g.paused=true;const before={...g.weapon};stepRailgun(g,[],20);assert.equal(g.weapon.diffusionHeldSeconds,before.diffusionHeldSeconds);g.paused=false;stepRailgun(g,[{type:'weapon-cancel'}],0);assert.equal(g.weapon.convergenceReady,false);assert.equal(g.weapon.diffusionHeldSeconds,0);stepRailgun(g,[{type:'weapon-auto-toggle'}],.1);assert.equal(g.weapon.lastShot.stage,0);assert.equal(g.weapon.lastShot.converging,false);assert.equal(g.weapon.diffusionHeldSeconds,0);
});
