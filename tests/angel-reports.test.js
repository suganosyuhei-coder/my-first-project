import test from 'node:test';import assert from 'node:assert/strict';
import {ANGEL_REPORT_DIALOGUE,angelReports,contactReportCause} from '../src/prototype/angelReports.js';
import {createAngelRecorder,ANGEL_RECORD_KEY,validateAngelRecords} from '../src/prototype/angelRecords.js';
import {createGame} from '../src/prototype/game.js';import {applyContact} from '../src/prototype/damage.js';import {cellToWorld} from '../src/prototype/ship.js';import {launchBossAttack} from '../src/prototype/bossAttacks.js';
const state=(score=0)=>({status:'ended',score,end:{reason:'structural'}});
const memory=()=>{const map=new Map();return {writes:0,getItem:k=>map.get(k)??null,setItem(k,v){map.set(k,v);this.writes++;}};};
test('all supplied score, time, replay and cause lines are registered once with no invisible separators',()=>{
 assert.deepEqual(Object.values(ANGEL_REPORT_DIALOGUE).map(a=>a.length),[9,10,11,12]);for(const rows of Object.values(ANGEL_REPORT_DIALOGUE))for(const r of rows){assert.ok(r.line.endsWith('。'));assert.ok(!/[\u200b-\u200d\ufeff]/.test(r.line));}
 assert.equal(ANGEL_REPORT_DIALOGUE.scores[8].line,'センカハジュウブン。ツギノモクヒョウハ、アナタノキカンデス。');assert.equal(ANGEL_REPORT_DIALOGUE.retries.at(-1).line,'ナンドモドッテモ、キカンノランハアケテオキマス。');
});
test('each tier selects the highest reached threshold, including exact boundaries, and not every lower line',()=>{
 for(const [kind,rows] of [['score',ANGEL_REPORT_DIALOGUE.scores],['time',ANGEL_REPORT_DIALOGUE.hours],['retry',ANGEL_REPORT_DIALOGUE.retries]])for(const [i,row] of rows.entries()){
  const select=n=>angelReports(state(kind==='score'?n:0),{totalSeconds:kind==='time'?n*3600:0,replayCount:kind==='retry'?n:0}).filter(r=>r.id.startsWith(kind+'-'));
  assert.equal(select(row.threshold)[0].line,row.line);assert.equal(select(row.threshold+.1).length,1);assert.equal(select(row.threshold-.01)[0]?.line,rows[i-1]?.line);
 }
 assert.deepEqual(angelReports({...state(1200000),status:'running'},{totalSeconds:3600000,replayCount:10000}),[]);assert.deepEqual(angelReports({...state(1200000),status:'cleared'},{totalSeconds:3600000,replayCount:10000}),[]);
});
test('implemented causes display exactly one cause; fictional space-loss, dimension-wave and escape stay dormant',()=>{
 for(const row of ANGEL_REPORT_DIALOGUE.causes){const reports=angelReports({...state(),end:{reason:'structural',reportCause:row.flag}},{});assert.equal(reports.length,row.implemented?1:0);if(row.implemented)assert.equal(reports[0].line,row.line);}
 assert.equal(angelReports({...state(),end:{reason:'vital',reportCause:'finalBossAttack'}},{})[0].id,'cause-vital');assert.equal(contactReportCause({type:'dustContact'}),null);
});
test('fatal contacts retain real attacker identity and distinguish PAW, ordinary, boss, rock and heat',()=>{
 for(const [event,expected] of [[{type:'enemyAttack',enemyType:'pow',source:'敵機との接触'},'pawContact'],[{type:'enemyAttack',enemyType:'gunner'},'enemyAttack'],[{type:'enemyAttack',enemyType:'miniboss'},'minibossAttack'],[{type:'enemyAttack',enemyType:'finalBoss'},'finalBossAttack'],[{type:'impact'},'naturalContact'],[{type:'nebulaContact'},'heat']]){
  const g=createGame({campaign:false,force:false});g.ship.parts=[];const core=g.ship.cells.find(c=>c.role==='core');g.ship.critical.core=1;applyContact(g,{...event,position:cellToWorld(core,g.flight),damage:100});assert.equal(g.status,'ended');assert.equal(g.end.reportCause,expected);assert.equal(angelReports(g,{})[0].id,'cause-'+expected);
 }
 const shots={shots:[],nextShot:1};launchBossAttack(shots,{type:'finalBoss',position:{x:0,y:0},heading:0},{shootRange:500,damage:10,shotSpeed:100},1);assert.equal(shots.shots[0].enemyType,'finalBoss');
});
test('playtime checkpoints save incomplete flights, final recording never double-counts, and replay counts button presses once',()=>{
 const store=memory(),r=createAngelRecorder(()=>store),g=createGame();g.flight.elapsed=29;assert.equal(r.accumulate(g),false);assert.equal(store.writes,0);r.accumulate(g);assert.equal(r.snapshot().data.totalSeconds,29);g.flight.elapsed=30;assert.equal(r.accumulate(g),true);assert.equal(store.writes,1);g.flight.elapsed=35;r.accumulate(g);r.flush();assert.equal(createAngelRecorder(()=>store).snapshot().data.totalSeconds,35);
 g.status='ended';g.end={reason:'vital',position:{x:0,y:0},maxDistance:10};r.record(g);r.accumulate(g);r.record(g);assert.equal(r.snapshot().data.totalSeconds,35);assert.equal(r.snapshot().data.replayCount,0);assert.equal(r.replay(g),true);assert.equal(r.replay(g),false);assert.equal(createAngelRecorder(()=>store).snapshot().data.replayCount,1);assert.equal(r.replay(createGame()),false);
});
test('v1 migration keeps records, sums known durations and flags missing old time without inventing replay counts',()=>{
 const store=memory(),r=createAngelRecorder(()=>store),g=createGame();g.flight.elapsed=100;g.status='ended';g.end={reason:'vital',position:{x:0,y:0},maxDistance:10};r.record(g);const old=r.snapshot().data;old.version=1;old.totalFlights=25;delete old.totalSeconds;delete old.replayCount;delete old.timeIncomplete;store.setItem(ANGEL_RECORD_KEY,JSON.stringify(old));const migrated=createAngelRecorder(()=>store).snapshot().data;assert.equal(migrated.version,2);assert.equal(migrated.totalSeconds,100);assert.equal(migrated.replayCount,0);assert.equal(migrated.timeIncomplete,true);assert.equal(migrated.entries[0].maxDistance,10);
 for(const value of [-1,NaN,Infinity]){const bad={...migrated,totalSeconds:value};assert.equal(validateAngelRecords(bad),null);}assert.equal(validateAngelRecords({...migrated,replayCount:1.5}),null);
});
