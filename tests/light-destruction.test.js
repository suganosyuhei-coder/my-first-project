import test from 'node:test';import assert from 'node:assert/strict';
import {drawDestruction} from '../src/prototype/DestructionEffects.js';
test('shared death effect uses only one ring and six sparks without blur or gradients',()=>{
 const calls=[];const ctx=new Proxy({},{get:(_,key)=>(...args)=>calls.push([key,...args]),set:(_,key,value)=>{assert.notEqual(key,'shadowBlur');return true;}});
 drawDestruction(ctx,{x:100,y:100},20,.5,1);
 assert.equal(calls.filter(c=>c[0]==='arc').length,1);assert.equal(calls.filter(c=>c[0]==='fillRect').length,6);assert.equal(calls.length,11);
 assert.ok(!calls.some(c=>String(c[0]).includes('Gradient')));
});
