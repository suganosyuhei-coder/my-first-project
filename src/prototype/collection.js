import {renderCamera} from './camera.js';
import {repairFromPickup} from './repair.js';
import {installRecoveredPart} from './autoInstall.js';
export const BIT_SPEED=80;
export const RESOURCE_TYPES={missile:{name:'ミサイル',bits:2,work:2},wire:{name:'ワイヤー',bits:1,work:.8},plate:{name:'金属板',bits:1,work:1.2},tank:{name:'タンク',bits:2,work:2},solar:{name:'パネル',bits:2,work:2.5},engine:{name:'エンジン',bits:2,work:2},observer:{name:'観測装置',bits:1,work:1.5},railgun:{name:'射撃強化装置',bits:1,work:1.5},pipe:{name:'配管',bits:1,work:.8}};
export function createBits(position) {return [0,1,2].map(i=>({id:`bit-${i+1}`,state:'orbiting',position:{x:position.x+Math.cos(i*Math.PI*2/3)*45,y:position.y+Math.sin(i*Math.PI*2/3)*62},jobId:null,arrived:false,trail:[]}));}
export function requestCollection(game,id,mode='click') {
  const resource=game.resources.find(r=>r.id===id);
  if(resource?.type==='pipe')return {ok:false,reason:'配管は無制限のため回収不要です'};
  if(game.status!=='running')return {ok:false,reason:'航行は終了しています'};
  if(!resource||resource.state!=='available')return {ok:false,reason:'回収済み、または回収中です'};
  const distance=Math.hypot(resource.position.x-game.flight.position.x,resource.position.y-game.flight.position.y);
  if(mode==='click'&&(!resource.discovered||distance>game.observation||!inViewport(resource.position,game)))return {ok:false,reason:'観測範囲内で、画面に見えている資材を選択してください'};
  if(mode==='auto'&&(!resource.discovered||game.observation<=0||distance>game.observation))return {ok:false,reason:'検出済みの観測範囲内素材のみ自動回収できます'};
  const data=RESOURCE_TYPES[resource.type],free=game.bits.filter(b=>b.state==='orbiting');
  if(free.length<data.bits)return {ok:false,reason:`空きビットが不足しています（${data.bits}基必要）`};
  const bits=free.slice(0,data.bits),job={id:`job-${game.nextJob++}`,resourceId:id,type:resource.type,bitIds:bits.map(b=>b.id),stage:'outbound',work:data.work,progress:0,cargo:false,credited:false,estimate:distance/BIT_SPEED*2+data.work,startedAt:game.flight.elapsed};
  resource.state='reserved';resource.discovered=true;game.jobs.push(job);
  for(const bit of bits){bit.state='outbound';bit.jobId=job.id;bit.arrived=false;}
  return {ok:true,reason:`${data.name}：${data.bits}基で回収開始（見積 ${job.estimate.toFixed(1)}秒）`};
}
export function inViewport(point,game) {
  const {width,height,scale}=game.viewport;
  return Math.abs(point.x-renderCamera(game).x)*scale<width/2-12&&Math.abs(point.y-renderCamera(game).y)*scale<height/2-12;
}
function move(bit,target,dt,speed=BIT_SPEED) {
  const dx=target.x-bit.position.x,dy=target.y-bit.position.y,distance=Math.hypot(dx,dy),step=speed*dt;
  if(distance<=Math.max(2,step)){bit.position={...target};return true;}
  bit.position.x+=dx/distance*step;bit.position.y+=dy/distance*step;return false;
}
export function stepCollection(game,dt) {
  for(const bit of game.bits){
    if(bit.state==='orbiting'){const angle=game.flight.elapsed*.8+game.bits.indexOf(bit)*Math.PI*2/game.bits.length;bit.position={x:game.flight.position.x+Math.cos(angle)*45,y:game.flight.position.y+Math.sin(angle)*62};}
    bit.trail.push({...bit.position});if(bit.trail.length>15)bit.trail.shift();
  }
  for(const job of game.jobs){
    if(['complete','cancelled'].includes(job.stage))continue;
    const resource=game.resources.find(r=>r.id===job.resourceId),bits=game.bits.filter(b=>job.bitIds.includes(b.id));
    if(!job.cargo&&(!resource||resource.state==='vanished')){job.stage='returning';job.progress=0;for(const bit of bits){bit.state='returning';bit.arrived=false;}}
    if(job.stage==='outbound'){
      for(const bit of bits)if(!bit.arrived)bit.arrived=move(bit,resource.position,dt);
      if(bits.every(b=>b.arrived)){job.stage='collecting';for(const bit of bits){bit.state='collecting';bit.arrived=false;}}
    }else if(job.stage==='collecting'){
      job.progress=Math.min(1,job.progress+dt/job.work);
      if(job.progress>=1){job.cargo=true;resource.state='captured';job.stage='returning';for(const bit of bits){bit.state='returning';bit.arrived=false;}}
    }else if(job.stage==='returning'){
      for(const bit of bits){if(bit.arrived)bit.position={...game.flight.position};else bit.arrived=move(bit,game.flight.position,dt,BIT_SPEED+Math.hypot(game.flight.velocity?.x??0,game.flight.velocity?.y??0));}
      if(bits.every(b=>b.arrived)){
        if(job.cargo&&!job.credited){game.inventory[job.type]=(game.inventory[job.type]||0)+1;job.credited=true;game.recoveredCount=(game.recoveredCount??0)+1;const installed=installRecoveredPart(game,job.type);job.installedPartId=installed?.id??null;if(installed)game.inventory[job.type]--;game.notice=installed?`${RESOURCE_TYPES[job.type].name}を X${installed.x} Y${installed.y} に自動設置しました`:`${RESOURCE_TYPES[job.type].name} ×1 を搬入しました${['tank','solar','engine','observer','railgun','missile','pipe'].includes(job.type)?'（配置場所がないため保管）':''}`;}
        if(job.cargo&&job.credited&&!job.repairApplied){job.repairApplied=true;const repaired=repairFromPickup(game,job.type);if(repaired.length)game.notice+=' / 船体を修復しました';}
        job.stage=job.cargo?'complete':'cancelled';if(resource)resource.state=job.cargo?'collected':'vanished';
        for(const bit of bits){bit.state='orbiting';bit.jobId=null;bit.arrived=false;}
      }
    }
  }
  // Retain only recent finished jobs; active jobs never depend on visibility or distance.
  game.jobs=game.jobs.filter(j=>!['complete','cancelled'].includes(j.stage)||game.flight.elapsed-j.startedAt<20);
}
