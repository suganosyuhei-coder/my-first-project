import {createEquippedGame} from './helpers/equippedGame.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createGame} from '../src/prototype/game.js';
import {stepCollection} from '../src/prototype/collection.js';
import {stepProjectiles,stepRailgun} from '../src/prototype/railgun.js';

test('orbiting and returning bits keep up with fast moving ship and credit cargo once',()=>{
 const g=createEquippedGame({campaign:false});g.flight.velocity={x:600,y:-800};
 for(let i=0;i<180;i++){g.flight.position.x+=10;g.flight.position.y-=800/60;g.flight.elapsed+=1/60;stepCollection(g,1/60);for(const b of g.bits)assert.ok(Math.hypot(b.position.x-g.flight.position.x,b.position.y-g.flight.position.y)<=62.01);}
 const b=g.bits[0];b.state='returning';b.jobId='fast';b.position.x-=300;
 g.jobs=[{id:'fast',type:'wire',resourceId:'cargo',bitIds:[b.id],stage:'returning',cargo:true,credited:false,startedAt:g.flight.elapsed}];const before=g.inventory.wire??0;
 for(let i=0;i<600&&g.jobs[0].stage!=='complete';i++){g.flight.position.x+=10;g.flight.position.y-=800/60;g.flight.elapsed+=1/60;stepCollection(g,1/60);}
 assert.equal(g.jobs[0].stage,'complete');assert.equal(g.inventory.wire,before+1);stepCollection(g,1/60);assert.equal(g.inventory.wire,before+1);
});

test('charged beams pierce multiple rocks and enemies, full range visual, one hit per target',()=>{
 for(const force of [false,true])for(const charge of [1.2,2.4]){
 const g=createEquippedGame({force,campaign:false});g.hazards=[];g.enemies.units=[];g.ship.parts.find(p=>p.type==='tank').stored=160;
 stepRailgun(g,[{type:'weapon-press'}],charge);stepRailgun(g,[{type:'weapon-release'}],0);const shot=g.weapon.projectiles[0],y=shot.origin.y;
 g.hazards=[100,250].map((d,i)=>({id:`rock${i}`,type:'obstacle',radius:5,position:{x:0,y:y-d}}));
 g.enemies.units=[150,350].map((d,i)=>({id:`enemy${i}`,type:'soldier',hp:10000,position:{x:0,y:y-d},heading:0}));
 stepProjectiles(g,1/60);assert.equal(g.destroyedRocks.size,2);assert.equal(g.weapon.hits,4);assert.ok(g.enemies.units.every(e=>e.hp===10000-shot.damage));
 assert.equal(g.weapon.effects.find(e=>e.type==='beam').end.y,y-shot.remaining);stepProjectiles(g,1/60);assert.equal(g.weapon.hits,4);
 }
});
