import lines from './pilotStoryDialogue.json' with {type:'json'};
export const PILOT_STORY_LINES=lines;
const catalog=Object.fromEntries(lines.map(line=>[line.trigger,line]));
export function storyLine(trigger){const line=catalog[trigger];return line?.enabled?line:null;}
const equipment=new Set(['tank','engine','railgun','solar','missile','observer']);
const distance=(a,b)=>a&&b?Math.hypot(a.x-b.x,a.y-b.y):Infinity;
// Presentation-only, bounded history. Nothing is persisted or changes combat/physics.
export function createPilotStoryObserver(){
 let previous=null,pending=[],upgradePending=false,trialPending=false,effectPending=false,upgradeWon=false,battleStart=0,battlePeak=0,battleDanger=false,nebulaRestUntil=-Infinity,lastBattle=0,lastThreat=0,lastQuiet=0,cleanStart=0,seenPows=0,lastPow=-Infinity,zone=null,lastNebula=-Infinity,dash=null,lastHurt=-Infinity,hadBattleDamage=false,lastTurn=-Infinity,encounters=0,followUps=[],idleTalks=0,ageKnown=false,catCloud=null,catCandidate=null,blanketKnown=false,iceVisible=false,currentClouds=new Set(),currentSpecies=new Set(),awayTrack=null;
 const zones=new Set(),formations=new Map(),cooldowns=new Map(),uses=new Map(),seenParts=new Set(),seenPawIds=new Set(),seenNebulas=new Set(),seenBossIds=new Set(),giantNotices=new Map();
 const eligible=line=>line&&(!line.requires||({mossVisible:currentSpecies.has('moss'),snakeVisible:currentSpecies.has('mossSnake'),crabVisible:currentSpecies.has('mossCrab'),bossVisible:currentSpecies.has('finalBoss'),berserkVisible:currentSpecies.has('berserk'),centipedeVisible:currentSpecies.has('centipede'),scorpionVisible:currentSpecies.has('scorpion'),ageKnown,catVisible:!!catCloud&&currentClouds.has(catCloud),catCandidate:!!catCandidate,roomReady:blanketKnown&&!!catCloud,iceVisible})[line.requires]);
 const emit=(trigger,time,priority=30,detail={})=>{if(!eligible(storyLine(trigger))||time-(cooldowns.get(trigger)??-Infinity)<20||pending.some(e=>e.trigger===trigger))return;pending.push({trigger,time,priority,...detail});if(pending.length>8)pending.shift();};
 return {
  observe(t){
   const time=t.flight.elapsed,units=t.enemies?.units??[],visible=units.filter(e=>e.hp>0&&e.detected&&e.type!=='pow'),threat=visible.length>0,nebula=(t.nebula?.observableIds?.length??0)>0;
   currentSpecies=new Set(visible.map(e=>e.type));
   currentClouds=new Set(t.nebula?.observableIds??[]);catCandidate=(t.nebula?.visibleClouds??[]).find(c=>c.shape===4&&currentClouds.has(c.id))?.id??null;iceVisible=(t.nearbyIce?.length??0)>0;
   const hp=new Map([...t.ship.cells.map(c=>[`c:${c.x}:${c.y}`,c.hp]),...t.ship.parts.map(p=>[`p:${p.id}`,p.hp])]),parts=new Set(t.ship.parts.filter(p=>p.hp>0&&equipment.has(p.type)).map(p=>p.id));
   const damage=previous&&[...hp].some(([id,value])=>previous.hp.has(id)&&value<previous.hp.get(id)),upgraded=previous&&[...parts].some(id=>!previous.parts.has(id)),fired=previous&&t.weapon.shots>previous.shots,killed=previous&&(t.enemies?.kills??0)>previous.kills;
   if(previous&&Math.abs(Math.atan2(Math.sin(t.flight.heading-previous.heading),Math.cos(t.flight.heading-previous.heading)))>.02)lastTurn=time;
   const maxDrop=previous?Math.max(0,...[...hp].map(([id,value])=>(previous.hp.get(id)??value)-value)):0;
   const damageTrigger=damage?(time-lastHurt<=3?'consecutiveHits':maxDrop>=20?'largeHit':t.weapon.holding?'chargingHit':visible.some(e=>e.type==='finalBoss')?'coreBattleHit':'controllableHit'):null;
   if(damage){lastHurt=time;hadBattleDamage ||= threat;}
   if(upgraded){upgradePending=true;trialPending=true;effectPending=true;upgradeWon=false;}
   const signature=visible.map(e=>e.type).sort().join(','),newEncounter=threat&&!previous?.threat;
   let known=false,repeated=false;
   if(newEncounter){encounters++;const count=formations.get(signature)??0;known=count>0;repeated=count>1;formations.set(signature,count+1);if(formations.size>24)formations.delete(formations.keys().next().value);battleStart=time;battlePeak=visible.length;battleDanger=false;if(previous&&time<nebulaRestUntil)emit('nebulaInterrupted',time,42);}
   battlePeak=Math.max(battlePeak,visible.length);if(threat){lastThreat=time;battleDanger ||= Math.min(t.ship.critical.core,t.ship.critical.canopy)<=35||(t.vital?.value??100)<=15;}
   const afterBattle=previous?.threat&&!threat,battleDuration=afterBattle?time-battleStart:0;
   if(afterBattle){lastBattle=time;if(nebula)emit('nebulaAfterBattle',time,32);}
   const angles=visible.filter(e=>e.position).map(e=>Math.atan2(e.position.y-t.flight.position.y,e.position.x-t.flight.position.x)).sort((a,b)=>a-b);
   const surrounded=angles.length>=3&&Math.max(...angles.map((a,i)=>(angles[(i+1)%angles.length]+(i===angles.length-1?Math.PI*2:0))-a))<Math.PI;
   const pawUnits=[...units.filter(e=>e.type==='pow'),...(t.supplyPaws?.units??[])].filter(e=>e.hp!==0&&e.detected!==false&&distance(e.position,t.flight.position)<90);
   const currentPaws=new Set(pawUnits.map(e=>e.id)),nebulaIds=new Set(t.nebula?.observableIds??[]);
   const escorts=(t.escortPaws?.units??[]).filter(u=>u.joinedAt!==null&&u.hits<3),escortShots=Math.max(0,...(t.escortPaws?.shots??[]).map(s=>s.id));
   const objective=t.campaign?.bossCleared?[...(t.campaign.objectives??[])].filter(e=>e.remaining>0).sort((a,b)=>a.distance-b.distance)[0]:t.campaign?.boss?.hp>0?{id:'homeworld',distance:t.campaign.boss.distance}:null;
   if(objective&&Number.isFinite(objective.distance)){
    if(!awayTrack||awayTrack.id!==objective.id||objective.distance<awayTrack.lastDistance-.05)awayTrack={id:objective.id,startDistance:objective.distance,lastDistance:objective.distance,at:time,warned:false};
    else {awayTrack.lastDistance=objective.distance;if(!awayTrack.warned&&time-awayTrack.at>=8&&objective.distance-awayTrack.startDistance>=300)emit(objective.id==='homeworld'?'homeworldAway':'objectiveAway',time,44);}
   }else awayTrack=null;
   const signals=[...(t.campaign?.giantSignals??[])].sort((a,b)=>a.distance-b.distance);
   for(const signal of signals){
    const firstKey=`${signal.id}:first`,redKey=`${signal.id}:red`;
    if(signal.distance<=600&&!giantNotices.has(firstKey))emit('giantBydoSignal',time,77,{signalKey:firstKey});
    if(signal.distance<=350&&giantNotices.has(firstKey)&&time-giantNotices.get(firstKey)>=7&&!giantNotices.has(redKey))emit('giantCodeRed',time,78,{signalKey:redKey});
   }
   for(const [species,first,second] of [['berserk','berserkDiscovered','berserkInfighting'],['centipede','centipedeDiscovered','centipedeDread'],['scorpion','scorpionDiscovered','scorpionFear']]){
    if(!currentSpecies.has(species))continue;
    if(!(uses.get(first)>0))emit(first,time,67);
    const brawl=species!=='berserk'||time-(t.enemies?.lastFriendlyFire?.at??-Infinity)<12;
    if(uses.get(first)>0&&time-(cooldowns.get(first)??time)>=8&&!(uses.get(second)>0)&&brawl)emit(second,time,66);
   }
   for(const [kind,trigger] of [['moss','mossDiscovered'],['snake','snakeDiscovered'],['crab','crabDiscovered']])if(visible.some(e=>e.clusterId&&(e.clusterKind??'moss')===kind)&&!(uses.get(trigger)>0))emit(trigger,time,56);
   const once=(trigger,condition,priority=54)=>{if(condition&&!(uses.get(trigger)>0))emit(trigger,time,priority);};
   if(currentSpecies.has('berserk')){
    const shots=t.enemies?.shots??[];
    once('berserkFriendlyWarning',shots.some(s=>s.friendlyFire&&s.targetEnemyId)||time-(t.enemies?.lastFriendlyFire?.at??-Infinity)<12,64);
    once('berserkStrayWarning',shots.some(s=>s.friendlyFire&&!s.targetEnemyId),64);
    once('berserkDamagedWarning',visible.some(e=>e.type==='berserk'&&e.hp<=36),64);
   }
   for(const [species,parent,stages] of [['moss','mossDiscovered',['mossSurface','mossBoundaries','mossGrowth']],['mossSnake','snakeDiscovered',['snakeHeads','snakeOtherHead','snakeDirections']],['mossCrab','crabDiscovered',['crabClaws','crabApproach','crabLegs']]])if(currentSpecies.has(species))for(const [i,trigger] of stages.entries()){const before=i===0?parent:stages[i-1];once(trigger,uses.get(before)>0&&time-(cooldowns.get(before)??time)>=8);}
   const boss=visible.find(e=>e.type==='finalBoss');
   once('bossParasiteSeen',boss?.parasiteRevealed,68);
   once('bossLanesBlocked',boss?.parasiteRevealed&&(boss.warning!==undefined||(t.enemies?.shots??[]).filter(s=>s.enemyType==='finalBoss'&&s.kind==='bossLaser').length>1),68);
   once('bossFindGap',!!boss&&uses.get('bossParasiteSeen')>0&&time-(cooldowns.get('bossParasiteSeen')??time)>=8,68);
   if(previous){
    if((t.escortPaws?.lastKill?.sequence??0)>previous.allyKills||t.lastEnemyDefeat?.sequence!==previous.defeat&&t.lastEnemyDefeat?.source==='ally')emit('pawKillJoy',time,68);
    if((escortShots>previous.escortShots||(t.escortPaws?.attackSequence??0)>previous.allyAttacks)&&escorts.length&&!(uses.get('pawAttackSurprise')>0))emit('pawAttackSurprise',time,46);
    if(!threat&&escorts.some(u=>time-u.joinedAt>=3)&&!(uses.get('pawStroll')>0))emit('pawStroll',time,25);
    if(iceVisible&&!previous.iceVisible)emit('iceFoundJoy',time,27);
    if(!threat&&time>=20&&!ageKnown)emit('angelAgeFile',time,16);
    if(!threat&&catCandidate&&!catCloud)emit('catCloudDiscovery',time,19);
    if(!threat&&previous.nebulaIds.size&&!nebulaIds.size)emit('nebulaPassed',time,18);
    for(const paw of pawUnits)if(!previous.pawIds.has(paw.id)&&seenPawIds.has(paw.id))emit('pawRevisited',time,36);
    // A kill is not a disappearance: only a living PAW leaving observation counts.
    if(previous.pawIds.size&&!currentPaws.size&&!killed&&!upgraded&&!(t.supplyPaws?.lastReceipt?.sequence>previous.supplySequence))emit('pawLostSight',time,24);
    if(!threat)for(const id of nebulaIds)if(!previous.nebulaIds.has(id)&&seenNebulas.has(id))emit('nebulaRevisited',time,19);
    for(const boss of visible.filter(e=>['miniboss','finalBoss'].includes(e.type)))if(!previous.enemyIds.has(boss.id)&&seenBossIds.has(boss.id))emit('bossReactionAgain',time,46);
    if(surrounded&&!previous.surrounded)emit('encircled',time,46);
    if(previous.threat&&visible.some(e=>!previous.enemyIds.has(e.id))&&[...hp.values()].some(value=>value<100))emit('damagedReinforcements',time,47);
    if(!threat&&hadBattleDamage&&lastBattle>0&&time-lastBattle>=5&&Math.min(t.ship.critical.core,t.ship.critical.canopy)>35){emit('postBattleCheck',time,23);hadBattleDamage=false;}
    const discovered=(t.resources??[]).filter(r=>r.discovered&&['available','reserved'].includes(r.state)&&equipment.has(r.type)&&previous.resources.get(r.id)!==true);
    if(discovered.some(r=>!seenParts.has(r.type))){emit('unknownPart',time,29);for(const r of discovered)seenParts.add(r.type);}
    if((t.supplyPaws?.lastReceipt?.sequence??0)>previous.supplySequence)emit('pawAssist',time,64);
    if(killed&&!upgraded&&t.lastEnemyDefeat?.type!=='pow'&&upgradePending&&!upgradeWon)emit('upgradedFirstWin',time,58);
    else if(killed&&[...hp.values()].some(value=>value<100))emit('damagedKill',time,48);
    if(t.lastEnemyDefeat?.sequence!==previous.defeat&&['miniboss','finalBoss'].includes(t.lastEnemyDefeat?.type))emit('bossDefeated',time,72);
    for(const site of t.campaign?.sites??[])if(site.kind!=='home'&&site.remaining===0&&(previous.sites.get(site.id)??0)>0)emit('baseCleared',time,58);
    if((t.campaign?.boss?.distance??Infinity)<450&&previous.bossDistance>=450)emit('coreApproach',time,40);
    if(t.resources?.some(r=>r.discovered&&['available','reserved'].includes(r.state)&&equipment.has(r.type)&&previous.resources.get(r.id)!==true))emit('partFound',time,28);
    if(t.jobs?.some(j=>!j.cargo&&j.stage==='cancelled'&&previous.jobs.get(j.id)!=='cancelled'))emit('cargoLost',time,34);
    if(effectPending&&t.weapon.hits>previous.hits&&t.weapon.lastHit?.enemyId)emit('equipmentEffective',time,42);
    const bursts=t.boost?.bursts??0;if(bursts>previous.bursts){const nearby=previous.nearBullet;if(nearby)dash={start:time,damaged:false};}
    if(dash){dash.damaged ||= Boolean(damage);if(time-dash.start>=.6){if(!dash.damaged)emit('dashEvaded',time,35);dash=null;}}
   }
   const pow=pawUnits[0];if(pow&&previous&&!previous.nearPow)emit('powNearby',time,26);
   const nextZone=`${Math.floor((t.flight.position.x+250)/500)},${Math.floor((t.flight.position.y+250)/500)}`;
   if(zone!==nextZone){if(zone!==null)emit(zones.has(nextZone)?'familiarRoute':'unfamiliarSpace',time,18);zone=nextZone;zones.add(zone);if(zones.size>64)zones.delete(zones.values().next().value);}
   if(!previous)cleanStart=t.flight.maxDistance;
   if(damage)cleanStart=t.flight.maxDistance;
   if(previous&&time>8&&t.flight.maxDistance-cleanStart>=300&&![...hp.values()].some(value=>value<100)){emit('cleanSegment',time,18);cleanStart=t.flight.maxDistance;}
   if(!threat&&time-lastThreat>=20&&time-lastQuiet>=30){emit(encounters>=3&&Math.floor(time/30)%3===0?'battleHabit':'quietFlight',time,14);lastQuiet=time;}
   if(!threat&&lastBattle>0&&time-lastBattle>=5&&time-lastBattle<6)emit('quietAfterBattle',time,22);
   if(previous&&nebula&&!threat&&time>=15&&time-lastNebula>=30){emit('nebulaVisible',time,14);lastNebula=time;}
   if(!threat&&time-lastPow>8&&time-lastPow<9)emit('powMemory',time,16);
   followUps=followUps.filter(e=>time-e.at<24);
   if(!threat&&!damage&&!t.weapon.holding&&!t.boost.holding&&!(t.boost.remaining>0)){
    const due=followUps.find(e=>time>=e.at);
    if(due){emit(due.trigger,time,18);followUps=followUps.filter(e=>e!==due);}
   }
   pending=pending.filter(e=>time-e.time<12&&eligible(catalog[e.trigger]));const event=[...pending].sort((a,b)=>b.priority-a.priority)[0];
   const collectedEquipment=previous&&([...(equipment)].some(type=>(t.inventory[type]??0)>(previous.inventory.get(type)??0))||(t.equipmentPickup?.sequence??0)>previous.pickupSequence);
   const context={preferBright:!threat&&!damage&&Math.min(t.ship.critical.core,t.ship.critical.canopy)>35&&(t.vital?.value??100)>15,brightIdle:idleTalks%2===0,collectedWater:previous&&(t.inventory.water??0)>previous.water,collectedEquipment,fired,upgradePending:trialPending,known,repeated,newEncounter,afterBattle,battleDuration,battlePeak,battleDanger,surrounded:surrounded||Boolean(previous?.surrounded),seenPows,event:event?{...event,ambient:catalog[event.trigger]?.ambient??false}:undefined,threat,nebula,encounters,damageTrigger,installed:upgraded,recentTurn:time-lastTurn<3,firstInstall:upgraded&&t.ship.parts.some(p=>!previous.parts.has(p.id)&&equipment.has(p.type)&&!previous.partTypes.has(p.type))};
   for(const p of pawUnits)seenPawIds.add(p.id);for(const id of nebulaIds)seenNebulas.add(id);for(const e of visible)if(['miniboss','finalBoss'].includes(e.type))seenBossIds.add(e.id);
   for(const set of [seenPawIds,seenNebulas,seenBossIds])if(set.size>64)set.delete(set.values().next().value);
   previous={allyKills:t.escortPaws?.lastKill?.sequence??0,allyAttacks:t.escortPaws?.attackSequence??0,escortShots,iceVisible,water:t.inventory.water??0,heading:t.flight.heading,pawIds:currentPaws,nebulaIds,enemyIds:new Set(visible.map(e=>e.id)),partTypes:new Set(t.ship.parts.filter(p=>p.hp>0).map(p=>p.type)),supplySequence:t.supplyPaws?.lastReceipt?.sequence??0,surrounded,inventory:new Map([...equipment].map(type=>[type,t.inventory[type]??0])),pickupSequence:t.equipmentPickup?.sequence??0,hp,parts,threat,kills:t.enemies?.kills??0,hits:t.weapon.hits,shots:t.weapon.shots,bursts:t.boost?.bursts??0,nearBullet:(t.enemies?.shots??[]).some(s=>distance(s.position,t.flight.position)<100),nearPow:!!pow,defeat:t.lastEnemyDefeat?.sequence,sites:new Map((t.campaign?.sites??[]).map(s=>[s.id,s.remaining])),bossDistance:t.campaign?.boss?.distance??Infinity,resources:new Map((t.resources??[]).map(r=>[r.id,r.discovered])),jobs:new Map((t.jobs??[]).map(j=>[j.id,j.stage]))};
   return context;
  },
  select(trigger,time,context={}){
   const options=lines.filter(l=>(l.trigger!=='cargoMissedTurn'||context.recentTurn)&&l.enabled&&eligible(l)&&(l.trigger===trigger||l.event===trigger||trigger==='installedEquipment'&&l.trigger==='equipmentCollected')).filter(l=>time-(cooldowns.get(l.trigger)??-Infinity)>=20);
   return options.sort((a,b)=>(context.preferBright?Number(b.tone==='bright')-Number(a.tone==='bright'):0)||(uses.get(a.trigger)??0)-(uses.get(b.trigger)??0))[0]??null;
  },
  canUse(trigger,time){return time-(cooldowns.get(trigger)??-Infinity)>=20;},
  accepted(trigger,time){
   if(awayTrack&&['homeworldAway','homeworldAwayReturn','objectiveAway','objectiveAwayReturn'].includes(trigger))awayTrack.warned=true;
   const event=pending.find(e=>e.trigger===trigger);if(event?.signalKey){giantNotices.set(event.signalKey,time);if(giantNotices.size>64)giantNotices.delete(giantNotices.keys().next().value);}
   if(trigger==='angelAgeFile')ageKnown=true;if(trigger==='catCloudDiscovery')catCloud=catCandidate;if(trigger==='nebulaBlanket')blanketKnown=true;
   if(catalog[trigger]?.event==='brightIdle'||catalog[trigger]?.event?.startsWith('monologue')||['angelMonologue','testConversationMemory','rememberHands','weaponCreators','unchangingFace'].includes(trigger))idleTalks++;
   const options=lines.filter(l=>l.enabled&&eligible(l)&&l.after?.includes(trigger)&&(uses.get(trigger)??0)+1>=(l.minimumParentUses??1)&&time-(cooldowns.get(l.trigger)??-Infinity)>=20);
   const next=options.sort((a,b)=>(uses.get(a.trigger)??0)-(uses.get(b.trigger)??0))[0];
   if(next&&!followUps.some(e=>e.trigger===next.trigger)){followUps.push({trigger:next.trigger,at:time+12});if(followUps.length>8)followUps.shift();}
   uses.set(trigger,(uses.get(trigger)??0)+1);pending=pending.filter(e=>e.trigger!==trigger&&e.trigger!==catalog[trigger]?.event);cooldowns.set(trigger,time);if(['nebulaVisible','nebulaAfterBattle'].includes(trigger))nebulaRestUntil=time+8;if(trigger==='powDiscovered'||trigger==='powReunion'){seenPows++;lastPow=time;}if(trigger==='upgradedFirstWin'){upgradeWon=true;upgradePending=false;}if(trigger==='upgradedTrial')trialPending=false;if(trigger==='equipmentEffective')effectPending=false;},
 };
}
export function candidateStoryTrigger(candidate,context){
 switch(candidate.id){
  case 'departure':return 'flightStart';
  case 'cleared':return 'bossDefeated';
  case 'pow':return context.seenPows?'powReunion':'powDiscovered';
  case 'damage':return context.damageTrigger;
  case 'cruising':return context.preferBright?'brightIdle':null;
  case 'vitalRecovered':return context.collectedWater?'waterComfort':null;
  case 'monologue':if(context.preferBright&&context.brightIdle)return 'brightIdle';return ({idle:'monologueMemory',human:'monologueHuman',limbs:'monologueLimbs',age:'monologueAge',nebula:'nebulaVisible'})[candidate.scene]??'angelMonologue';
  case 'upgraded':return context.firstInstall?'unknownInstalled':context.installed?'installedEquipment':'equipmentCollected';
  case 'recovered':return context.collectedEquipment?'equipmentCollected':'smallCollected';
  case 'multiKill':return context.surrounded?'diffusionBreak':'diffusionClear';
  case 'afterBattle':return context.battleDanger?'dangerPassed':context.battleDuration>=20?'longBattle':context.battlePeak>=4?'intenseBattle':'quietAfterBattle';
  case 'boosting':return 'fastResponse';
  case 'enemyThreat':return context.repeated?'repeatedFormation':context.known?'knownFormation':'enemyDetected';
  case 'enemyHappy':return 'knownFormation';
  case 'fired':return context.upgradePending?'upgradedTrial':null;
  default:return candidate.storyTrigger??null;
 }
}
