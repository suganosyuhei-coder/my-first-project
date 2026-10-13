import test from 'node:test';import assert from 'node:assert/strict';
import {PILOT_STORY_LINES,storyLine,createPilotStoryObserver,candidateStoryTrigger} from '../src/prototype/pilotStory.js';import {createPilotController} from '../src/prototype/pilotExpressions.js';import {SUPPLIED_PORTRAITS,suppliedPilotPortrait} from '../src/prototype/pilotSuppliedPortraits.js';import {createGame,snapshot} from '../src/prototype/game.js';import {enemyReward} from '../src/prototype/spaceLoot.js';
const state=()=>{const t=snapshot(createGame({campaign:false}));t.flight.elapsed=10;t.nebula.observableIds=[];return t;};
test('all 174 exact lines pin registered portraits; unimplemented situations remain inactive',()=>{
 assert.equal(PILOT_STORY_LINES.length,174);assert.equal(new Set(PILOT_STORY_LINES.map(l=>l.trigger)).size,174);assert.equal(PILOT_STORY_LINES.filter(l=>!l.enabled).length,34);const ids=new Set(Object.values(SUPPLIED_PORTRAITS).map(p=>p.id));for(const l of PILOT_STORY_LINES){assert.ok(ids.has(l.portrait));assert.ok(l.line.length>=9);assert.equal(suppliedPilotPortrait({portraitId:l.portrait,line:l.line}).id,l.portrait);}for(const trigger of ['previousHitPosition','previousFailureCleared','passageEscape','newRecord','enemyDodged'])assert.equal(storyLine(trigger),null);
});
test('departure and clear use supplied exact lines and images; damage still interrupts, retries reset history',()=>{
 const t=state(),select=createPilotController();t.flight.elapsed=0;let a=select(t);assert.equal(a.line,'エンジェルさん、機体は大丈夫そう。……あとは私ね。');assert.equal(a.portraitId,'normal-01');t.flight.elapsed=1;t.ship.cells[0].hp=90;assert.equal(select(t).id,'damage');t.status='cleared';a=select(t);assert.equal(a.line,storyLine('bossDefeated').line);assert.equal(a.portraitId,'yatta-02');t.status='running';t.flight.elapsed=0;assert.equal(select(t).storyTrigger,'flightStart');
});
test('PAW first discovery and later reunion use different supplied lines',()=>{
 const t=state(),select=createPilotController();select(t);t.flight.elapsed++;t.enemies.units=[{id:'paw-1',type:'pow',hp:60,detected:true,position:{x:200,y:0}}];const first=select(t);assert.equal(first.storyTrigger,'powDiscovered');t.enemies.units=[];t.flight.elapsed=first.until+.1;select(t);t.enemies.units=[{id:'paw-2',type:'pow',hp:60,detected:true,position:{x:200,y:0}}];t.flight.elapsed++;const second=select(t);assert.equal(second.storyTrigger,'powReunion');assert.equal(second.portraitId,'yatta-04');
});
test('observer recognizes discovered equipment, missed cargo, cleared bases and core approach from real state changes',()=>{
 for(const [trigger,edit] of [['unknownPart',t=>t.resources=[{id:'found',type:'engine',state:'available',discovered:true}]],['cargoLost',t=>t.jobs=[{id:'job',stage:'cancelled',cargo:false}]],['baseCleared',t=>t.campaign.sites[0].remaining=0],['coreApproach',t=>t.campaign.boss.distance=400]]){const t=state();t.campaign={sites:[{id:'base',kind:'base',remaining:3}],boss:{distance:1000}};const obs=createPilotStoryObserver();obs.observe(t);t.flight.elapsed++;edit(t);assert.equal(obs.observe(t).event.trigger,trigger);}
});
test('new equipment grants one first-win line, PAW dropping it does not itself count as that win',()=>{
 const t=state(),obs=createPilotStoryObserver();obs.observe(t);t.flight.elapsed++;t.ship.parts.push({id:'upgrade',type:'engine',hp:100});t.enemies.kills=1;t.lastEnemyDefeat={sequence:1,type:'pow'};assert.notEqual(obs.observe(t).event?.trigger,'upgradedFirstWin');t.flight.elapsed++;t.enemies.kills=2;t.lastEnemyDefeat={sequence:2,type:'soldier'};assert.equal(obs.observe(t).event.trigger,'upgradedFirstWin');obs.accepted('upgradedFirstWin',t.flight.elapsed);t.flight.elapsed++;t.enemies.kills=3;assert.notEqual(obs.observe(t).event?.trigger,'upgradedFirstWin');
});
test('boost evasion requires nearby hostile fire and a damage-free follow-through',()=>{
 for(const hurt of [false,true]){const t=state(),obs=createPilotStoryObserver();t.enemies.shots=[{position:{x:20,y:0}}];obs.observe(t);t.flight.elapsed=11;t.boost.bursts=1;obs.observe(t);t.flight.elapsed=11.3;if(hurt)t.ship.cells[0].hp=80;obs.observe(t);t.flight.elapsed=12;assert.equal(obs.observe(t).event?.trigger==='dashEvaded',!hurt);}
});
test('familiar route and formation memory are bounded to this controller and require actual revisits',()=>{
 const t=state(),obs=createPilotStoryObserver();obs.observe(t);t.flight.position.x=600;t.flight.elapsed++;assert.equal(obs.observe(t).event.trigger,'unfamiliarSpace');obs.accepted('unfamiliarSpace',t.flight.elapsed);t.flight.position.x=0;t.flight.elapsed++;assert.equal(obs.observe(t).event.trigger,'familiarRoute');
 const b=state(),memory=createPilotStoryObserver();memory.observe(b);b.enemies.units=[{type:'gunner',hp:1,detected:true}];assert.equal(memory.observe(b).known,false);b.enemies.units=[];memory.observe(b);b.enemies.units=[{type:'gunner',hp:1,detected:true}];assert.equal(memory.observe(b).known,true);
});
test('story monitoring is read-only and the newest defeat is copied into telemetry',()=>{
 const t=state(),before=structuredClone(t);createPilotStoryObserver().observe(t);assert.deepEqual(t,before);const g=createGame({campaign:false});enemyReward(g,{id:'boss',type:'miniboss'});const copy=snapshot(g);assert.equal(copy.lastEnemyDefeat.type,'miniboss');copy.lastEnemyDefeat.type='changed';assert.equal(g.lastEnemyDefeat.type,'miniboss');
});
test('diffusion breakthrough requires surrounding enemies; ordinary multikill uses the Angel line',()=>{assert.equal(candidateStoryTrigger({id:'multiKill'},{surrounded:false}),'diffusionClear');assert.equal(candidateStoryTrigger({id:'multiKill'},{surrounded:true}),'diffusionBreak');});

test('equipment discovery includes parts already reserved by auto-recovery and stored equipment uses the equipment line',()=>{const t=state(),obs=createPilotStoryObserver();obs.observe(t);t.flight.elapsed++;t.resources=[{id:'auto-part',type:'engine',state:'reserved',discovered:true}];assert.equal(obs.observe(t).event.trigger,'unknownPart');t.inventory.engine++;t.flight.elapsed++;const c=obs.observe(t);assert.equal(candidateStoryTrigger({id:'recovered'},c),'equipmentCollected');assert.equal(candidateStoryTrigger({id:'recovered'},{collectedEquipment:false}),'smallCollected');});

test('a volley clearing the surrounding enemies retains the pre-volley encirclement evidence',()=>{const t=state(),obs=createPilotStoryObserver();t.enemies.units=Array.from({length:3},(_,i)=>({id:String(i),type:'gunner',hp:10,detected:true,position:{x:Math.cos(i*Math.PI*2/3)*100,y:Math.sin(i*Math.PI*2/3)*100}}));assert.equal(obs.observe(t).surrounded,true);t.flight.elapsed++;t.enemies.units=[];assert.equal(obs.observe(t).surrounded,true);});

test('damage dialogue distinguishes large, charging, repeated and core-battle hits without changing state',()=>{
 for(const [expected,drop,setup] of [['largeHit',25,()=>{}],['chargingHit',5,t=>t.weapon.holding=true],['coreBattleHit',5,t=>t.enemies.units=[{id:'core',type:'finalBoss',hp:10,detected:true,position:{x:100,y:0}}]],['controllableHit',5,()=>{}]]){
 const t=state(),o=createPilotStoryObserver();o.observe(t);setup(t);t.flight.elapsed++;t.ship.cells[0].hp-=drop;const before=structuredClone(t),c=o.observe(t);assert.equal(c.damageTrigger,expected);assert.deepEqual(t,before);assert.equal(candidateStoryTrigger({id:'damage'},c),expected);t.flight.elapsed++;t.ship.cells[0].hp--;assert.equal(o.observe(t).damageTrigger,'consecutiveHits');
 }
});
test('same-event variants rotate with exact image pairing and pending base event is consumed',()=>{
 const o=createPilotStoryObserver();for(const id of ['familiarRoute','routeReturned','sameScenery']){const line=o.select('familiarRoute',30);assert.equal(line.trigger,id);o.accepted(id,30);}assert.equal(o.select('familiarRoute',31),null);assert.ok(o.select('familiarRoute',51));assert.equal(o.select('installedEquipment',10).trigger,'equipmentCollected');o.accepted('equipmentCollected',10);assert.equal(o.select('installedEquipment',11).portrait,'bikkuri-02');
});
test('PAW and nebula recognition requires leave and reenter; destroyed PAWs do not trigger loss',()=>{
 const t=state(),o=createPilotStoryObserver();const paw={id:'p',type:'pow',hp:50,detected:true,position:{...t.flight.position}};t.enemies.units=[paw];o.observe(t);t.flight.elapsed++;t.enemies.units=[];assert.equal(o.observe(t).event.trigger,'pawLostSight');o.accepted('pawLostSight',t.flight.elapsed);t.flight.elapsed++;t.enemies.units=[paw];assert.equal(o.observe(t).event.trigger,'pawRevisited');
 const b=state(),q=createPilotStoryObserver();b.enemies.units=[paw];q.observe(b);b.flight.elapsed++;b.enemies.units=[];b.enemies.kills++;assert.notEqual(q.observe(b).event?.trigger,'pawLostSight');
 const n=state(),v=createPilotStoryObserver();n.nebula.observableIds=['cloud'];v.observe(n);n.nebula.observableIds=[];n.flight.elapsed++;v.observe(n);n.nebula.observableIds=['cloud'];n.flight.elapsed++;assert.equal(v.observe(n).event.trigger,'nebulaRevisited');
});
test('surrounding and damaged reinforcements require actual geometry and new enemy IDs',()=>{
 const t=state(),o=createPilotStoryObserver();o.observe(t);t.flight.elapsed++;t.enemies.units=Array.from({length:3},(_,i)=>({id:String(i),type:'gunner',hp:10,detected:true,position:{x:t.flight.position.x+Math.cos(i*Math.PI*2/3)*100,y:t.flight.position.y+Math.sin(i*Math.PI*2/3)*100}}));assert.equal(o.observe(t).event.trigger,'encircled');o.accepted('encircled',t.flight.elapsed);t.ship.cells[0].hp=90;t.enemies.units.push({id:'reinforcement',type:'gunner',hp:10,detected:true});t.flight.elapsed++;assert.equal(o.observe(t).event.trigger,'damagedReinforcements');
});

test('missed-turn line requires a recent observed turn, rather than any failed collection',()=>{const o=createPilotStoryObserver();o.accepted('cargoLost',10);assert.equal(o.select('cargoLost',11),null);assert.equal(o.select('cargoLost',11,{recentTurn:true}).trigger,'cargoMissedTurn');});

test('new sad, shy and doubtful dialogue contains four exact static-image lines per portrait',()=>{
 const added=PILOT_STORY_LINES.slice(84,120);assert.equal(added.length,36);assert.equal(added.filter(l=>l.enabled).length,29);
 for(const portrait of ['kanashi-01','kanashi-02','kanashi-03','tereru-01','tereru-02','tereru-03','nayamu-01','nayamu-02','nayamu-03'])assert.equal(added.filter(l=>l.portrait===portrait).length,4);
 for(const id of ['repeatedFlightMemory','enemyAdaptsDoubt','enemiesLoopDoubt','bossAnomaliesDoubt','enemyRemembersAttack','spaceReturnsDoubt','bossBendsDimension'])assert.equal(storyLine(id),null);
 assert.equal(storyLine('investigateCore').line,'あのコアが原因か、まだ分からない。だから、そこまで行って確かめる。');
});
test('follow-up remembers a displayed call, waits twelve seconds and pauses through combat or charging',()=>{
 const t=state(),o=createPilotStoryObserver();o.observe(t);o.accepted('flightStart',10);t.flight.elapsed=21;assert.notEqual(o.observe(t).event?.trigger,'unansweredMemory');t.flight.elapsed=22;t.weapon.holding=true;assert.notEqual(o.observe(t).event?.trigger,'unansweredMemory');t.weapon.holding=false;t.enemies.units=[{id:'e',type:'gunner',hp:10,detected:true}];t.flight.elapsed=23;assert.notEqual(o.observe(t).event?.trigger,'unansweredMemory');t.enemies.units=[];t.flight.elapsed=24;const e=o.observe(t).event;assert.equal(e.trigger,'unansweredMemory');assert.equal(e.ambient,true);o.accepted(e.trigger,24);assert.notEqual(o.observe(t).event?.trigger,'unansweredMemory');
 const fresh=createPilotStoryObserver();fresh.observe(t);t.flight.elapsed=25;assert.notEqual(fresh.observe(t).event?.trigger,'unansweredMemory');
});
test('contextual monologues retain body, age, human and memory subjects and rotate variants',()=>{
 const o=createPilotStoryObserver();for(const [scene,trigger,portrait] of [['limbs','rememberHands','kanashi-02'],['age','unchangingFace','kanashi-03'],['human','weaponCreators','kanashi-02'],['idle','testConversationMemory','kanashi-01']]){const event=candidateStoryTrigger({id:'monologue',scene},{}),line=o.select(event,20);assert.equal(line.trigger,trigger);assert.equal(line.portrait,portrait);}
 o.accepted('testConversationMemory',20);assert.equal(o.select('monologueMemory',21).trigger,'testBattleDoubt');
});
test('passing a nebula requires prior visibility; battle habit requires three encounters',()=>{
 const t=state(),o=createPilotStoryObserver();o.observe(t);t.flight.elapsed++;assert.notEqual(o.observe(t).event?.trigger,'nebulaPassed');t.nebula.observableIds=['cloud'];t.flight.elapsed++;o.observe(t);t.nebula.observableIds=[];t.flight.elapsed++;assert.equal(o.observe(t).event.trigger,'nebulaPassed');
 const b=state(),q=createPilotStoryObserver();q.observe(b);q.accepted('angelAgeFile',b.flight.elapsed);for(let i=0;i<3;i++){b.flight.elapsed++;b.enemies.units=[{id:String(i),type:'gunner',hp:10,detected:true}];q.observe(b);b.enemies.units=[];b.flight.elapsed++;q.observe(b);}b.flight.elapsed=90;assert.equal(q.observe(b).event.trigger,'battleHabit');
});
test('controller displays exact reflection with fixed portrait and lets damage interrupt',()=>{
 const t=state(),select=createPilotController();t.flight.elapsed=0;select(t);t.flight.elapsed=13;let a=select(t);assert.equal(a.storyTrigger,'unansweredMemory');assert.equal(a.portraitId,'kanashi-01');t.flight.elapsed=14;t.ship.cells[0].hp=95;a=select(t);assert.equal(a.id,'damage');assert.equal(a.portraitId,'itai-02');
});

test('all 24 brighter lines pin the requested eight static portraits and are enabled',()=>{
 const added=PILOT_STORY_LINES.slice(120,144);assert.equal(added.length,24);for(const id of ['yatta-03','yatta-04','yatta-05','bikkuri-02','bikkuri-05','tereru-01','tereru-02','tereru-03'])assert.equal(added.filter(l=>l.portrait===id).length,3);for(const l of added){assert.equal(l.enabled,true);assert.equal(l.tone,'bright');assert.equal(suppliedPilotPortrait({portraitId:l.portrait,line:l.line}).id,l.portrait);}
});
test('PAW combat reactions require actual friendly fire or an ally-attributed kill',()=>{
 const t=state(),o=createPilotStoryObserver();o.observe(t);t.flight.elapsed++;t.escortPaws.units=[{id:'white',hits:0,joinedAt:10,position:{x:30,y:0}}];t.escortPaws.shots=[{id:1,kind:'bullet'}];assert.equal(o.observe(t).event.trigger,'pawAttackSurprise');o.accepted('pawAttackSurprise',t.flight.elapsed);t.flight.elapsed++;t.enemies.kills++;t.lastEnemyDefeat={sequence:1,type:'gunner',source:'ally'};assert.equal(o.observe(t).event.trigger,'pawKillJoy');
 const n=state(),q=createPilotStoryObserver();q.observe(n);n.flight.elapsed++;n.enemies.kills++;n.lastEnemyDefeat={sequence:1,type:'gunner',source:'normal'};assert.notEqual(q.observe(n).event?.trigger,'pawKillJoy');
});
test('same-age dialogue unlocks in order from a displayed discovery and never uses Angel flight records',()=>{
 const t=state(),o=createPilotStoryObserver();o.observe(t);assert.equal(o.select('angelBirthdayQuestion',10),null);t.flight.elapsed=20;assert.equal(o.observe(t).event.trigger,'angelAgeFile');o.accepted('angelAgeFile',20);assert.equal(o.select('angelBirthdayQuestion',21).portrait,'bikkuri-05');t.flight.elapsed=32;assert.equal(o.observe(t).event.trigger,'angelBirthdayQuestion');o.accepted('angelBirthdayQuestion',32);t.flight.elapsed=44;assert.equal(o.observe(t).event.trigger,'angelPeerFriendly');assert.equal(createPilotStoryObserver().select('angelNickname',44),null);
});
test('cat dialogue requires a visible two-lobed cloud and follow-up refers to the same still-visible cloud',()=>{
 const t=state(),o=createPilotStoryObserver();o.observe(t);t.nebula.observableIds=['cloud'];t.nebula.visibleClouds=[{id:'cloud',shape:4}];t.flight.elapsed=11;assert.equal(o.observe(t).event.trigger,'catCloudDiscovery');o.accepted('catCloudDiscovery',11);t.flight.elapsed=23;const c=o.observe(t);assert.equal(c.event.trigger,'catStillSeen');t.nebula.observableIds=[];t.nebula.visibleClouds=[];t.flight.elapsed=24;o.observe(t);assert.equal(o.select('catStillSeen',24),null);
});
test('ice discovery, safe bright cruising, water recovery and danger priority keep appropriate expressions',()=>{
 const t=state(),o=createPilotStoryObserver();o.observe(t);t.nearbyIce=[{id:'ice',position:{x:0,y:0}}];t.flight.elapsed++;assert.equal(o.observe(t).event.trigger,'iceFoundJoy');assert.equal(candidateStoryTrigger({id:'cruising'},{preferBright:true}),'brightIdle');assert.equal(candidateStoryTrigger({id:'cruising'},{preferBright:false}),null);assert.equal(candidateStoryTrigger({id:'vitalRecovered'},{collectedWater:true}),'waterComfort');
 const n=state(),select=createPilotController();const cheerful=select(n);assert.equal(cheerful.portraitId,'yatta-05');n.ship.cells[0].hp=90;n.flight.elapsed++;assert.equal(select(n).id,'damage');n.vital.value=5;n.flight.elapsed++;assert.ok(select(n).id.startsWith('warning-'));
});
test('combined enemy sightings select exact surprised dialogue once per kind, and damage still interrupts',()=>{
 for(const [kind,trigger,line] of [['moss','mossDiscovered','こんな敵いたんだ…'],['snake','snakeDiscovered','なにこれっ、ふたつの頭があるヘビ？？PAWが捕まってるしなんなの！？'],['crab','crabDiscovered','これはカニ？？こんなの見たらトラウマになっちゃう！？']]){
  const t=state(),o=createPilotStoryObserver();o.observe(t);t.enemies.units=[{id:kind,type:kind==='moss'?'moss':kind==='snake'?'mossSnake':'mossCrab',clusterId:kind,clusterKind:kind,hp:100,detected:true,position:{x:100,y:0}}];t.flight.elapsed++;assert.equal(o.observe(t).event.trigger,trigger);assert.equal(o.select(trigger,11).line,line);assert.equal(o.select(trigger,11).portrait,'bikkuri-02');o.accepted(trigger,11);t.flight.elapsed=35;assert.notEqual(o.observe(t).event?.trigger,trigger);
  const select=createPilotController();t.enemies.units=[];t.flight.elapsed=10;select(t);t.flight.elapsed++;t.enemies.units=[{id:kind,type:'moss',clusterId:kind,clusterKind:kind,hp:100,detected:true,position:{x:100,y:0}}];assert.equal(select(t).line,line);t.flight.elapsed++;t.ship.cells[0].hp=90;assert.equal(select(t).id,'damage');
 }
});

test('serious course lines require sustained distance increase, reset when approaching, and guide the current surviving objective',()=>{
 const t=state(),o=createPilotStoryObserver();t.campaign={boss:{hp:6000,distance:6800},bossCleared:false,giantSignals:[]};o.observe(t);t.flight.elapsed=14;t.campaign.boss.distance=7000;assert.notEqual(o.observe(t).event?.trigger,'homeworldAway');t.flight.elapsed=19;t.campaign.boss.distance=7150;assert.equal(o.observe(t).event.trigger,'homeworldAway');assert.equal(o.select('homeworldAway',19).portrait,'normal-04');o.accepted('homeworldAway',19);t.flight.elapsed=45;t.campaign.boss.distance=7500;assert.notEqual(o.observe(t).event?.trigger,'homeworldAway');t.flight.elapsed=46;t.campaign.boss.distance=7000;o.observe(t);t.flight.elapsed=55;t.campaign.boss.distance=7350;assert.equal(o.observe(t).event.trigger,'homeworldAway');assert.equal(o.select('homeworldAway',55).trigger,'homeworldAwayReturn');
 const n=state(),p=createPilotStoryObserver();n.campaign={bossCleared:true,objectives:[{id:'snake',distance:500,remaining:12},{id:'crab',distance:100,remaining:0}],giantSignals:[]};p.observe(n);n.flight.elapsed=20;n.campaign.objectives[0].distance=850;assert.equal(p.observe(n).event.trigger,'objectiveAway');assert.equal(p.select('objectiveAway',20).portrait,'normal-04');n.campaign.objectives[0].remaining=0;n.flight.elapsed=21;assert.notEqual(p.observe(n).event?.trigger,'homeworldAway');
});
test('new 15 enemy lines preserve all five requested portrait pairings',()=>{
 const added=PILOT_STORY_LINES.slice(-15);assert.equal(added.length,15);for(const [portrait,count] of [['bikkuri-04',3],['bikkuri-05',3],['bikkuri-01',3],['bikkuri-02',3],['huan-01',3]])assert.equal(added.filter(l=>l.portrait===portrait).length,count);assert.ok(added.every(l=>l.enabled));
});
test('berserk confusion is tied to friendly targets, stray shots and damaged living enemies',()=>{
 const t=state(),o=createPilotStoryObserver();t.enemies.units=[{id:'b',type:'berserk',hp:90,detected:true,position:{x:100,y:0}}];o.observe(t);o.accepted('berserkDiscovered',10);t.flight.elapsed=11;t.enemies.shots=[{friendlyFire:true,targetEnemyId:'other'}];assert.equal(o.observe(t).event.trigger,'berserkFriendlyWarning');assert.equal(o.select('berserkFriendlyWarning',11).portrait,'bikkuri-04');o.accepted('berserkFriendlyWarning',11);t.flight.elapsed=12;t.enemies.shots=[{friendlyFire:true}];assert.equal(o.observe(t).event.trigger,'berserkStrayWarning');o.accepted('berserkStrayWarning',12);t.flight.elapsed=13;t.enemies.units[0].hp=30;assert.equal(o.observe(t).event.trigger,'berserkDamagedWarning');
});
test('combined enemy follow-up lines progress only while the same species remains visible',()=>{
 for(const [type,parent,stages,portrait] of [['moss','mossDiscovered',['mossSurface','mossBoundaries','mossGrowth'],'bikkuri-05'],['mossSnake','snakeDiscovered',['snakeHeads','snakeOtherHead','snakeDirections'],'bikkuri-01'],['mossCrab','crabDiscovered',['crabClaws','crabApproach','crabLegs'],'bikkuri-02']]){const t=state(),o=createPilotStoryObserver();t.enemies.units=[{id:type,type,clusterId:type,clusterKind:type==='moss'?'moss':type==='mossSnake'?'snake':'crab',hp:100,detected:true,position:{x:100,y:0}}];o.observe(t);o.accepted(parent,10);for(const [i,trigger] of stages.entries()){t.flight.elapsed=19+i*9;assert.equal(o.observe(t).event.trigger,trigger);assert.equal(o.select(trigger,t.flight.elapsed).portrait,portrait);o.accepted(trigger,t.flight.elapsed);}t.enemies.units=[];t.flight.elapsed++;assert.equal(o.select(stages[0],t.flight.elapsed),null);}
});
test('boss tentacle lines use huan-01 and the visible-core line requires exposed parasite',()=>{
 const t=state(),o=createPilotStoryObserver(),boss={id:'boss',type:'finalBoss',hp:6000,detected:true,position:{x:100,y:0}};t.enemies.units=[boss];assert.notEqual(o.observe(t).event?.trigger,'bossParasiteSeen');boss.parasiteRevealed=true;t.flight.elapsed=11;assert.equal(o.observe(t).event.trigger,'bossParasiteSeen');assert.equal(o.select('bossParasiteSeen',11).portrait,'huan-01');o.accepted('bossParasiteSeen',11);boss.warning=1;t.flight.elapsed=12;assert.equal(o.observe(t).event.trigger,'bossLanesBlocked');assert.equal(o.select('bossLanesBlocked',12).portrait,'huan-01');o.accepted('bossLanesBlocked',12);delete boss.warning;t.flight.elapsed=20;assert.equal(o.observe(t).event.trigger,'bossFindGap');assert.equal(o.select('bossFindGap',20).portrait,'huan-01');
});
