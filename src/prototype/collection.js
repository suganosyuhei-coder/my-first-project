export const BIT_SPEED=80,AUTO_RADIUS=32;
export const RESOURCE_TYPES={wire:{name:'ワイヤー',bits:1,work:.8},plate:{name:'金属板',bits:1,work:1.2},tank:{name:'タンク',bits:2,work:2},solar:{name:'太陽光パネル',bits:2,work:2.5}};
export function createBits(position) {return [0,1].map(i=>({id:`bit-${i+1}`,state:'orbiting',position:{x:position.x+(i? -45:45),y:position.y},jobId:null,arrived:false,trail:[]}));}
export function requestCollection(game,id,mode='click') {
  const resource=game.resources.find(r=>r.id===id);
  if(game.status!=='running')return {ok:false,reason:'航行は終了しています'};
  if(!resource||resource.state!=='available')return {ok:false,reason:'回収済み、または回収中です'};
  const distance=Math.hypot(resource.position.x-game.flight.position.x,resource.position.y-game.flight.position.y);
  if(mode==='click'&&(!resource.discovered||distance>game.observation||!inViewport(resource.position,game)))return {ok:false,reason:'観測範囲内で、画面に見えている資材を選択してください'};
  if(mode==='auto'&&distance>AUTO_RADIUS)return {ok:false,reason:'近接範囲外です'};
  const data=RESOURCE_TYPES[resource.type],free=game.bits.filter(b=>b.state==='orbiting');
  if(free.length<data.bits)return {ok:false,reason:`空きビットが不足しています（${data.bits}基必要）`};
  const bits=free.slice(0,data.bits),job={id:`job-${game.nextJob++}`,resourceId:id,type:resource.type,bitIds:bits.map(b=>b.id),stage:'outbound',work:data.work,progress:0,cargo:false,credited:false,estimate:distance/BIT_SPEED*2+data.work,startedAt:game.flight.elapsed};
  resource.state='reserved';resource.discovered=true;game.jobs.push(job);
  for(const bit of bits){bit.state='outbound';bit.jobId=job.id;bit.arrived=false;}
  return {ok:true,reason:`${data.name}：${data.bits}基で回収開始（見積 ${job.estimate.toFixed(1)}秒）`};
}
export function inViewport(point,game) {
  const {width,height,scale}=game.viewport;
  return Math.abs(point.x-game.flight.position.x)*scale<width/2-12&&Math.abs(point.y-game.flight.position.y)*scale<height/2-12;
}
function move(bit,target,dt) {
  const dx=target.x-bit.position.x,dy=target.y-bit.position.y,distance=Math.hypot(dx,dy),step=BIT_SPEED*dt;
  if(distance<=Math.max(2,step)){bit.position={...target};return true;}
  bit.position.x+=dx/distance*step;bit.position.y+=dy/distance*step;return false;
}
export function stepCollection(game,dt) {
  for(const bit of game.bits){
    if(bit.state==='orbiting'){const angle=game.flight.elapsed*.8+(bit.id==='bit-1'?0:Math.PI);move(bit,{x:game.flight.position.x+Math.cos(angle)*45,y:game.flight.position.y+Math.sin(angle)*62},dt);}
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
      for(const bit of bits){if(bit.arrived)bit.position={...game.flight.position};else bit.arrived=move(bit,game.flight.position,dt);}
      if(bits.every(b=>b.arrived)){
        if(job.cargo&&!job.credited){game.inventory[job.type]=(game.inventory[job.type]||0)+1;job.credited=true;game.notice=`${RESOURCE_TYPES[job.type].name} ×1 を搬入しました`;}
        job.stage=job.cargo?'complete':'cancelled';if(resource)resource.state=job.cargo?'collected':'vanished';
        for(const bit of bits){bit.state='orbiting';bit.jobId=null;bit.arrived=false;}
      }
    }
  }
  // Retain only recent finished jobs; active jobs never depend on visibility or distance.
  game.jobs=game.jobs.filter(j=>!['complete','cancelled'].includes(j.stage)||game.flight.elapsed-j.startedAt<20);
}
