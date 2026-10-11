import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { Physics, RigidBody, CapsuleCollider } from '@react-three/rapier';
import * as THREE from 'three';
import Shape from './Shape.jsx';
import { MaterialSurface, StudioEnvironment } from './ItemModel.jsx';
import { MATERIALS, shapeMass, massLabel } from './data/materials.js';
import Adventure, { createAdventureSession } from './Adventure.jsx';
import shutleLogo from './assets/shutle_logo.svg';
import './style.css';

const initialBlocks = () => [{ id: 'base', shape: 'cube', position: [0, 0, 0], size: [8, 1, 8], color: '#c7cbd1', material:'concrete', massKg:shapeMass('cube',[8,1,8],'concrete') }];
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
function RotatingPart({ part, index }) {
  const ref = useRef();
  const reduced = useRef(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useFrame((_,dt) => { if (!reduced.current && ref.current) { ref.current.rotation.y += dt * (.25 + index * .04); ref.current.rotation.x += dt * .07; } });
  return <mesh ref={ref} rotation={[.3,.5,0]}><Shape shape={part.shape} size={part.size}/><meshStandardMaterial color={index % 2 ? '#a1a5ac' : '#d8dadd'} roughness={.45}/></mesh>;
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
    <StudioEnvironment/><ambientLight intensity={1}/><directionalLight position={[5,10,5]} intensity={2}/>
    {blocks.map(b => <mesh key={b.id} position={b.position}><Shape shape={b.shape} size={b.size}/><MaterialSurface material={b.material} color={b.material ? undefined : b.color}/></mesh>)}
    <OrbitControls target={bounds.center.toArray()} enableZoom={false} enableRotate={false} enablePan={false}/>
  </Canvas>;
}
function World({ blocks, draft, mode, reset }) {
  return <Canvas shadows camera={{ position: [12,10,14], fov: 45 }}>
    <StudioEnvironment/><color attach="background" args={['#101113']}/><ambientLight intensity={.7}/><directionalLight position={[8,15,5]} intensity={2} castShadow shadow-mapSize={[2048,2048]}/><Stars radius={100} depth={40} count={1800} factor={3} fade/>
    <Suspense fallback={null}><Physics gravity={[0,-9.81,0]}>
      {blocks.map(b => <RigidBody key={b.id} type="fixed" position={b.position} colliders={b.shape === 'cube' ? 'cuboid' : 'hull'}><mesh castShadow receiveShadow><Shape shape={b.shape} size={b.size}/><MaterialSurface material={b.material} color={b.material ? undefined : b.color}/></mesh></RigidBody>)}
    </Physics></Suspense>
    {mode === 'build' && <><mesh position={draft.position}><Shape shape={draft.shape} size={draft.size}/><meshStandardMaterial color="#ffffff" transparent opacity={.35} depthWrite={false}/></mesh><OrbitControls makeDefault target={[0,1,0]}/></>}
  </Canvas>;
}
function App() {
  const [screen, setScreen] = useState('start');
  const [blocks, setBlocks] = useState(initialBlocks);
  const [mode, setMode] = useState('build');
  const [partIndex, setPartIndex] = useState(0);
  const [material,setMaterial] = useState('resin');
  const [adventureKey,setAdventureKey] = useState(0);
  const [adventureSession,setAdventureSession] = useState(createAdventureSession);
  const [position, setPosition] = useState([0,1.5,0]);
  const [viewKey, setViewKey] = useState(0);
  const [message, setMessage] = useState('');
  const part = parts[partIndex];
  const draft = {shape:part.shape, size:part.size, position, material, massKg:shapeMass(part.shape,part.size,material)};
  const openAdventure = () => { setAdventureKey(k=>k+1); setScreen('adventure'); };
  const openEditor = () => { setScreen('edit'); setMode('build'); setMessage(''); };
  const goHome = () => { setScreen('start'); setMode('build'); };
  const reset = reason => { goHome(); setMessage(reason); };
  return <main className={screen === 'edit' || screen === 'adventure' ? 'editor-page' : ''}>
    <header className="app-header"><span className="brand">SHuTLe<span className="brand-reading">シャトル</span></span><span className="tag">SHAPE · BUILD · EXPLORE / 001</span><span className="prototype-badge">{import.meta.env.VITE_PREVIEW_COMMIT ? `PREVIEW ${import.meta.env.VITE_PREVIEW_COMMIT}` : 'UI PROTOTYPE'}</span>{screen !== 'start' && <button className="quiet" onClick={goHome}>← スタート画面へ</button>}</header>
    {screen === 'start' && <><div className="scene"><div className="welcome-art"><div className="logo-art"><img src={shutleLogo} alt="SHuTLeのロゴ"/><span>SHAPE YOUR OWN WORLD.</span></div></div></div><section className="welcome"><span className="eyebrow">BUILD · COLLECT · EXPLORE</span><h1 className="shutle-title">SHuTLe<span>シャトル</span></h1><h2 className="welcome-copy">浮かぶ空間に、かたちをつくる。</h2><p>小さなパーツから、ひとつの世界へ。<br/>組み立てて、集めて、宇宙へ冒険に出かけよう。</p><div className="entry-cards"><button className="entry-card" onClick={openEditor}><span className="entry-icon">◇</span><strong>図形のエディット <span>↗</span></strong><small>パーツを組み合わせて、空間をつくる</small></button><button className="entry-card secondary" onClick={() => setScreen('library')}><span className="entry-icon">▦</span><strong>図形のライブラリ <span>↗</span></strong><small>つくった作品を集める</small></button></div>{message && <p role="status">{message}</p>}<button className="adventure-entry quiet" onClick={openAdventure}>✦ 宇宙へ冒険に出る ↗</button><div className="stack">React / Three.js / Rapier</div></section></>}
    {screen === 'library' && <section className="library-placeholder"><span className="eyebrow">YOUR COLLECTION</span><h1>図形のライブラリ</h1><div className="empty-library"><span>▦</span><h2>作品が並ぶ場所</h2><p>保存・読み込みはこれから実装します。<br/>まずはエディット画面で、かたちを試してみましょう。</p><button className="primary" onClick={openEditor}>図形のエディットへ ↗</button></div></section>}
    {screen === 'edit' && <div className="editor-layout">
      <aside className="parts-sidebar"><div className="sidebar-heading"><span className="eyebrow">PARTS PALETTE</span><h2>パーツを選ぶ</h2><p>8つのかたちから、はじめよう。</p></div><div className="parts-grid">{parts.map((p,i) => <button key={p.shape} className={'part-card '+(i === partIndex ? 'chosen' : '')} aria-pressed={i === partIndex} onClick={() => { setPartIndex(i); setMode('build'); }}><div className="part-thumbnail"><Canvas camera={{position:[4,3,5],fov:40}} dpr={[1,1.5]}><StudioEnvironment/><ambientLight intensity={1}/><directionalLight position={[5,6,4]} intensity={2}/><RotatingPart part={p} index={i}/></Canvas></div><span>{p.name}</span><small>{String(i+1).padStart(2,'0')}</small></button>)}</div><p className="sidebar-note">今はクリックで選択できます。<br/>ドラッグ＆ドロップは次の実験で。</p></aside>
      <section className="workspace" aria-label="3D編集ビュー"><div className="workspace-toolbar"><div><span className="eyebrow">UNTITLED WORLD</span><strong>名前のない作品</strong></div><div className="toolbar-actions"><button className="quiet" disabled title="今後実装予定">合体</button><button className="quiet" onClick={() => setViewKey(k => k+1)}>初期視点</button><button className="quiet" onClick={openAdventure}>冒険に出る ↗</button></div></div>
      <div className="world-canvas"><World key={viewKey} blocks={blocks} draft={draft} mode={mode} reset={reset}/></div>
      {mode === 'build' && <section className="placement-bar" aria-label="配置操作"><div><small>選択中のパーツ</small><strong>{part.name}</strong><small>{massLabel(draft.massKg)}</small></div><label className="material-select">材質<select aria-label="図形の材質" value={material} onChange={e=>setMaterial(e.target.value)}>{Object.entries(MATERIALS).map(([id,m])=><option key={id} value={id}>{m.name}</option>)}</select></label><div className="fields">{['X','Y','Z'].map((axis,i) => <label key={axis}>{axis}<input aria-label={'位置 '+axis} type="number" step=".5" min="-30" max="30" value={position[i]} onChange={e => setPosition(position.map((v,j) => i === j ? Math.max(-30,Math.min(30,Number(e.target.value))) : v))}/></label>)}</div><button className="primary" onClick={() => setBlocks([...blocks,{...draft,id:crypto.randomUUID(),position:[...position],size:[...part.size]}])}>＋ 追加</button><button className="quiet" aria-label="最後の物体を取り消す" disabled={blocks.length <= 1} onClick={() => setBlocks(blocks.slice(0,-1))}>↶</button></section>}
      <section className="minimap" aria-label="作品全体のミニビュー"><div className="minimap-title"><span>◈ 全体のミニビュー</span><small>{blocks.length} PARTS</small></div><div className="minimap-canvas"><MiniView blocks={blocks}/></div><p>全体表示 · 視点連携は今後実装</p></section>
      <div className="workspace-status"><span className="dot"/><span>{mode === 'build' ? 'ドラッグで視点回転 / ホイールでズーム' : 'WASDで移動 / Spaceでジャンプ · 歩行試作'}</span><span className="status-right">作品は画面を戻っても保持されます</span></div></section>
    </div>}
    {screen === 'adventure' && <Adventure key={adventureKey} session={adventureSession} setSession={setAdventureSession} blocks={blocks} onEditor={openEditor} onHome={goHome}/>}
  </main>;
}
createRoot(document.getElementById('root')).render(<App/>);
