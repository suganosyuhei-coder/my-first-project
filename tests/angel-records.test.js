import test from 'node:test';import assert from 'node:assert/strict';
import {ANGEL_RECORD_KEY,ANGEL_RECORD_LIMIT,createAngelRecorder,validateAngelRecords,angelResultSummary} from '../src/prototype/angelRecords.js';
import {createGame,snapshot} from '../src/prototype/game.js';import {createPilotController} from '../src/prototype/pilotExpressions.js';
const timestamp='2026-10-13T12:00:00.000Z';
const storage=()=>{const values=new Map();return {writes:0,getItem:key=>values.get(key)??null,setItem(key,value){values.set(key,value);this.writes++;}};};
const finish=(distance=300,status='ended')=>{const g=createGame({campaign:false});g.status=status;g.flight.elapsed=45;g.score=400;g.enemies.kills=3;g.end={reason:status==='cleared'?'finalBoss':'impact',position:{x:100,y:-200},maxDistance:distance};return g;};
test('records only completed voyages, once each, and reloads exact terminal statistics',()=>{
 const s=storage(),r=createAngelRecorder(()=>s),running=createGame({campaign:false});assert.equal(r.record(running,timestamp),false);assert.equal(s.writes,0);
 const g=finish();assert.equal(r.record(g,timestamp),true);assert.equal(r.record(g,timestamp),false);assert.equal(s.writes,1);const saved=createAngelRecorder(()=>s).snapshot();assert.equal(saved.error,'');assert.deepEqual(saved.data.entries[0],{id:1,endedAt:timestamp,outcome:'ended',reason:'impact',position:{x:100,y:-200},maxDistance:300,elapsed:45,score:400,kills:3});
});
test('previous distance differs from best and best survives pruning of detailed records',()=>{
 const s=storage(),r=createAngelRecorder(()=>s);r.record(finish(9000),timestamp);for(let i=0;i<25;i++)r.record(finish(100+i,i===24?'cleared':'ended'),timestamp);
 const data=r.snapshot().data,summary=angelResultSummary(data);assert.equal(data.entries.length,ANGEL_RECORD_LIMIT);assert.equal(summary.totalFlights,26);assert.equal(summary.bestDistance,9000);assert.equal(summary.current.maxDistance,124);assert.equal(summary.previous.maxDistance,123);assert.equal(summary.current.outcome,'cleared');assert.equal(createAngelRecorder(()=>s).snapshot().data.bestDistance,9000);
});
test('corrupt, unsupported, nonfinite and malformed records are rejected without breaking flight',()=>{
 const s=storage(),r=createAngelRecorder(()=>s);r.record(finish(),timestamp);const valid=r.snapshot().data;
 for(const mutate of [v=>v.version=99,v=>v.totalFlights=-1,v=>v.bestDistance=Infinity,v=>v.entries[0].position.x=NaN,v=>v.entries[0].elapsed=-1,v=>v.entries[0].endedAt='bad',v=>v.entries.push({...v.entries[0]}),v=>v.entries[0].maxDistance=999]){const v=structuredClone(valid);mutate(v);assert.equal(validateAngelRecords(v),null);}
 s.setItem(ANGEL_RECORD_KEY,'{bad');const corrupted=createAngelRecorder(()=>s);assert.equal(corrupted.snapshot().data.totalFlights,0);assert.ok(corrupted.snapshot().error);assert.equal(corrupted.record(finish(),timestamp),true);
});
test('unavailable or full storage preserves session history and exposes a visible failure message',()=>{
 for(const provider of [()=>{throw new Error('blocked');},()=>({getItem:()=>null,setItem:()=>{throw new Error('full');}})]){const r=createAngelRecorder(provider);assert.equal(r.record(finish(),timestamp),true);assert.equal(r.snapshot().data.totalFlights,1);assert.ok(r.snapshot().error.includes('保存できません'));r.record(finish(400),timestamp);assert.equal(r.snapshot().data.totalFlights,2);}
});
test('records and game snapshots cannot mutate each other; Sue never receives prior-flight memory',()=>{
 const s=storage(),r=createAngelRecorder(()=>s),g=finish();const before=structuredClone(g.end);r.record(g,timestamp);const view=r.snapshot();view.data.entries[0].position.x=999;assert.equal(r.snapshot().data.entries[0].position.x,100);assert.deepEqual(g.end,before);
 const t=snapshot(createGame({campaign:false})),select=createPilotController();assert.equal(t.angelRecords,undefined);assert.equal(select(t).storyTrigger,'flightStart');
});
