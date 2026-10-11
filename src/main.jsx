import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { Physics, RigidBody, CapsuleCollider } from '@react-three/rapier';
import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
import './style.css';

const initialBlocks = () => [{ id: 'base', shape: 'cube', position: [0, 0, 0], size: [8, 1, 8], color: '#82d8ce' }];
const parts = [
  { shape: 'cube', name: '立方体', size: [2,2,2] },
  { shape: 'box', name: '直方体', size: [3,1.5,2] },
  { shape: 'pillar', name: '円柱', size: [2,3,2] },
  { shape: 'sphere', name: '球', size: [2,2,2] },
  { shape: 'cone', name: '円錐', size: [2,3,2] },
  { shape: 'pyramid', name: '四角錐', size: [2,3,2] },
  { shape: 'prism', name: '三角柱', size: [2,2,2] },
  { shape: 'wedge', name: 'くさび形', size: [2,2,3] },
];
function Polyhedron({ shape, size }) {
  const geometry = useMemo(() => {
    const [x,y,z] = size.map(v => v/2);
    const points = shape === 'prism'
      ? [[-x,-y,-z],[x,-y,-z],[0,y,-z],[-x,-y,z],[x,-y,z],[0,y,z]]
      : [[-x,-y,-z],[x,-y,-z],[-x,-y,z],[x,-y,z],[-x,y,z],[x,y,z]];
    return new ConvexGeometry(points.map(p => new THREE.Vector3(...p)));
  }, [shape, ...size]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <primitive object={geometry} attach="geometry"/>;
}
function Shape({ shape, size }) {
  if (shape === 'prism' || shape === 'wedge') return <Polyhedron shape={shape} size={size}/>;
  if (shape === 'sphere') return <sphereGeometry args={[size[0]/2,24,16]}/>;
  if (shape === 'cone') return <coneGeometry args={[size[0]/2,size[1],32]}/>;
  if (shape === 'pyramid') return <coneGeometry args={[size[0]/Math.sqrt(2),size[1],4]} rotation={[0,Math.PI/4,0]}/>;
  if (shape === 'pillar') return <cylinderGeometry args={[size[0]/2,size[0]/2,size[1],32]}/>;
  return <boxGeometry args={size}/>;
}
function RotatingPart({ part, index }) {
  const ref = useRef();
  const reduced = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useFrame((_,dt) => { if (!reduced.current && ref.current) { ref.current.rotation.y += dt * (.25 + index * .04); ref.current.rotation.x += dt * .07; } });
  return <mesh ref={ref} rotation={[.3,.5,0]}><Shape shape={part.shape} size={part.size}/><meshStandardMaterial color={index % 2 ? '#a7bde8' : '#82d8ce'} roughness={.45}/></mesh>;
}
function MiniView({ blocks }) {
  const bounds = useMemo(() => {
    const box = new THREE.Box3();
    blocks.forEach(b => { const p = new THREE.Vector3(...b.position); const half = new THREE.Vector3(...b.size).multiplyScalar(.5); box.expandByPoint(p.clone().sub(half)); box.expandByPoint(p.clone().add(half)); });
    const center = box.isEmpty() ? new THREE.Vector3() : box.getCenter(new THREE.Vector3());
    const distance = box.isEmpty() ? 10 : Math.max(5,box.getSize(new THREE.Vector3()).length()*1.3);
    return { center, distance };
  }, [blocks]);
  return <Canvas key={JSON.stringify(blocks)} camera={{position: bounds.center.clone().add(new THREE.Vector3(1,.8,1).normalize().multiplyScalar(bounds.distance)).toArray(),fov:40}}>
    <ambientLight intensity={1}/><directionalLight position={[5,10,5]} intensity={2}/>
    {blocks.map(b => <mesh key={b.id} position={b.position}><Shape shape={b.shape} size={b.size}/><meshStandardMaterial color={b.color}/></mesh>)}
    <OrbitControls target={bounds.center.toArray()} enableZoom={false} enableRotate={false} enablePan={false}/>
  </Canvas>;
}
function Player({ reset }) {
  const body = useRef();
  const keys = useRef(new Set());
  const ground = useRef(false);
  const direction = useRef(new THREE.Vector3());
  useEffect(() => {
    const down = e => { if (['KeyW','KeyA','KeyS','KeyD','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) { e.preventDefault(); keys.current.add(e.code); } };
    const up = e => keys.current.delete(e.code);
    const clear = () => keys.current.clear();
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('blur', clear);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', clear); };
  }, []);
  useFrame(({ camera }, dt) => {
    if (!body.current) return;
    const p = body.current.translation();
    if (p.y < -15 || Math.hypot(p.x, p.z) > 60) { reset('空間の外に出たため、スタート画面に戻りました。'); return; }
    const k = keys.current;
    camera.getWorldDirection(direction.current); direction.current.y = 0; direction.current.normalize();
    const right = new THREE.Vector3().crossVectors(direction.current, new THREE.Vector3(0,1,0));
    const move = direction.current.clone().multiplyScalar(Number(k.has('KeyW') || k.has('ArrowUp')) - Number(k.has('KeyS') || k.has('ArrowDown'))).addScaledVector(right, Number(k.has('KeyD') || k.has('ArrowRight')) - Number(k.has('KeyA') || k.has('ArrowLeft')));
    if (move.lengthSq()) move.normalize().multiplyScalar(4);
    const v = body.current.linvel();
    let vy = v.y;
    if (k.has('Space') && ground.current) { vy = 6; ground.current = false; k.delete('Space'); }
    body.current.setLinvel({ x: move.x, y: vy, z: move.z }, true);
    camera.position.lerp(new THREE.Vector3(p.x + 6, p.y + 4, p.z + 8), 1 - Math.exp(-5 * dt));
    camera.lookAt(p.x, p.y + .3, p.z);
  });
  return <RigidBody ref={body} position={[0,3,0]} colliders={false} enabledRotations={[false,false,false]} onCollisionEnter={({ manifold }) => { if (Math.abs(manifold.normal().y) > .5) ground.current = true; }} onCollisionExit={() => { ground.current = false; }}>
    <CapsuleCollider args={[.45,.3]}/>
    <mesh castShadow><capsuleGeometry args={[.3,.9,8,16]}/><meshStandardMaterial color="#ffbd7a"/></mesh>
    <mesh position={[0,.75,0]} castShadow><sphereGeometry args={[.25,16,16]}/><meshStandardMaterial color="#fff0dc"/></mesh>
  </RigidBody>;
}
function World({ blocks, draft, mode, reset }) {
  return <Canvas shadows camera={{ position: [12,10,14], fov: 45 }}>
    <color attach="background" args={['#0b1425']}/><ambientLight intensity={.7}/><directionalLight position={[8,15,5]} intensity={2} castShadow shadow-mapSize={[2048,2048]}/><Stars radius={100} depth={40} count={1800} factor={3} fade/>
    <Suspense fallback={null}><Physics gravity={[0,-9.81,0]}>
      {blocks.map(b => <RigidBody key={b.id} type="fixed" position={b.position} colliders={b.shape === 'cube' ? 'cuboid' : 'hull'}><mesh castShadow receiveShadow><Shape shape={b.shape} size={b.size}/><meshStandardMaterial color={b.color} roughness={.65}/></mesh></RigidBody>)}
      {mode === 'walk' && <Player reset={reset}/>}
    </Physics></Suspense>
    {mode === 'build' && <><mesh position={draft.position}><Shape shape={draft.shape} size={draft.size}/><meshStandardMaterial color="#ffffff" transparent opacity={.35} depthWrite={false}/></mesh><OrbitControls makeDefault target={[0,1,0]}/></>}
  </Canvas>;
}
function App() {
  const [screen, setScreen] = useState('start');
  const [blocks, setBlocks] = useState(initialBlocks);
  const [mode, setMode] = useState('build');
  const [partIndex, setPartIndex] = useState(0);
  const [position, setPosition] = useState([0,1.5,0]);
  const [viewKey, setViewKey] = useState(0);
  const [message, setMessage] = useState('');
  const part = parts[partIndex];
  const draft = {shape:part.shape, size:part.size, position, color:'#82d8ce'};
  const openEditor = () => { setScreen('edit'); setMode('build'); setMessage(''); };
  const goHome = () => { setScreen('start'); setMode('build'); };
  const reset = reason => { goHome(); setMessage(reason); };
  return <main className={screen === 'edit' ? 'editor-page' : ''}>
    <header className="app-header"><span className="brand">◈ 浮遊工房</span><span className="tag">FLOATING WORKSHOP / 001</span><span className="prototype-badge">UI PROTOTYPE</span>{screen !== 'start' && <button className="quiet" onClick={goHome}>← スタート画面へ</button>}</header>
    {screen === 'start' && <><div className="scene"><div className="welcome-art"><div className="floating-cube"/><div className="orbit"/></div></div><section className="welcome"><span className="eyebrow">BUILD · COLLECT · EXPLORE</span><h1>浮かぶ空間に、<br/>かたちをつくる。</h1><p>小さなパーツから、ひとつの世界へ。<br/>組み立てて、眺めて、いつか冒険に出かけよう。</p><div className="entry-cards"><button className="entry-card" onClick={openEditor}><span className="entry-icon">◇</span><strong>図形のエディット <span>↗</span></strong><small>パーツを組み合わせて、空間をつくる</small></button><button className="entry-card secondary" onClick={() => setScreen('library')}><span className="entry-icon">▦</span><strong>図形のライブラリ <span>↗</span></strong><small>つくった作品を集める</small></button></div>{message && <p role="status">{message}</p>}<div className="stack">React / Three.js / Rapier</div></section></>}
    {screen === 'library' && <section className="library-placeholder"><span className="eyebrow">YOUR COLLECTION</span><h1>図形のライブラリ</h1><div className="empty-library"><span>▦</span><h2>作品が並ぶ場所</h2><p>保存・読み込みはこれから実装します。<br/>まずはエディット画面で、かたちを試してみましょう。</p><button className="primary" onClick={openEditor}>図形のエディットへ ↗</button></div></section>}
    {screen === 'edit' && <div className="editor-layout">
      <aside className="parts-sidebar"><div className="sidebar-heading"><span className="eyebrow">PARTS PALETTE</span><h2>パーツを選ぶ</h2><p>8つのかたちから、はじめよう。</p></div><div className="parts-grid">{parts.map((p,i) => <button key={p.shape} className={'part-card '+(i === partIndex ? 'chosen' : '')} aria-pressed={i === partIndex} onClick={() => { setPartIndex(i); setMode('build'); }}><div className="part-thumbnail"><Canvas camera={{position:[4,3,5],fov:40}} dpr={[1,1.5]}><ambientLight intensity={1}/><directionalLight position={[5,6,4]} intensity={2}/><RotatingPart part={p} index={i}/></Canvas></div><span>{p.name}</span><small>{String(i+1).padStart(2,'0')}</small></button>)}</div><p className="sidebar-note">今はクリックで選択できます。<br/>ドラッグ＆ドロップは次の実験で。</p></aside>
      <section className="workspace" aria-label="3D編集ビュー"><div className="workspace-toolbar"><div><span className="eyebrow">UNTITLED WORLD</span><strong>名前のない作品</strong></div><div className="toolbar-actions"><button className="quiet" disabled title="今後実装予定">合体</button><button className="quiet" onClick={() => setViewKey(k => k+1)}>初期視点</button><button className={mode === 'walk' ? 'primary' : 'quiet'} onClick={() => setMode(mode === 'walk' ? 'build' : 'walk')}>{mode === 'walk' ? 'エディットへ戻る' : '歩行を試す ↗'}</button></div></div>
      <div className="world-canvas"><World key={viewKey} blocks={blocks} draft={draft} mode={mode} reset={reset}/></div>
      {mode === 'build' && <section className="placement-bar" aria-label="配置操作"><div><small>選択中のパーツ</small><strong>{part.name}</strong></div><div className="fields">{['X','Y','Z'].map((axis,i) => <label key={axis}>{axis}<input aria-label={'位置 '+axis} type="number" step=".5" min="-30" max="30" value={position[i]} onChange={e => setPosition(position.map((v,j) => i === j ? Math.max(-30,Math.min(30,Number(e.target.value))) : v))}/></label>)}</div><button className="primary" onClick={() => setBlocks([...blocks,{...draft,id:crypto.randomUUID(),position:[...position],size:[...part.size]}])}>＋ 追加</button><button className="quiet" aria-label="最後の物体を取り消す" disabled={blocks.length <= 1} onClick={() => setBlocks(blocks.slice(0,-1))}>↶</button></section>}
      <section className="minimap" aria-label="作品全体のミニビュー"><div className="minimap-title"><span>◈ 全体のミニビュー</span><small>{blocks.length} PARTS</small></div><div className="minimap-canvas"><MiniView blocks={blocks}/></div><p>全体表示 · 視点連携は今後実装</p></section>
      <div className="workspace-status"><span className="dot"/><span>{mode === 'build' ? 'ドラッグで視点回転 / ホイールでズーム' : 'WASDで移動 / Spaceでジャンプ · 歩行試作'}</span><span className="status-right">作品は画面を戻っても保持されます</span></div></section>
    </div>}
  </main>;
}
createRoot(document.getElementById('root')).render(<App/>);
