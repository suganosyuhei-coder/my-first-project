// Angel Pack records are result-screen data, never pilot memory or simulation input.
export const ANGEL_RECORD_KEY='shutle.angel.flight-history.v1';
export const ANGEL_RECORD_LIMIT=20;
const empty=()=>({version:2,totalFlights:0,bestDistance:0,totalSeconds:0,replayCount:0,timeIncomplete:false,entries:[]});
const nonnegative=n=>Number.isFinite(n)&&n>=0;
const coordinate=n=>Number.isFinite(n);
export function validateAngelRecords(value){
 if(!value||![1,2].includes(value.version)||!Number.isSafeInteger(value.totalFlights)||value.totalFlights<0||!nonnegative(value.bestDistance)||!Array.isArray(value.entries)||value.entries.length>ANGEL_RECORD_LIMIT||value.totalFlights<value.entries.length)return null;
 if(value.version===2&&(!nonnegative(value.totalSeconds)||!Number.isSafeInteger(value.replayCount)||value.replayCount<0||typeof value.timeIncomplete!=='boolean'))return null;
 const ids=new Set();
 for(const e of value.entries){
  if(!e||!Number.isSafeInteger(e.id)||e.id<1||e.id>value.totalFlights||ids.has(e.id)||!['ended','cleared'].includes(e.outcome)||typeof e.reason!=='string'||e.reason.length>64||typeof e.endedAt!=='string'||!Number.isFinite(Date.parse(e.endedAt))||![e.maxDistance,e.elapsed,e.score,e.kills].every(nonnegative)||!coordinate(e.position?.x)||!coordinate(e.position?.y)||e.maxDistance>value.bestDistance)return null;
  if(e.reportCause!==undefined&&(typeof e.reportCause!=='string'||e.reportCause.length>64))return null;
  ids.add(e.id);
 }
 if(value.entries.some((e,i)=>i>0&&e.id>=value.entries[i-1].id))return null;
 return {version:2,totalFlights:value.totalFlights,bestDistance:value.bestDistance,totalSeconds:value.version===1?value.entries.reduce((sum,e)=>sum+e.elapsed,0):value.totalSeconds,replayCount:value.version===1?0:value.replayCount,timeIncomplete:value.version===1?value.totalFlights>value.entries.length:value.timeIncomplete,entries:value.entries.map(e=>({id:e.id,endedAt:e.endedAt,outcome:e.outcome,reason:e.reason,...(e.reportCause?{reportCause:e.reportCause}:{}),maxDistance:e.maxDistance,elapsed:e.elapsed,score:e.score,kills:e.kills,position:{x:e.position.x,y:e.position.y}}))};
}
export function createAngelRecorder(storageProvider=()=>window.localStorage){
 let data=empty(),error='';const recorded=new WeakSet(),replayed=new WeakSet(),clocks=new WeakMap();let savedSeconds=0,dirty=false;
 try{
  const raw=storageProvider().getItem(ANGEL_RECORD_KEY);
  if(raw!==null){const loaded=validateAngelRecords(JSON.parse(raw));if(!loaded)throw new Error('invalid record');data=loaded;}
 }catch{error='航行記録を読み込めませんでした。この起動中の記録は保持します。';}
 savedSeconds=data.totalSeconds;
 const accumulate=game=>{const current=game.flight.elapsed;if(!nonnegative(current))return;const before=clocks.get(game)??0;const delta=Math.max(0,current-before);clocks.set(game,current);if(delta>0){data.totalSeconds+=delta;dirty=true;}};
 const flush=()=>{if(!dirty)return false;savedSeconds=data.totalSeconds;dirty=false;try{storageProvider().setItem(ANGEL_RECORD_KEY,JSON.stringify(data));error='';}catch{error='航行記録を保存できませんでした。この起動中は保持しますが、再読み込みで失われる場合があります。';}return true;};
 return {
  accumulate(game){if(recorded.has(game))return false;accumulate(game);return data.totalSeconds-savedSeconds>=30?flush():false;},
  flush,
  replay(game){if(!['ended','cleared'].includes(game.status)||replayed.has(game))return false;replayed.add(game);data.replayCount++;dirty=true;flush();return true;},
  snapshot(){return {data:structuredClone(data),error};},
  record(game,endedAt=new Date().toISOString()){
   if(!['ended','cleared'].includes(game.status)||!game.end||game.end.continuable||recorded.has(game))return false;
   accumulate(game);
   const end=game.end,entry={id:data.totalFlights+1,endedAt,outcome:game.status,reason:end.reason??'unknown',...(end.reportCause?{reportCause:end.reportCause}:{}),maxDistance:end.maxDistance,elapsed:game.flight.elapsed,score:game.score??0,kills:game.campaign?.defeated??game.enemies?.kills??0,position:{...end.position}};
   const next={...data,version:2,totalFlights:entry.id,bestDistance:Math.max(data.bestDistance,entry.maxDistance),entries:[entry,...data.entries].slice(0,ANGEL_RECORD_LIMIT)};
   if(!validateAngelRecords(next)){error='今回の航行記録を作成できませんでした。';return false;}
   recorded.add(game);data=next;
   dirty=true;flush();
   return true;
  },
 };
}
export function angelResultSummary(records){
 return {current:records?.entries?.[0]??null,previous:records?.entries?.[1]??null,bestDistance:records?.bestDistance??0,totalFlights:records?.totalFlights??0};
}
