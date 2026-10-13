import {drawBerserk,drawCentipede,drawScorpion} from './OrganicEnemyVisuals.js';
import {drawTentacleBoss,drawSniper,drawMossMember,drawMossCaptives} from './NewEnemyVisuals.js';
import {bossTentacleTips,sniperOrigin,bossMouth,bossParasite,PARASITE_LASER_OFFSETS} from './enemyAnatomy.js';
import {drawDetectionGlow} from './enemyDetection.js';
import {renderCamera,flightAnchor} from './camera.js';
import {drawPowArmor} from './PowArmor.js';
import {drawDestruction} from './DestructionEffects.js';
import {enemyWeakpoint} from './enemyCombat.js';
import {worldToScreen} from './model.js';
import {ENEMY_TYPES,BIT_DEFENSE} from './enemies.js';
export function drawEnemies(ctx,width,height,game){
 const state=game.enemies;if(!state)return;const scale=game.viewport.scale,screen=p=>worldToScreen(p,renderCamera(game),width,height,scale);
 ctx.save();
 for(const site of game.campaign?.sites??[]){
  const p=screen(site.position),r=site.radius*scale;
  if(p.x+r<0||p.x-r>width||p.y+r<0||p.y-r>height)continue;
  ctx.strokeStyle=site.kind==='home'?'#aa605877':'#a87d6877';ctx.lineWidth=1;ctx.setLineDash([5,8]);ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  if(site.kind==='home'){
   for(let i=0;i<12;i++){const a=i*Math.PI/6;ctx.strokeRect(p.x+Math.cos(a)*r*.85-5,p.y+Math.sin(a)*r*.85-5,10,10);}
  }else{
   ctx.save();ctx.translate(p.x,p.y);ctx.strokeStyle='#ad8170';ctx.strokeRect(-24*scale,-24*scale,48*scale,48*scale);ctx.strokeRect(-13*scale,-13*scale,26*scale,26*scale);ctx.restore();
  }
  ctx.fillStyle='#d5a18a';ctx.font='10px ui-monospace,monospace';ctx.fillText(site.name,p.x-r*.6,p.y+r+16);
 }
 const clusters=new Map();for(const member of state.units.filter(e=>e.clusterId&&e.hp>0&&e.detected)){const members=clusters.get(member.clusterId)??[];members.push(member);clusters.set(member.clusterId,members);}
 for(const [clusterId,members] of clusters){
  const group=game.campaign?.mossGroups?.find(g=>g.id===clusterId),kind=group?.kind??'moss',centre=group?.position??{x:members.reduce((sum,e)=>sum+e.position.x,0)/members.length,y:members.reduce((sum,e)=>sum+e.position.y,0)/members.length},p=screen(centre);
  ctx.strokeStyle=kind==='snake'?'#79a9a088':kind==='crab'?'#b27c6388':'#668f4a88';ctx.lineWidth=(kind==='snake'?18:7)*scale;ctx.lineCap='round';
  const ordered=[...members].sort((a,b)=>a.slot-b.slot);
  for(const [i,member] of ordered.entries()){const q=screen(member.position),from=kind==='snake'&&i>0&&ordered[i-1].slot===member.slot-1?screen(ordered[i-1].position):kind==='snake'?q:p;ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.lineTo(q.x,q.y);ctx.stroke();}
  ctx.fillStyle='#c2c9ab';ctx.font='10px ui-monospace,monospace';ctx.fillText(`${kind==='snake'?'蛇合体':kind==='crab'?'蟹合体':'苔合体'} ${members.length}/${group?.count??8}`,p.x-30,p.y+(kind==='snake'?180:kind==='crab'?85:60)*scale);
 }
 for(const enemy of state.units){if(enemy.hp<=0||!enemy.detected)continue;const type=ENEMY_TYPES.find(t=>t.id===enemy.type),p=screen(enemy.position),r=type.radius*scale;if(p.x+r*(enemy.type==='finalBoss'?3.6:enemy.type==='centipede'?12:enemy.type==='scorpion'?2.2:1)<0||p.x-r*(enemy.type==='finalBoss'?3.6:enemy.type==='centipede'?12:enemy.type==='scorpion'?2.2:1)>width||p.y+r*(enemy.type==='finalBoss'?3.6:enemy.type==='centipede'?12:enemy.type==='scorpion'?2.2:1)<0||p.y-r*(enemy.type==='finalBoss'?3.6:enemy.type==='centipede'?12:enemy.type==='scorpion'?2.2:1)>height)continue;ctx.save();ctx.translate(p.x,p.y);if(enemy.type!=='pow')ctx.rotate(enemy.heading);ctx.fillStyle='#16202e';ctx.strokeStyle=type.color;ctx.lineWidth=1.5;
  if(type.weakpoint){drawTentacleBoss(ctx,r,game.flight.elapsed,enemy);
  }else if(enemy.type==='berserk'){drawBerserk(ctx,r,game.flight.elapsed,enemy.slot);
  }else if(enemy.type==='centipede'){drawCentipede(ctx,scale,enemy.bodyTime??0);
  }else if(enemy.type==='scorpion'){drawScorpion(ctx,r,game.flight.elapsed);
  }else if(enemy.type==='sniper'){drawSniper(ctx,r);
  }else if(['moss','mossSnake','mossCrab'].includes(enemy.type)){drawMossMember(ctx,r,enemy.slot,game.flight.elapsed,enemy.clusterKind);
  }else if(enemy.type==='pow'){
   drawPowArmor(ctx,r,game.flight.elapsed,enemy.variant);if(enemy.carriesMissile){ctx.fillStyle='#ffe597';ctx.font='bold 10px ui-monospace,monospace';ctx.textAlign='center';ctx.fillText('MISSILE',0,-r-16);ctx.fillRect(r*.6,-r*.4,4,r);ctx.textAlign='start';}
  }else if(enemy.type==='miniboss'){
   ctx.fillStyle='#3b2930';ctx.strokeStyle=type.color;ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,x=Math.cos(a)*r,y=Math.sin(a)*r;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeRect(-r*.5,-r*.5,r,r);
  }else if(type.supportRange){ctx.strokeStyle='#D6B7F433';ctx.setLineDash([3,8]);ctx.beginPath();ctx.arc(0,0,type.supportRange*scale,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);ctx.strokeStyle=type.color;ctx.fillRect(-r,-r,r*2,r*2);ctx.strokeRect(-r,-r,r*2,r*2);ctx.strokeRect(-r*.5,-r*.5,r,r);}
  else{ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(r,r);ctx.lineTo(0,r*.5);ctx.lineTo(-r,r);ctx.closePath();ctx.fill();ctx.stroke();if(type.shootRange>0)ctx.fillRect(-2,-r-4,4,7);}
  ctx.fillStyle=enemy.supported?'#f7d6ff':type.color;ctx.fillRect(-2,-2,4,4);drawDetectionGlow(ctx,enemy,game.flight.elapsed,scale,r);ctx.restore();ctx.fillStyle=type.color;ctx.font='9px ui-monospace,monospace';if(!enemy.squadId&&!enemy.clusterId)ctx.fillText(type.name,p.x+r+5,p.y);ctx.fillStyle='#ffffff55';ctx.fillRect(p.x-r,p.y+r+5,r*2,2);ctx.fillStyle=type.color;ctx.fillRect(p.x-r,p.y+r+5,r*2*enemy.hp/type.hp,2);
 }
 for(const [clusterId,members] of clusters){const group=game.campaign?.mossGroups?.find(g=>g.id===clusterId);if(group)drawMossCaptives(ctx,screen(group.position),scale,game.flight.elapsed,group.kind,group.captives);}
 for(const boss of state.units.filter(e=>e.hp>0&&e.warning!==undefined)){
  const type=ENEMY_TYPES.find(t=>t.id===boss.type),core=enemyWeakpoint(boss),from=screen(boss.type==='sniper'?sniperOrigin(boss):(boss.type==='finalBoss'?(boss.parasiteRevealed?bossParasite(boss).position:bossMouth(boss)):(core?.position??boss.position)));ctx.strokeStyle=boss.type==='sniper'?'#b4edff':'#ff7777';ctx.lineWidth=1;ctx.setLineDash([6,6]);
  for(const offset of (boss.type==='sniper'?[0]:boss.type==='finalBoss'&&boss.parasiteRevealed?PARASITE_LASER_OFFSETS:[-.22,0,.22])){const a=(boss.attackHeading??boss.heading)+offset,origin=boss.type==='sniper'?sniperOrigin(boss):(boss.type==='finalBoss'?(boss.parasiteRevealed?bossParasite(boss).position:bossMouth(boss)):(core?.position??boss.position)),to=screen({x:origin.x+Math.sin(a)*type.shootRange,y:origin.y-Math.cos(a)*type.shootRange});ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.lineTo(to.x,to.y);ctx.stroke();}
  if(boss.type==='finalBoss')for(const tip of bossTentacleTips(boss,game.flight.elapsed)){const p=screen(tip);ctx.strokeStyle='#ffafca';ctx.beginPath();ctx.arc(p.x,p.y,12*scale,0,Math.PI*2);ctx.stroke();}
  ctx.setLineDash([]);ctx.fillStyle=boss.type==='sniper'?'#c6f0ff':'#ffc8a0';ctx.font='10px ui-monospace,monospace';ctx.fillText(boss.type==='sniper'?'狙撃予告':'攻撃予告',from.x+12,from.y+14);
 }
 // Bound simultaneous effects and skip offscreen deaths.
 for(const debris of (state.debris??[]).slice(-24)){
  const age=game.flight.elapsed-debris.startedAt;if(age<0||age>=.45)continue;
  const p=screen(debris.position),r=(debris.radius??ENEMY_TYPES.find(e=>e.id===debris.type)?.radius??14)*scale;
  const extent=r*2.5;if(p.x+extent<0||p.x-extent>width||p.y+extent<0||p.y-extent>height)continue;
  drawDestruction(ctx,p,r,age/.45,scale);
 }
 for(const shot of state.shots){const p=screen(shot.position);
  if(['bossLaser','sniperLaser'].includes(shot.kind)){
   const end=screen(shot.visibleEnd??{x:shot.position.x+Math.sin(shot.heading)*shot.length,y:shot.position.y-Math.cos(shot.heading)*shot.length});ctx.save();ctx.lineCap='round';
   for(const [factor,color] of (shot.kind==='sniperLaser'?[[3,'#87daff33'],[1.8,'#94dcffbb'],[1,'#d2f1ff'],[.45,'#ffffff']]:[[2.3,'#ff586733'],[2,'#ff5b79bb'],[1.25,'#ffb8a9'],[.6,'#fff8df']])){const shieldPoint=shot.shieldPoint?screen(shot.shieldPoint):null;ctx.strokeStyle=color;ctx.lineWidth=shot.radius*scale*factor;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo((shieldPoint??end).x,(shieldPoint??end).y);ctx.stroke();if(shieldPoint){ctx.globalAlpha=.65;ctx.lineWidth*=.65;ctx.beginPath();ctx.moveTo(shieldPoint.x,shieldPoint.y);ctx.lineTo(end.x,end.y);ctx.stroke();ctx.globalAlpha=1;}}ctx.restore();
  }else if(shot.kind==='bossOrb'){
   const r=shot.radius*scale;ctx.fillStyle='#f66c6655';ctx.beginPath();ctx.arc(p.x,p.y,r*1.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ec8861';ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffe6ad';ctx.beginPath();ctx.arc(p.x-r*.2,p.y-r*.2,r*.45,0,Math.PI*2);ctx.fill();
  }else{ctx.save();ctx.globalAlpha=1;const speed=Math.hypot(shot.velocity.x,shot.velocity.y)||1,tail=screen({x:shot.position.x-shot.velocity.x/speed*14,y:shot.position.y-shot.velocity.y/speed*14});ctx.strokeStyle=shot.color??'#ff695caa';ctx.lineWidth=4*scale;ctx.beginPath();ctx.moveTo(tail.x,tail.y);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.fillStyle='#ff584866';ctx.beginPath();ctx.arc(p.x,p.y,7*scale,0,Math.PI*2);ctx.fill();ctx.fillStyle=shot.color??'#ff775b';ctx.beginPath();ctx.arc(p.x,p.y,3.5*scale,0,Math.PI*2);ctx.fill();ctx.fillStyle='#fff5d0';ctx.fillRect(p.x-1.5*scale,p.y-1.5*scale,3*scale,3*scale);ctx.restore();}
 }

 for(const beam of state.beams){const from=screen(beam.from),to=screen(beam.to);ctx.globalAlpha=Math.max(0,1-beam.age/BIT_DEFENSE.beamSeconds);ctx.strokeStyle='#79D2DF';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.lineTo(to.x,to.y);ctx.stroke();ctx.strokeStyle='#efffff';ctx.lineWidth=1.3;ctx.stroke();}
 ctx.restore();
}
