import React, {useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import Adventure,{createAdventureSession} from './Adventure.jsx';
import WorldEditor from './WorldEditor.jsx';
import shutleLogo from './assets/shutle_logo_v3.svg';
import './style.css';

function App() {
  const [screen, setScreen] = useState('start');
  const blocks=[];
  const avatar=useRef(null);
  const [adventureKey,setAdventureKey] = useState(0);
  const [adventureSession,setAdventureSession] = useState(createAdventureSession);
  const [message, setMessage] = useState('');

  const openAdventure = () => { setAdventureKey(k=>k+1); setScreen('adventure'); };
  const openEditor = () => { setScreen('edit'); setMessage(''); };
  const goHome = () => { setScreen('start'); };
  return <main className={screen === 'edit' || screen === 'adventure' ? 'editor-page' : ''}>
    <header className="app-header"><span className="brand">SHuTLe<span className="brand-reading">シャトル</span></span><span className="tag">SHAPE · BUILD · EXPLORE / 001</span><span className="prototype-badge">{import.meta.env.VITE_PREVIEW_COMMIT ? `PREVIEW ${import.meta.env.VITE_PREVIEW_COMMIT}` : 'UI PROTOTYPE'}</span>{screen !== 'start' && <button className="quiet" onClick={goHome}>← スタート画面へ</button>}</header>
    {screen === 'start' && <><div className="scene"><div className="welcome-art"><div className="logo-art"><img src={shutleLogo} alt="SHuTLeのロゴ"/><span>SHAPE YOUR OWN WORLD.</span></div></div></div><section className="welcome"><span className="eyebrow">BUILD · COLLECT · EXPLORE</span><h1 className="shutle-title">SHuTLe<span>シャトル</span></h1><h2 className="welcome-copy">浮かぶ空間に、かたちをつくる。</h2><p>小さなパーツから、ひとつの世界へ。<br/>組み立てて、集めて、砂漠へ冒険に出かけよう。</p><div className="entry-cards"><button className="entry-card" onClick={openEditor}><span className="entry-icon">◇</span><strong>全体モード <span>↗</span></strong><small>集めた資材を配置して、世界をつくる</small></button><button className="entry-card secondary" onClick={() => setScreen('library')}><span className="entry-icon">▦</span><strong>図形のライブラリ <span>↗</span></strong><small>つくった作品を集める</small></button></div>{message && <p role="status">{message}</p>}<button className="adventure-entry quiet" onClick={openAdventure}>✦ 砂漠へ冒険に出る ↗</button><div className="stack">React / Three.js / Rapier</div></section></>}
    {screen === 'library' && <section className="library-placeholder"><span className="eyebrow">YOUR COLLECTION</span><h1>図形のライブラリ</h1><div className="empty-library"><span>▦</span><h2>作品が並ぶ場所</h2><p>保存・読み込みはこれから実装します。<br/>まずはエディット画面で、かたちを試してみましょう。</p><button className="primary" onClick={openEditor}>全体モードへ ↗</button></div></section>}
    {screen === 'edit' && <WorldEditor session={adventureSession} setSession={setAdventureSession} onAdventure={openAdventure}/>}
    {screen === 'adventure' && <Adventure key={adventureKey} session={adventureSession} setSession={setAdventureSession} blocks={blocks} avatar={avatar} onEditor={openEditor} onHome={goHome}/>}
  </main>;
}
createRoot(document.getElementById('root')).render(<App/>);
