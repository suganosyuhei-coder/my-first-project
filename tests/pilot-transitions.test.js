import test from 'node:test';import assert from 'node:assert/strict';
import {PILOT_TRANSITIONS,createExpressionTransition} from '../src/prototype/pilotTransitions.js';
test('all registered transitions play their supplied ordered frames and then settle',()=>{
 assert.equal(Object.keys(PILOT_TRANSITIONS).length,13);
 for(const key of Object.keys(PILOT_TRANSITIONS)){const select=createExpressionTransition();assert.equal(select('neutral',0),null);const length=key==='worried'?10:key==='pain'?9:5,seconds=['worried','pain'].includes(key)?.06:.1;for(let i=0;i<length;i++){const frame=select(key,1+i*seconds);assert.equal(frame.index,i);assert.ok([1619,1672,2172,1983].includes(frame.crop.sourceWidth));assert.ok(frame.crop.x+frame.crop.width<=frame.crop.sourceWidth);assert.ok(frame.crop.y+frame.crop.height<=frame.crop.sourceHeight);}assert.equal(select(key,1+length*seconds),null);assert.equal(select(key,4),null);}
});
test('unchanged time freezes, urgent unrelated expression interrupts, reduced motion skips and only basic departure animates',()=>{
 const select=createExpressionTransition();assert.equal(select('thinking',0).index,0);assert.equal(select('thinking',.2).index,2);assert.equal(select('thinking',.2).index,2);assert.equal(select('pain',.22),null);assert.equal(select('worried',.3),null);select('neutral',.4);assert.equal(select('surprised',.5,true),null);assert.equal(select('surprised',.6),null);select('stoic',1);assert.equal(select('questioning',1.1).index,0);
});
