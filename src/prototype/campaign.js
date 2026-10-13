import data from './enemyTypes.json' with {type:'json'};
// Distances and battle balance are provisional, isolated from simulation code.
export const CAMPAIGN={home:{x:0,y:-6800},approachBases:[{x:0,y:-1400},{x:220,y:-3000},{x:-180,y:-4600}],baseRing:650,activation:1600,engage:620,squadSpacing:26,mossFields:[{x:-1000,y:-2600},{x:1100,y:-3900},{x:-1400,y:-5500},{x:0,y:1800}]};
const typeFor=id=>data.types.find(t=>t.id===id);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function unit(id,type,position,siteId,extra={}){
 const stats=typeFor(type);
 return {id,type,siteId,campaign:true,hp:stats.hp,position:{...position},home:{...position},heading:Math.PI,cooldown:1,ramCooldown:0,supported:false,detected:false,...extra};
}
export function createCampaign(){
 const sites=CAMPAIGN.approachBases.map((position,i)=>({id:`front-${i+1}`,name:`前線基地 ${i+1}`,kind:'front',position:{...position},radius:85}));
 for(let i=0;i<5;i++){const a=Math.PI/2+i*Math.PI*2/5;sites.push({id:`home-base-${i+1}`,name:`本星防衛基地 ${i+1}`,kind:'home-base',position:{x:CAMPAIGN.home.x+Math.cos(a)*CAMPAIGN.baseRing,y:CAMPAIGN.home.y+Math.sin(a)*CAMPAIGN.baseRing},radius:85});}
 sites.push({id:'home',name:'敵本星',kind:'home',position:{...CAMPAIGN.home},radius:430});
 const units=[],squads=[];
 for(const site of sites){
  for(let team=0;team<5;team++){
   const a=team*Math.PI*2/5,reach=site.kind==='home'?210:130,id=`${site.id}-squad-${team+1}`;
   const anchor={x:site.position.x+Math.cos(a)*reach,y:site.position.y+Math.sin(a)*reach};
   squads.push({id,siteId:site.id,home:{...anchor},position:{...anchor},heading:Math.PI});
   for(let slot=0;slot<4;slot++)units.push(unit(`${id}-${slot+1}`,site.kind==='home'?'guard':'soldier',{x:anchor.x+(slot%2-.5)*CAMPAIGN.squadSpacing,y:anchor.y+(Math.floor(slot/2)-.5)*CAMPAIGN.squadSpacing},site.id,{squadId:id,slot}));
  }
  if(site.kind==='front')for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2;units.push(unit(`${site.id}-sniper-${i+1}`,'sniper',{x:site.position.x+Math.cos(a)*200,y:site.position.y+Math.sin(a)*200},site.id,{cooldown:1+i*.3}));}
  if(site.kind!=='front')units.push(unit(`${site.id}-commander`,'commander',{x:site.position.x,y:site.position.y+60},site.id));
 }
 for(let i=0;i<4;i++){const a=Math.PI/4+i*Math.PI/2;units.push(unit(`miniboss-${i+1}`,'miniboss',{x:CAMPAIGN.home.x+Math.cos(a)*360,y:CAMPAIGN.home.y+Math.sin(a)*360},'home'));}
 units.push(unit('final-boss','finalBoss',CAMPAIGN.home,'home'));
 const offsets=[[-22,-22],[0,-24],[22,-18],[-27,4],[0,0],[25,5],[-16,25],[13,26]];
 const mossGroups=CAMPAIGN.mossFields.map((position,i)=>({id:`moss-group-${i+1}`,home:{...position},position:{...position},kind:'moss',count:8,captives:2}));
 mossGroups.push({id:'snake-group',kind:'snake',count:12,captives:3,home:{x:1800,y:0},position:{x:1800,y:0}}, {id:'crab-group',kind:'crab',count:15,captives:4,home:{x:-1800,y:0},position:{x:-1800,y:0}});
 const snakeOffsets=Array.from({length:12},(_,i)=>[Math.sin(i*.65)*28,(i-5.5)*27]);
 const crabOffsets=[[0,0],[-26,0],[26,0],[-13,-25],[13,-25],[-52,-20],[52,-20],[-70,-48],[70,-48],[-51,20],[51,20],[-68,42],[68,42],[-43,50],[43,50]];
 for(const group of mossGroups)for(const [slot,[x,y]] of (group.kind==='snake'?snakeOffsets:group.kind==='crab'?crabOffsets:offsets).entries())units.push(unit(`${group.id}-${slot+1}`,group.kind==='snake'?'mossSnake':group.kind==='crab'?'mossCrab':'moss',{x:group.position.x+x,y:group.position.y+y},group.id,{clusterId:group.id,clusterKind:group.kind,clusterOffset:{x,y},slot,cooldown:1+slot*.25}));
 // The next sector is gated by the first homeworld victory; deaths remain in this voyage.
 for(let i=0;i<8;i++){const a=i*Math.PI/4;units.push(unit(`berserk-${i+1}`,'berserk',{x:760+Math.cos(a)*170,y:-5300+Math.sin(a)*170},'after-home',{postBoss:true,slot:i,heading:a}));}
 for(let i=0;i<3;i++)units.push(unit(`centipede-${i+1}`,'centipede',{x:900+i*150,y:-4500+i*80},'after-home',{postBoss:true}));
 for(let i=0;i<2;i++)units.push(unit(`scorpion-${i+1}`,'scorpion',{x:-850-i*180,y:-4900+i*200},'after-home',{postBoss:true}));
 return {sites,squads,units,mossGroups};
}
export function clusterObjectives(campaign,position){
 if(!campaign?.bossCleared)return [];
 return (campaign.mossGroups??[]).filter(g=>g.kind==='snake'||g.kind==='crab'||g.kind==='moss'&&g.home.x===0&&g.home.y===1800).map(g=>({id:g.id,name:'??????',position:{...g.position},distance:distance(g.position,position),remaining:campaign.units.filter(e=>e.clusterId===g.id&&e.hp>0).length,total:g.count}));
}
export function activateCampaign(game){
 if(!game.campaign)return;
 const live=game.campaign.units.filter(e=>e.hp>0&&(!e.postBoss||game.campaign.bossCleared)&&distance(e.clusterId?game.campaign.mossGroups.find(g=>g.id===e.clusterId).position:e.position,game.flight.position)<=Math.max(CAMPAIGN.activation,Math.hypot(game.viewport.width,game.viewport.height)/(2*game.viewport.scale)+200));
 game.enemies.units=[...game.enemies.units.filter(e=>!e.campaign),...live];
}
export function moveCampaignSquads(game,dt){
 if(!game.campaign)return;
 for(const group of game.campaign.mossGroups??[]){
  const members=game.enemies.units.filter(e=>e.clusterId===group.id&&e.hp>0);if(!members.length)continue;
  const close=distance(group.position,game.flight.position)<500,target=close?game.flight.position:group.home,dx=target.x-group.position.x,dy=target.y-group.position.y,d=Math.hypot(dx,dy),move=Math.min((close?(group.kind==='snake'?12:8):4)*dt,Math.max(0,d-(close?120:0)));
  if(d>0){group.position.x+=dx/d*move;group.position.y+=dy/d*move;}
  for(const member of members){member.position={x:group.position.x+member.clusterOffset.x+(group.kind==='snake'?Math.sin(game.flight.elapsed*1.4+member.slot*.65)*10:0),y:group.position.y+member.clusterOffset.y};member.heading=0;}
 }
 const active=new Set(game.enemies.units.filter(e=>e.campaign).map(e=>e.squadId));
 for(const squad of game.campaign.squads){
  if(!active.has(squad.id))continue;
  const site=game.campaign.sites.find(s=>s.id===squad.siteId),engaged=distance(site.position,game.flight.position)<CAMPAIGN.engage;
  const target=engaged?game.flight.position:squad.home,dx=target.x-squad.position.x,dy=target.y-squad.position.y,d=Math.hypot(dx,dy);
  if(d>0){const speed=typeFor(site.kind==='home'?'guard':'soldier').speed*(game.tuning?.enemies.speedMultiplier??1),step=Math.min(speed*dt,Math.max(0,d-(engaged?180:0)));squad.position.x+=dx/d*step;squad.position.y+=dy/d*step;if(engaged)squad.heading=Math.atan2(dx,-dy);}
  const c=Math.cos(squad.heading),s=Math.sin(squad.heading);
  for(const enemy of game.enemies.units.filter(e=>e.squadId===squad.id)){
   const x=(enemy.slot%2-.5)*CAMPAIGN.squadSpacing,y=(Math.floor(enemy.slot/2)-.5)*CAMPAIGN.squadSpacing;
   enemy.position={x:squad.position.x+x*c-y*s,y:squad.position.y+x*s+y*c};enemy.heading=squad.heading;
  }
 }
}
export function campaignSnapshot(game){
 if(!game.campaign)return null;
 const boss=game.campaign.units.find(e=>e.id==='final-boss'),sites=game.campaign.sites.map(s=>({...s,position:{...s.position},remaining:game.campaign.units.filter(e=>e.siteId===s.id&&e.hp>0).length}));
 const giantSignals=[...(boss.hp>0?[{id:boss.id,position:{...boss.position}}]:[]),...(game.campaign.mossGroups??[]).filter(g=>game.campaign.units.some(e=>e.clusterId===g.id&&e.hp>0)).map(g=>({id:g.id,position:{...g.position}}))].map(signal=>({...signal,distance:distance(signal.position,game.flight.position)}));
 const objectives=clusterObjectives(game.campaign,game.flight.position);
 const next=(game.campaign.bossCleared?objectives:sites.filter(s=>s.kind!=='home'&&s.remaining>0)).filter(s=>s.remaining>0).sort((a,b)=>distance(a.position,game.flight.position)-distance(b.position,game.flight.position))[0];
 const defeatedClusters=(game.campaign.mossGroups??[]).filter(group=>{const members=game.campaign.units.filter(e=>e.clusterId===group.id);return members.length===(group.count??8)&&members.every(e=>e.hp<=0);});
 const mossDefeated=defeatedClusters.filter(g=>(g.kind??'moss')==='moss').length,snakeDefeated=defeatedClusters.filter(g=>g.kind==='snake').length,crabDefeated=defeatedClusters.filter(g=>g.kind==='crab').length;
 return {sites,giantSignals,bossCleared:!!game.campaign.bossCleared,objectives,mossDefeated,snakeDefeated,crabDefeated,next:next?{name:next.name,distance:distance(next.position,game.flight.position)}:null,boss:{parasiteRevealed:!!boss.parasiteRevealed,parasiteHits:boss.parasiteHits??0,hp:boss.hp,maxHp:typeFor('finalBoss').hp,position:{...boss.position},distance:distance(boss.position,game.flight.position),detected:boss.detected},defeated:game.campaign.units.filter(e=>e.hp<=0).length,total:game.campaign.units.length};
}
