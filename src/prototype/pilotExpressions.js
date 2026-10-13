import {createPilotStoryObserver,candidateStoryTrigger} from './pilotStory.js';
import {pilotWarning} from './pilotWarnings.js';
import dialogue from './pilotDialogue.json' with {type:'json'};
// Presentation-only configuration. Change expression assignments here without
// touching flight, collection or energy logic. Individual images override sheet.
export const PILOT_SHEET = {
  src: new URL('../assets/pilot/expressions-user-v3.png', import.meta.url).href,
  columns: 7,
  rows: 3,
  aspectRatio: '1 / 1',
};
// Pixel bounds omit the screenshot borders, gutters and Japanese caption rows.
export const PILOT_CROPS=Array.from({length:21},(_,i)=>{const xs=[[5,204],[222,418],[436,632],[653,849],[870,1069],[1088,1285],[1310,1510]],ys=[[5,262],[332,590],[656,900]],[x,right]=xs[i%7],[y,bottom]=ys[Math.floor(i/7)];return {x,y,width:right-x,height:bottom-y,sourceWidth:1520,sourceHeight:954};});
export const PILOT_EXPRESSIONS = Object.fromEntries(Object.entries(dialogue.expressions).map(([key,value])=>[key,{...value,crop:PILOT_CROPS[value.frame]}]));
// Ordered JSON conditions choose both the pose and dialogue. First match wins.
export const PILOT_ACTIONS = dialogue.actions;
export const PILOT_TUNING = dialogue.tuning;

export const PILOT_SCENES = dialogue.scenes;
const animatedSheet = new URL('../assets/pilot/expressions-animated-user.png', import.meta.url).href;
const extraSheet = new URL('../assets/pilot/expressions-extra-user.png', import.meta.url).href;
// Bounds refer to image content only, excluding labels and panel borders.
const rows = [
  {y:61,bottom:221,groups:[[7,354],[373,733],[755,1100],[1119,1460]],keys:['neutral','worried','determined','surprised']},
  {y:286,bottom:437,groups:[[7,295],[312,581],[597,878],[897,1183],[1200,1460]],keys:['hesitant','thinking','alert','angry','pain']},
  {y:501,bottom:652,groups:[[7,304],[322,585],[607,879],[901,1183],[1202,1460]],keys:['tired','selfMocking','sneer','softSmile','satisfied']},
  {y:721,bottom:875,groups:[[7,296],[314,585],[606,882],[903,1184],[1203,1460]],keys:['sad','embarrassed','averted','admiring','blink']},
];
for (const row of rows) row.keys.forEach((key,i)=>{
  const [left,right]=row.groups[i],step=(right-left)/3;
  PILOT_EXPRESSIONS[key]={...PILOT_EXPRESSIONS[key],src:animatedSheet,frames:Array.from({length:3},(_,n)=>({x:left+step*n+2,y:row.y,width:step-4,height:row.bottom-row.y,sourceWidth:1466,sourceHeight:880}))};
});
PILOT_EXPRESSIONS.smile={...PILOT_EXPRESSIONS.softSmile,label:'微笑み'};
// Preserve the supplied additional poses, including their naming on the sheet.
for(const [key,column,row] of [['confused',0,0],['questioning',1,0],['panicked',1,1],['shaken',2,1],['tearful',3,1],['shocked',0,2],['stoic',1,2]]){
  PILOT_EXPRESSIONS[key]={...PILOT_EXPRESSIONS[key],src:extraSheet,crop:{x:[3,174,348,522][column],y:[8,289,566][row],width:154,height:[221,215,208][row],sourceWidth:684,sourceHeight:818}};
}

// Full-resolution supplied sheets override matching low-resolution poses.
// Coordinates below use the reference preview, then scale to the original PNG.
function highResolutionPose(key,sheet,bounds,preview,source){
 const [x,y,width,height]=bounds,[pw,ph]=preview,[sourceWidth,sourceHeight]=source;
 PILOT_EXPRESSIONS[key]={...PILOT_EXPRESSIONS[key],frames:undefined,src:sheet,crop:{x:x*sourceWidth/pw,y:y*sourceHeight/ph,width:width*sourceWidth/pw,height:height*sourceHeight/ph,sourceWidth,sourceHeight}};
}
const highMain=new URL('../assets/pilot/expressions-hires-main.png',import.meta.url).href;
const highEnd=new URL('../assets/pilot/expressions-hires-end.png',import.meta.url).href;
const highExtra=new URL('../assets/pilot/expressions-hires-extra.png',import.meta.url).href;
const highBlink=new URL('../assets/pilot/expressions-hires-blink.png',import.meta.url).href;
const mainXs=[5,296,585,876,1169,1462,1761];
['neutral','worried','surprised','thinking','confused','questioning','averted','sad','embarrassed','smile','wrySmile','wink','panicked','shaken'].forEach((key,i)=>{
 highResolutionPose(key,highMain,[mainXs[i%7],i<7?5:444,268,i<7?348:352],[2048,867],[3110,1316]);
});
['exasperated','determined','lonely','eyesClosed','shocked','tearful','stoic'].forEach((key,i)=>{
 highResolutionPose(key,highEnd,[[10,304,594,884,1176,1472,1768][i],14,270,330],[2048,412],[3110,626]);
});
// Alternate large supplied poses are used for questioning and side glances.
for(const [key,i] of [['confused',4],['questioning',5],['averted',6]])highResolutionPose(key,highExtra,[[5,262,518,775,1029,1285,1541,1800][i],8,234,326],[2048,818],[3090,1234]);
highResolutionPose('blinkHalf',highBlink,[1546,10,234,307],[2048,396],[3080,596]);
highResolutionPose('blinkClosed',highBlink,[1807,10,234,307],[2048,396],[3080,596]);
PILOT_EXPRESSIONS.blink={...PILOT_EXPRESSIONS.neutral,frames:[PILOT_EXPRESSIONS.neutral.crop,PILOT_EXPRESSIONS.blinkHalf.crop,PILOT_EXPRESSIONS.blinkClosed.crop],frameSources:[highMain,highBlink,highBlink]};

// Prefer full-width static portraits when a motion panel requires excessive cropping.
function suppliedMotion(sheet,preview,source,groups,y,bottom,keys){
 const [pw,ph]=preview,[sourceWidth,sourceHeight]=source;
 keys.forEach((key,i)=>{
  const [left,right]=groups[i],step=(right-left)/3;
  const frames=Array.from({length:3},(_,n)=>({x:(left+n*step+3)*sourceWidth/pw,y:y*sourceHeight/ph,width:(step-6)*sourceWidth/pw,height:(bottom-y)*sourceHeight/ph,sourceWidth,sourceHeight}));
  const suitable=frames.every(c=>c.width/c.height>=.64);
  const existing=PILOT_EXPRESSIONS[key];
  if(suitable)PILOT_EXPRESSIONS[key]={...existing,src:sheet,frames,frameSources:undefined};
  else if(!existing.src?.includes('hires'))PILOT_EXPRESSIONS[key]={...existing,src:sheet,crop:frames[1],frames:undefined,frameSources:undefined};
 });
}
const motionMain=new URL('../assets/pilot/expressions-motion-main.png',import.meta.url).href;
const motionEmotion=new URL('../assets/pilot/expressions-motion-emotion.png',import.meta.url).href;
const motionScenes=new URL('../assets/pilot/expressions-motion-scenes.png',import.meta.url).href;
const motionBlink=new URL('../assets/pilot/expressions-motion-blink.png',import.meta.url).href;
suppliedMotion(motionMain,[2048,663],[3128,1012],[[4,449],[475,850],[878,1241],[1265,1651],[1678,2043]],75,314,['neutral','worried','surprised','confused','thinking']);
suppliedMotion(motionMain,[2048,663],[3128,1012],[[4,384],[408,818],[844,1241],[1265,1651],[1678,2043]],410,653,['averted','blink','smile','wink','embarrassed']);
suppliedMotion(motionEmotion,[2048,332],[3132,508],[[6,385],[413,801],[828,1223],[1249,1653],[1677,2042]],73,319,['sad','pain','angry','sneer','satisfied']);
suppliedMotion(motionScenes,[2048,909],[2964,1316],[[5,486],[518,1024],[1057,1538],[1568,2042]],74,296,['neutral','worried','determined','surprised']);
suppliedMotion(motionScenes,[2048,909],[2964,1316],[[5,405],[434,808],[835,1227],[1255,1653],[1679,2042]],391,596,['hesitant','thinking','alert','angry','pain']);
suppliedMotion(motionScenes,[2048,909],[2964,1316],[[5,416],[444,808],[838,1227],[1257,1653],[1681,2042]],693,900,['tired','selfMocking','sneer','softSmile','satisfied']);
suppliedMotion(motionBlink,[2048,299],[2960,432],[[4,405],[433,817],[846,1234],[1259,1667]],79,293,['sad','embarrassed','averted','admiring']);
// Narrow-only scene poses fall back to a nearby full-width supplied portrait.
for(const [key,fallback] of Object.entries({pain:'eyesClosed',angry:'determined',sneer:'wrySmile',satisfied:'smile',alert:'determined',tired:'lonely',selfMocking:'wrySmile',softSmile:'smile',hesitant:'confused',admiring:'smile'})){
 const label=PILOT_EXPRESSIONS[key].label,base=PILOT_EXPRESSIONS[fallback];
 PILOT_EXPRESSIONS[key]={...base,label,frames:undefined,frameSources:undefined};
 // A motion-capable fallback still retains its original full-width static crop.
 if(base.frames)PILOT_EXPRESSIONS[key].src=highEnd;
}
// Use the large full-width blink frames to avoid head-size changes during blinking.
PILOT_EXPRESSIONS.blink={...PILOT_EXPRESSIONS.blink,src:highMain,frames:[PILOT_EXPRESSIONS.neutral.crop,PILOT_EXPRESSIONS.blinkHalf.crop,PILOT_EXPRESSIONS.blinkClosed.crop],frameSources:[highMain,highBlink,highBlink]};

// Latest user-approved sheet takes precedence over every older matching pose.
const prioritySheet=new URL('../assets/pilot/expressions-priority-user.png',import.meta.url).href;
const priorityKeys=[
 'neutral','worried','surprised','confused','thinking','averted','questioning','sad','embarrassed','smile',
 'wrySmile','wink','panicked','shaken','exasperated','determined','lonely','eyesClosed','shocked','tearful',
 'angry','sneer','distrustful','alert','tired','relieved','admiring','selfMocking','pain','satisfied',
];
const priorityXs=[12,214,407,605,802,1001,1198,1396,1595,1790];
priorityKeys.forEach((key,i)=>{
 const row=Math.floor(i/10),y=[12,281,538][row],bottom=[233,491,752][row];
 PILOT_EXPRESSIONS[key]={...PILOT_EXPRESSIONS[key],label:PILOT_EXPRESSIONS[key]?.label??({distrustful:'不信',relieved:'安心'}[key]),src:prioritySheet,frames:undefined,frameSources:undefined,crop:{x:priorityXs[i%10],y,width:182,height:bottom-y,sourceWidth:1983,sourceHeight:793}};
});
for(const [key,fallback] of Object.entries({stoic:'neutral',softSmile:'relieved',hesitant:'confused'}))PILOT_EXPRESSIONS[key]={...PILOT_EXPRESSIONS[fallback],label:PILOT_EXPRESSIONS[key].label};
// This sheet supplies open and closed eyes; use them for a brief blink without
// mixing older art or treating unrelated expressions as speech animation frames.
PILOT_EXPRESSIONS.blink={...PILOT_EXPRESSIONS.neutral,frames:[PILOT_EXPRESSIONS.neutral.crop,{...PILOT_EXPRESSIONS.eyesClosed.crop},{...PILOT_EXPRESSIONS.eyesClosed.crop}],frameSources:undefined};

export function pilotFrame(expression, seconds, speaking = false) {
  if(!expression.frames)return expression.crop;
  // Brief blink followed by a long open-eyed rest; speech poses have gentle beats.
  const phase=((seconds%4.8)+4.8)%4.8;
  const index=expression===PILOT_EXPRESSIONS.blink ? (phase<4.44?0:phase<4.56?1:phase<4.68?2:1)
    :speaking?[0,1,2,1][Math.floor(seconds/.22)%4]:0;
  return expression.frames[index];
}

export function createPilotController(actions = PILOT_ACTIONS) {
  let storyObserver=createPilotStoryObserver();
  let previous=null,enemySeconds=0,encounters=0,wasThreat=false,lastDamage=-Infinity;
  let active=null,serial=0,idleIndex=0,lastIdle=-Infinity,seenFleet=false,vitalRecoveryUntil=-Infinity;
  const lineIndexes={},seenBosses=new Set(),seenPows=new Set();
  const duration=line=>Math.max(PILOT_TUNING.minimumLineSeconds,Array.from(line).length/PILOT_TUNING.charactersPerSecond+PILOT_TUNING.lineRestSeconds);
  const make=(id,scene,priority,time,overrides={})=>{
    const config=PILOT_SCENES[scene],index=lineIndexes[scene]??0;
    lineIndexes[scene]=index+1;
    const line=overrides.line??config?.lines[index%config.lines.length]??'航路を確認中……。';
    return {id,scene,expression:config?.expression??'neutral',label:config?.label,line,priority,startedAt:time,until:time+duration(line),serial:++serial,...overrides};
  };
  return t=>{
    const time=t.flight.elapsed;
    if(previous&&(time<previous.time||(time===0&&previous.time!==0))){
      storyObserver=createPilotStoryObserver();
      previous=null;active=null;enemySeconds=0;encounters=0;wasThreat=false;lastDamage=-Infinity;idleIndex=0;lastIdle=-Infinity;seenFleet=false;vitalRecoveryUntil=-Infinity;
      seenBosses.clear();seenPows.clear();for(const key of Object.keys(lineIndexes))delete lineIndexes[key];
    }
    const units=t.enemies?.units??[],visible=units.filter(e=>e.hp>0&&e.detected),threat=visible.some(e=>e.type!=='pow');
    const hp=new Map([...t.ship.cells.map(c=>[`cell:${c.x},${c.y}`,c.hp]),...t.ship.parts.map(p=>[`part:${p.id}`,p.hp])]);
    const inventory=Object.values(t.inventory).reduce((n,v)=>n+(Number.isFinite(v)?v:0),0)+(t.recoveredCount??0);
    const parts=new Set(t.ship.parts.filter(p=>p.hp>0&&p.type!=='pipe').map(p=>p.id));
    const analyzed=new Set(t.nebula.observations.filter(r=>r.state==='analyzed').map(r=>r.id));
    const damage=previous&&[...hp].some(([id,value])=>previous.hp.has(id)&&value<previous.hp.get(id));
    if(damage)lastDamage=time;
    if(threat&&!wasThreat)encounters++;
    if(threat&&wasThreat&&previous)enemySeconds+=Math.max(0,time-previous.time);
    const accustomed=enemySeconds>=PILOT_TUNING.enemyFamiliarSeconds||encounters>=PILOT_TUNING.enemyFamiliarEncounters;
    const newBoss=visible.find(e=>['miniboss','finalBoss'].includes(e.type)&&!seenBosses.has(e.id));
    const newPow=visible.find(e=>e.type==='pow'&&!seenPows.has(e.id));
    const selection=t.nebula.observations.find(r=>r.id===t.nebula.selected),analyzing=selection&&selection.state!=='analyzed';
    if(previous&&(t.vital?.recoveries??0)>previous.vitalRecoveries)vitalRecoveryUntil=time+10;
    const events={damage,fired:previous&&t.weapon.shots>previous.shots,recovered:previous&&inventory>previous.inventory,
      analyzed:previous&&[...analyzed].some(id=>!previous.analyzed.has(id)),
      upgrade:previous&&[...parts].some(id=>!previous.parts.has(id)),
      multiKill:previous&&(t.weapon.diffusionMultiKills??0)>previous.multiKills,
      afterBattle:wasThreat&&!threat,
    };
    const states={cleared:t.status==='cleared',ended:t.status==='ended',danger:Math.min(t.ship.critical.canopy,t.ship.critical.core)<=PILOT_TUNING.criticalWarningHp,
      boosting:t.boost.remaining>0,charging:t.weapon.holding,boostCharging:t.boost.holding,
      analyzing:analyzing&&t.nebula.observableIds.includes(selection.id),analysisPaused:analyzing&&!t.nebula.observableIds.includes(selection.id),
      collecting:t.jobs.some(j=>!['complete','cancelled'].includes(j.stage)),enemyHappy:threat&&accustomed,enemyThreat:threat&&!accustomed,cruising:true};
    const warning=pilotWarning(t);
    let candidate;
    if(states.cleared||states.ended){const id=states.cleared?'cleared':'ended';candidate={...actions.find(a=>a.id===id),priority:100,...(t.end?.reason==='overload'?{expression:'shocked',line:'……機体が、もたない。'}:{})};}
    else if(warning&&warning.type==='vital'&&time<vitalRecoveryUntil&&!damage)candidate={id:'vitalRecovered',expression:'relieved',line:'……少し、落ち着いた。',priority:99,until:time+1.5};
    else if(warning)candidate=warning;
    else if(damage)candidate={id:'damage',scene:'pain',priority:90};
    else if(states.danger)candidate={id:'danger',scene:'danger',priority:85};
    else if(newBoss)candidate={id:'boss',scene:'boss',priority:75};
    else if(events.multiKill)candidate={id:'multiKill',scene:'multiKill',priority:70};
    else if(events.fired&&time-lastDamage<12)candidate={id:'counter',scene:'counter',priority:65};
    else if(time<vitalRecoveryUntil)candidate={id:'vitalRecovered',expression:'relieved',line:'……少し、落ち着いた。',priority:62};
    else if(events.upgrade)candidate={id:'upgraded',scene:(lineIndexes.upgraded??0)%2?'part':'upgrade',priority:60};
    else if(newPow)candidate={id:'pow',scene:'pow',priority:55};
    else if(events.afterBattle)candidate={id:'afterBattle',scene:'afterBattle',priority:50};
    else if(threat&&visible.some(e=>e.type==='guard'||e.siteId?.startsWith('home'))&&!seenFleet)candidate={id:'mainFleet',scene:'mainFleet',priority:45};
    else if(actions===PILOT_ACTIONS&&!previous&&!threat&&time<4)candidate={id:'departure',scene:'departure',priority:20};
    else {
      const action=actions.find(a=>a.seconds?events[a.condition??a.id]:states[a.condition??a.id]);
      candidate={...action,priority:action?.seconds?40:10};
      if(candidate.id==='cruising'&&time>=30&&time-lastIdle>=PILOT_TUNING.idleIntervalSeconds&&(!active||time>=active.until)){
        const scenes=['idle','search','human','age','limbs','bydo'];
        if((t.nebula.observableIds?.length??0)>0)scenes.push('nebula');
        candidate={id:'monologue',scene:scenes[idleIndex++%scenes.length],priority:15};lastIdle=time;
      }
    }
    const storyContext=storyObserver.observe(t),storyEvent=storyContext.event;
    if(t.status==='running'&&storyEvent&&storyEvent.priority>(candidate.priority??0)&&!warning&&(!(storyEvent.ambient||['nebulaVisible','quietFlight','quietAfterBattle','cleanSegment','powMemory','unfamiliarSpace','familiarRoute','nebulaAfterBattle','nebulaRevisited','pawLostSight','postBattleCheck'].includes(storyEvent.trigger))||['cruising','monologue'].includes(candidate.id)))candidate={id:`story-${storyEvent.trigger}`,scene:'story',priority:storyEvent.priority,storyTrigger:storyEvent.trigger};
    const storyTrigger=candidateStoryTrigger(candidate,storyContext),story=storyObserver.select(storyTrigger,time,storyContext);
    // Keep full sentences on screen. Higher-priority danger may interrupt them.
    const terminal=active&&['cleared','ended'].includes(active.id)&&active.id===candidate.id;
    if(!terminal&&(!active||time>=active.until||candidate.priority>active.priority&&candidate.id!==active.id||active.id?.startsWith('warning-')&&active.id!==candidate.id)){
      const scene=candidate.scene??candidate.id;
      active=make(candidate.id,scene,candidate.priority,time,{...(candidate.expression?{expression:candidate.expression}:{}),...(story?{line:story.line,portraitId:story.portrait,storyTrigger:story.trigger}:!PILOT_SCENES[scene]?{line:candidate.line}: {}),...(candidate.until?{until:candidate.until}:{}),...(candidate.label?{label:candidate.label}:{})});
      if(story)storyObserver.accepted(story.trigger,time);
      if(active.id==='vitalRecovered')vitalRecoveryUntil=-Infinity;
      if(active.id==='boss')seenBosses.add(newBoss.id);
      if(active.id==='pow')seenPows.add(newPow.id);
      if(active.id==='mainFleet')seenFleet=true;
      if(active.id==='upgraded')lineIndexes.upgraded=(lineIndexes.upgraded??0)+1;
    }
    previous={vitalRecoveries:t.vital?.recoveries??0,time,hp,inventory,parts,analyzed,shots:t.weapon.shots,multiKills:t.weapon.diffusionMultiKills??0};wasThreat=threat;
    return active;
  };
}
