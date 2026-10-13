import test from 'node:test';import assert from 'node:assert/strict';
import {PILOT_BLINK_ROWS,pilotBlinkFrame} from '../src/prototype/pilotBlink.js';
import {createExpressionTransition} from '../src/prototype/pilotTransitions.js';
test('all thirty native crops exclude sheet edges and use a fixed viewport without stretching',()=>{
 assert.equal(PILOT_BLINK_ROWS.length,3);for(const row of PILOT_BLINK_ROWS){assert.equal(row.length,10);for(const frame of row){const c=frame.crop;assert.ok(c.x>0&&c.y>0);assert.ok(c.x+c.width<c.sourceWidth);assert.ok(c.y+c.height<=c.sourceHeight);assert.equal(c.viewportWidth,224);assert.equal(c.viewportHeight,234);assert.equal(c.fit,'meet');}}
});
test('basic and worried blinks play all ten frames in order then return to open eyes',()=>{
 for(const [expression,start,period,row] of [['neutral',4.3,4.8,0],['worried',3.8,4.3,2]]){assert.equal(pilotBlinkFrame(expression,1).index,0);for(let i=0;i<10;i++)assert.equal(pilotBlinkFrame(expression,start+i*.05+.001),PILOT_BLINK_ROWS[row][i]);assert.equal(pilotBlinkFrame(expression,period+.01).index,0);assert.equal(pilotBlinkFrame(expression,start+.25,true).index,0);}
 assert.equal(pilotBlinkFrame('angry',4.5),null);assert.equal(pilotBlinkFrame('stoic',4.55),pilotBlinkFrame('neutral',4.55));
});
test('basic to worried plays middle row once, stays stable at unchanged time and yields to urgent expressions',()=>{
 const select=createExpressionTransition();select('neutral',0);for(let i=0;i<10;i++)assert.equal(select('worried',1+i*.06),PILOT_BLINK_ROWS[1][i]);assert.equal(select('worried',1.6),null);assert.equal(select('worried',5),null);select('neutral',6);assert.equal(select('worried',6.1).index,0);assert.equal(select('worried',6.1).index,0);assert.equal(select('pain',6.15),PILOT_PAIN_ROWS[0][0]);select('neutral',7);assert.equal(select('worried',8,true),null);
});
import {PILOT_SURPRISE_ROWS} from '../src/prototype/pilotBlink.js';
test('surprised blinking alternates the top and bottom ten-frame rows without replacing other expressions',()=>{
 for(const [start,row] of [[4.1,0],[8.7,2]])for(let i=0;i<10;i++)assert.equal(pilotBlinkFrame('surprised',start+i*.05+.001),PILOT_SURPRISE_ROWS[row][i]);
 assert.equal(pilotBlinkFrame('surprised',8.95,true),PILOT_SURPRISE_ROWS[0][0]);assert.equal(pilotBlinkFrame('neutral',4.55),PILOT_BLINK_ROWS[0][5]);
 for(const row of PILOT_SURPRISE_ROWS)for(const {crop:c} of row){assert.ok(c.x+c.width<c.sourceWidth);assert.ok(c.y+c.height<c.sourceHeight);assert.equal(c.viewportWidth,224);assert.equal(c.viewportHeight,234);}
});
test('worried to surprised uses middle row exactly once, and urgent reactions interrupt it',()=>{
 const select=createExpressionTransition();select('worried',0);select('worried',1);for(let i=0;i<10;i++)assert.equal(select('surprised',2+i*.06),PILOT_SURPRISE_ROWS[1][i]);assert.equal(select('surprised',2.6),null);assert.equal(select('surprised',6),null);
 select('worried',7);select('surprised',8);assert.equal(select('pain',8.1),null);select('worried',9);assert.equal(select('surprised',10,true),null);
});
import {PILOT_PAIN_ROWS} from '../src/prototype/pilotBlink.js';
test('pain uses all nine native frames in a smooth round trip and freezes in reduced motion',()=>{
 assert.equal(PILOT_PAIN_ROWS.length,3);for(const row of PILOT_PAIN_ROWS){assert.equal(row.length,9);for(const {crop:c} of row){assert.ok(c.x+c.width<c.sourceWidth);assert.ok(c.y+c.height<c.sourceHeight);assert.equal(c.fit,'meet');}}
 const order=[0,1,2,3,4,5,6,7,8,7,6,5,4,3,2,1,0];for(let i=0;i<order.length;i++)assert.equal(pilotBlinkFrame('pain',3.92+i*.04+.001),PILOT_PAIN_ROWS[2][order[i]]);assert.equal(pilotBlinkFrame('pain',4.3,true),PILOT_PAIN_ROWS[2][0]);
});
test('neutral and worried to pain use their separate nine-frame transitions exactly once',()=>{
 for(const [from,row] of [['neutral',1],['worried',0]]){const select=createExpressionTransition();select(from,0);select(from,1);for(let i=0;i<9;i++)assert.equal(select('pain',2+i*.06),PILOT_PAIN_ROWS[row][i]);assert.equal(select('pain',2.54),null);assert.equal(select('pain',8),null);}
});
import {PORTRAIT_VIEW,pilotPortraitGeometry} from '../src/prototype/pilotPortraitGeometry.js';
test('portrait display dimensions and per-sheet magnification remain fixed across every animation frame',()=>{
 assert.deepEqual(PORTRAIT_VIEW,{width:224,height:289.3});
 for(const sheet of [PILOT_BLINK_ROWS,PILOT_SURPRISE_ROWS,PILOT_PAIN_ROWS]){const scales=new Set();for(const row of sheet)for(const {crop:c} of row){const g=pilotPortraitGeometry(c),sx=g.image.width/c.sourceWidth,sy=g.image.height/c.sourceHeight;assert.ok(Math.abs(sx-sy)<1e-12);assert.equal(g.clip.y,0);assert.ok(g.clip.width<=224+1e-10);scales.add(sx);}assert.equal(scales.size,1);}
 assert.ok(PILOT_PAIN_ROWS.every(row=>row.every(frame=>frame.src.includes('pain-nine-user')&&frame.crop.sourceWidth===2172)));
});
