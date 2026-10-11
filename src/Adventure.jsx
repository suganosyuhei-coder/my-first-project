import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, RigidBody, CapsuleCollider, CuboidCollider, useRapier, useBeforePhysicsStep } from '@react-three/rapier';
import * as THREE from 'three';
import DesertWorld, { DesertLight } from './DesertWorld.jsx';
import { terrainHeight } from './data/terrain.js';
import ItemModel from './ItemModel.jsx';
import { MATERIALS, massLabel } from './data/materials.js';
import { ITEMS, itemMass, createInventory, createCollectionPoints, placeInventoryItem, recoverInventoryItem } from './data/items.js';

export const MOON_GRAVITY = 1.62;
export const JUMP_HEIGHT = .2;
const STEP = 1/60;
const capsuleFoot = .75;
const initialTelemetry = {position:[0,1.28,0],forward:[0,0,-1],distance:0,elapsed:0,grounded:false};
const DEFAULT_SPAWN=[0,1.28,0];
const dampAngle = (a,b,alpha) => a + Math.atan2(Math.sin(b-a),Math.cos(b-a))*alpha;

function Character({ spawn, controls, perspective, onTelemetry, onCollect, points, onEnd }) {
  const body=useRef();const model=useRef();const joints=useRef([]);
  const {world,rapier}=useRapier();
  const state=useRef({heading:controls.current.yaw,basis:controls.current.yaw,signature:'',grounded:false,jumpBuffer:0,jumpLocked:false,moving:0,phase:0,elapsed:0,report:0,ready:false,ended:false});
  const collected=useRef(new Set());
    const cameraReady=useRef(false);const controller=useRef();
  useEffect(()=>{const c=world.createCharacterController(.01);c.enableAutostep(.18,.08,false);c.enableSnapToGround(.15);c.setMaxSlopeClimbAngle(Math.PI/4);controller.current=c;return()=>{world.removeCharacterController(c);controller.current=null;};},[world]);
  useEffect(()=>{cameraReady.current=false;},[perspective]);
  useBeforePhysicsStep(()=>{
    if(!body.current || state.current.ended)return;
    if(!controller.current||body.current.numColliders()===0)return;
    const s=state.current,p=body.current.translation();
    if(s.vy===undefined)s.vy=0;
    if(s.jumpLocked && s.vy<=0)s.jumpLocked=false;
    if(s.grounded) s.ready=true;
    const keys=controls.current.keys;
    const x=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
    const z=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
    const signature=`${x},${z}`;
    if(signature!==s.signature){s.signature=signature;s.basis=controls.current.yaw;}
    if(controls.current.dragging)s.basis=controls.current.yaw;
    const direction=new THREE.Vector3(x,0,-z).applyAxisAngle(new THREE.Vector3(0,1,0),s.basis);
    const moving=direction.lengthSq()>0;
    if(moving)direction.normalize();
    let vy=s.vy;
    // Buffer a fresh press briefly so a render/physics timing mismatch does not lose a grounded jump.
    s.jumpBuffer=controls.current.jump ? .12 : Math.max(0,s.jumpBuffer-STEP);
    controls.current.jump=false;
    if(s.jumpBuffer>0 && s.grounded && !s.jumpLocked){vy=Math.sqrt(2*MOON_GRAVITY*JUMP_HEIGHT)+MOON_GRAVITY*STEP/2;s.jumpLocked=true;s.grounded=false;s.jumpBuffer=0;}
    if(moving)s.heading=dampAngle(s.heading,Math.atan2(-direction.x,-direction.z),1-Math.exp(-8*STEP));
    else if(controls.current.dragging)s.heading=dampAngle(s.heading,controls.current.yaw,1-Math.exp(-8*STEP));
    const speed=3.5;
    const c=controller.current;if(vy>0)c.disableSnapToGround();else c.enableSnapToGround(.15);
    c.computeColliderMovement(body.current.collider(0),{x:direction.x*speed*STEP,y:vy*STEP-MOON_GRAVITY*STEP*STEP/2,z:direction.z*speed*STEP});
    const delta=c.computedMovement();s.grounded=c.computedGrounded()&&vy<=0;s.vy=s.grounded?0:vy-MOON_GRAVITY*STEP;
    body.current.setNextKinematicTranslation({x:p.x+delta.x,y:p.y+delta.y,z:p.z+delta.z});
    s.moving=THREE.MathUtils.damp(s.moving,moving?1:0,8,STEP);
    if(s.ready)s.elapsed+=STEP;
    const distance=Math.hypot(p.x-DEFAULT_SPAWN[0],p.z-DEFAULT_SPAWN[2]);
    if(p.y<-12 || distance>170){s.ended=true;onEnd(s.elapsed);return;}
    for(const point of points){
      if(collected.current.has(point.id))continue;
      if(Math.hypot(p.x-point.position[0],p.y-point.position[1],p.z-point.position[2])<1.15){collected.current.add(point.id);onCollect(point);}
    }
  });
  useFrame(({camera},dt)=>{
    if(!body.current)return;
    const s=state.current,p=body.current.translation();
    const safeDt=Math.min(dt,.1);
    s.phase+=safeDt*9*s.moving;
    if(model.current){model.current.rotation.y=s.heading;model.current.visible=perspective==='third';}
    const amplitude=s.grounded ? .48*s.moving : .2;
    joints.current.forEach((joint,i)=>{if(joint){const target=s.grounded?Math.sin(s.phase+((i<2?i:i+1)%2?Math.PI:0))*amplitude:(i<2?-.35:.22);joint.rotation.x=THREE.MathUtils.damp(joint.rotation.x,target,12,safeDt);}});
    const focus=new THREE.Vector3(p.x,p.y+.6,p.z);
    const offset=perspective==='third'?new THREE.Vector3(0,2.1,5.2).applyAxisAngle(new THREE.Vector3(0,1,0),s.heading):new THREE.Vector3(0,.63,0);
    let desired=new THREE.Vector3(p.x,p.y,p.z).add(offset);
    if(perspective==='third'){
      // Keep the camera on the player's side of walls rather than looking through them.
      const direction=desired.clone().sub(focus);const length=direction.length();direction.normalize();
      const obstruction=world.castRay(new rapier.Ray(focus,direction),length,true,undefined,undefined,undefined,body.current);
      if(obstruction)desired=focus.clone().addScaledVector(direction,Math.max(.35,obstruction.timeOfImpact-.2));
    }
    if(!cameraReady.current){camera.position.copy(desired);cameraReady.current=true;}else camera.position.lerp(desired,1-Math.exp(-6*safeDt));
    camera.position.y=Math.max(camera.position.y,terrainHeight(camera.position.x,camera.position.z)+.25);
    const ahead=new THREE.Vector3(0,0,-1).applyAxisAngle(new THREE.Vector3(0,1,0),s.heading);
    const look=perspective==='third'?focus.clone().addScaledVector(ahead,2.5):desired.clone().addScaledVector(ahead,10);
    const rotation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(camera.position,look,new THREE.Vector3(0,1,0)));
    camera.quaternion.slerp(rotation,1-Math.exp(-10*safeDt));
    // Used to preserve camera-relative WASD at the start of each movement gesture.
    if(!controls.current.dragging)controls.current.yaw=s.heading;
    s.report+=safeDt;
    if(s.report>.12){s.report=0;onTelemetry({position:[p.x,p.y,p.z],forward:ahead.toArray(),distance:Math.hypot(p.x,p.z),elapsed:s.elapsed,grounded:s.grounded});}
  });
  return <RigidBody ref={body} name="explorer" type="kinematicPosition" position={spawn} colliders={false} mass={70} enabledRotations={[false,false,false]} linearDamping={0} canSleep={false} ccd>
    <CapsuleCollider args={[.45,.3]} friction={0} restitution={0}/>
    <group ref={model}>
      <mesh castShadow position={[0,.08,0]}><capsuleGeometry args={[.24,.35,6,12]}/><meshStandardMaterial color="#d5d7da" roughness={.6}/></mesh>
      <mesh position={[0,.63,0]} castShadow><sphereGeometry args={[.25,16,12]}/><meshStandardMaterial color="#d5d7da"/></mesh>
      <mesh position={[0,.65,-.19]}><boxGeometry args={[.34,.13,.12]}/><meshStandardMaterial color="#172b3b" metalness={.5} roughness={.2}/></mesh>
      <mesh position={[0,.1,.23]}><boxGeometry args={[.34,.44,.16]}/><meshStandardMaterial color="#748291"/></mesh>
      {[[-.34,.32,0],[.34,.32,0],[-.14,-.21,0],[.14,-.21,0]].map((p,i)=><group key={i} ref={el=>{joints.current[i]=el;}} position={p}><mesh castShadow position={[0,i<2?-.21:-.24,0]}><capsuleGeometry args={[i<2?.07:.09,i<2?.28:.32,4,8]}/><meshStandardMaterial color={i<2?'#9da5b0':'#77818e'}/></mesh></group>)}
    </group>
  </RigidBody>;
}

export function CollectionStar({ point }) {
  const ref=useRef();
  useFrame(({clock},dt)=>{if(ref.current){ref.current.rotation.y+=dt;ref.current.position.y=point.position[1]+Math.sin(clock.elapsedTime*2+point.position[0])*.08;}});
  const color=ITEMS[point.itemId].tier==='far'?'#ffd478':ITEMS[point.itemId].tier==='mid'?'#92b7ff':'#a3f2df';
  return <group ref={ref} position={point.position}><mesh><octahedronGeometry args={[.18]}/><meshStandardMaterial color={color} emissive={color} emissiveIntensity={3} toneMapped={false}/></mesh><mesh rotation={[Math.PI/2,0,0]}><torusGeometry args={[.35,.012,4,16]}/><meshBasicMaterial color={color}/></mesh></group>;
}
function Burst({ effect }) {
  const ref=useRef();
  const time=useRef(0);
  useFrame((_,dt)=>{time.current+=dt;if(ref.current){ref.current.children.forEach((m,i)=>{const d=time.current;const a=i*Math.PI*2/12;m.position.set(Math.cos(a)*d*1.4,Math.sin(a)*d*1.4,d*.1);m.scale.setScalar(Math.max(0,1-d));});}});
  return <group ref={ref} position={effect.position}>{Array.from({length:12},(_,i)=><mesh key={i}><sphereGeometry args={[.035,4,4]}/><meshBasicMaterial color="#b6f8e4"/></mesh>)}</group>;
}
export function WorldObjects({session,physics=false,onSelect=()=>{}}){return <>{session.placed.map(p=>{const item=ITEMS[p.itemId],scale=p.scale||1;const content=<group onClick={e=>{e.stopPropagation();onSelect(p);}} scale={scale}><ItemModel itemId={p.itemId} materialOverride={p.materialOverride}/></group>;return physics?<RigidBody key={p.id} type="fixed" position={p.position} rotation={p.rotation} colliders={false}><CuboidCollider args={item.size.map(v=>v*scale/2)} position={[0,item.size[1]*scale/2,0]}/>{content}</RigidBody>:<group key={p.id} position={p.position} rotation={p.rotation}>{content}</group>;})}{session.points.filter(p=>!session.collected.includes(p.id)).map(point=><group key={point.id}><CollectionStar point={point}/><group position={[point.position[0]+1.5,terrainHeight(point.position[0]+1.5,point.position[2])-ITEMS[point.itemId].size[1]*.45,point.position[2]]} rotation={[.06,point.position[2]*.1,.08]}><ItemModel itemId={point.itemId}/></group></group>)}</>;}
function SharedScene({spawn,session,ghost,controls,perspective,onTelemetry,onCollect,onEnd,onSelect}){return <><DesertWorld physics/><WorldObjects session={session} physics onSelect={p=>onSelect(p.id)}/>{session.effects.map(effect=><Burst key={effect.id} effect={effect}/>)}{ghost&&<group position={ghost.position}><ItemModel itemId={ghost.itemId} ghost/></group>}<Character spawn={spawn} controls={controls} perspective={perspective} onTelemetry={onTelemetry} onCollect={onCollect} points={session.points.filter(p=>!session.collected.includes(p.id))} onEnd={onEnd}/></>;}
export const createAdventureSession = () => ({inventory:createInventory(),placed:[],points:createCollectionPoints().map(p=>({...p,position:[p.position[0],terrainHeight(p.position[0],p.position[2])+.85,p.position[2]]})),collected:[],effects:[]});
export default function Adventure({ blocks,onEditor,onHome,session,setSession,avatar }) {
  const spawn=useMemo(()=>(avatar?.current && avatar.current.distance<165 ? avatar.current.position : [0,terrainHeight(0,0)+capsuleFoot+.03,0]),[]);
  const [perspective,setPerspective]=useState('third');
  const [selectedItem,setSelectedItem]=useState('block');
  const [selectedPlaced,setSelectedPlaced]=useState(null);
  const [telemetry,setTelemetry]=useState(initialTelemetry);
  const [notice,setNotice]=useState('光る星に触れて、資材を集めよう。');
  const [ended,setEnded]=useState(null);
  const [retry,setRetry]=useState(0);
  const [placing,setPlacing]=useState(false);
  const controls=useRef({keys:new Set(),jump:false,yaw:avatar?.current?Math.atan2(-avatar.current.forward[0],-avatar.current.forward[2]):0,dragging:false});
  const view=useRef();
  useEffect(()=>{
    const down=e=>{if(/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)||e.target.isContentEditable)return;if(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)){e.preventDefault();controls.current.keys.add(e.code);if(e.code==='Space'&&!e.repeat)controls.current.jump=true;}};
    const up=e=>controls.current.keys.delete(e.code);
    const clear=()=>{controls.current.keys.clear();controls.current.jump=false;controls.current.dragging=false;};
    window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);
    return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);};
  },[]);
  useEffect(()=>{const timer=setInterval(()=>setSession(s=>s.effects.length?{...s,effects:s.effects.filter(e=>Date.now()-e.created<1200)}:s),500);return()=>clearInterval(timer);},[]);
  const collect=useCallback(point=>{
    setSession(s=>s.collected.includes(point.id)?s:{...s,inventory:{...s.inventory,[point.itemId]:s.inventory[point.itemId]+point.count},collected:[...s.collected,point.id],effects:[...s.effects,{id:point.id,position:point.position,created:Date.now()}]});
    setNotice(`${ITEMS[point.itemId].name} ×${point.count} を獲得`);
  },[]);
  const finish=useCallback(time=>{setEnded(time);controls.current.keys.clear();controls.current.jump=false;},[]);
  const resetAdventure=()=>{setRetry(r=>r+1);setEnded(null);setTelemetry(initialTelemetry);controls.current={keys:new Set(),jump:false,yaw:0,dragging:false};setPlacing(false);setNotice('探索を再開。所持品と配置したアイテムは保持しています。');};
  const placement = useMemo(()=>{
    const item=ITEMS[selectedItem];
    const d=Math.max(2,item.size[0]/2+.8,item.size[2]/2+.8);
    const [x,,z]=telemetry.position;
    const target=[x+telemetry.forward[0]*d,z+telemetry.forward[2]*d];
    return [target[0],terrainHeight(...target),target[1]];
  },[telemetry.position,telemetry.forward,selectedItem]);
  const place=()=>{if(!(session.inventory[selectedItem]>0))return;setSession(s=>({...s,...placeInventoryItem(s.inventory,s.placed,selectedItem,placement,crypto.randomUUID())}));setNotice(`${ITEMS[selectedItem].name} を配置`);};
  const recoverable=session.placed.filter(p=>Math.hypot(p.position[0]-telemetry.position[0],p.position[2]-telemetry.position[2])<8).sort((a,b)=>Math.hypot(a.position[0]-telemetry.position[0],a.position[2]-telemetry.position[2])-Math.hypot(b.position[0]-telemetry.position[0],b.position[2]-telemetry.position[2]));
  const recoverId=recoverable.find(p=>p.id===selectedPlaced)?.id || recoverable[0]?.id;
  const recover=()=>{if(!recoverId)return;const p=session.placed.find(p=>p.id===recoverId);setSession(s=>({...s,...recoverInventoryItem(s.inventory,s.placed,recoverId)}));setSelectedPlaced(null);setNotice(`${ITEMS[p.itemId].name} を回収`);};
  return <div className="adventure-layout">
    <aside className="inventory-sidebar"><span className="eyebrow">DESERT EXPLORATION</span><h2>所持アイテム</h2><p>資材を集めて、砂漠に置こう。</p><div className="inventory-list">{Object.entries(ITEMS).map(([id,item])=><button key={id} aria-label={`${item.name} 所持数 ${session.inventory[id]}`} aria-pressed={selectedItem===id} className={'inventory-card '+(selectedItem===id?'chosen':'')} onClick={()=>{setSelectedItem(id);setPlacing(true);}}><span className="item-icon">{item.icon}</span><span className="item-info"><strong>{item.name}</strong><small>{MATERIALS[item.material].name} · {massLabel(itemMass(id))}</small></span><span className="item-count" data-item={id}>{session.inventory[id]}</span></button>)}</div><p className="inventory-note">重量はモデルの体積と材質から算出。<br/>配置物は現在、足場に固定されます。</p></aside>
    <section className="adventure-view" ref={view} aria-label="砂漠探索ビュー" onContextMenu={e=>e.preventDefault()} onPointerDown={e=>{if(e.button===2 && e.target.tagName==='CANVAS'){controls.current.dragging=true;e.currentTarget.setPointerCapture(e.pointerId);}}} onPointerMove={e=>{if(controls.current.dragging)controls.current.yaw-=e.movementX*.005;}} onPointerUp={e=>{controls.current.dragging=false;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);}} onLostPointerCapture={()=>{controls.current.dragging=false;}}>
      <Canvas shadows dpr={[1,1.5]} camera={{position:[0,3.38,5.2],fov:55}}><DesertLight/>
        <Suspense fallback={null}><Physics key={retry} gravity={[0,-MOON_GRAVITY,0]} timeStep={STEP} paused={ended!==null}><SharedScene spawn={retry?[0,.78,0]:spawn} blocks={blocks} session={session} selected={selectedPlaced} ghost={placing&&session.inventory[selectedItem]>0?{itemId:selectedItem,position:placement}:null} controls={controls} perspective={perspective} onTelemetry={t=>{setTelemetry(t);if(avatar)avatar.current=t;}} onCollect={collect} onEnd={finish} onSelect={setSelectedPlaced}/></Physics></Suspense>
      </Canvas>
      <div className="exploration-toolbar"><div><span className="eyebrow">MOON GRAVITY / 1.62 m/s²</span><h2>砂漠探索</h2></div><div className="toolbar-actions"><button className="quiet" onClick={()=>setPerspective(p=>p==='third'?'first':'third')}>{perspective==='third'?'一人称に切替':'三人称に切替'}</button><button className="quiet" onClick={onEditor}>全体モードへ</button></div></div>
      <div className="adventure-hud"><span>探索時間 <strong data-testid="elapsed">{telemetry.elapsed.toFixed(1)}</strong> 秒</span><span>開始地点から <strong data-testid="distance">{telemetry.distance.toFixed(1)}</strong> m</span><span>収集 <strong data-testid="collected">{session.collected.length}</strong> / {session.points.length}</span><span data-testid="contact" data-player-y={telemetry.position[1]}>{telemetry.grounded?'接地中':'空中'}</span></div>
      <div role="status" className="collection-notice">✦ {notice}</div>
      <div className="loot-legend">✦ 基本資材　<span>✦ 設備</span>　<span>✦ 特殊構造物</span><small>遠くへ進むほど珍しいアイテムが増えます</small></div>
      {perspective==='first' && <span className="crosshair" aria-hidden="true">＋</span>}
      <section className="adventure-actions"><div><small>配置するアイテム</small><strong>{ITEMS[selectedItem].name}</strong><small>{massLabel(itemMass(selectedItem))} · 残り {session.inventory[selectedItem]}</small></div><button className="quiet" onClick={()=>setPlacing(p=>!p)}>{placing?'プレビューを隠す':'配置プレビュー'}</button><button className="primary" disabled={session.inventory[selectedItem]===0 || ended!==null} onClick={place}>前方に配置</button><button className="quiet" disabled={!recoverId || ended!==null} onClick={recover}>近くの物体を回収</button></section>
      <div className="adventure-controls">WASD / 矢印：移動　Space：20cmジャンプ　右ドラッグ：方向転換<small>光る星に接触して収集 · 配置物をクリックして回収対象を選択</small></div>
      {ended!==null && <div className="adventure-result"><span className="eyebrow">EXPLORATION COMPLETE</span><h2>探索終了</h2><p>{ended.toFixed(1)} 秒の冒険<br/>収集したアイテムはリトライに引き継がれます。</p><button className="primary" onClick={resetAdventure}>リトライ</button><button className="quiet" onClick={onHome}>スタート画面へ</button></div>}
    </section>
  </div>;
}
