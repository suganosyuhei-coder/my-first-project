import DetailedFlightGuide from './DetailedFlightGuide.jsx';
import React,{useEffect,useRef,useState} from 'react';
const guideIcons={move:'M12 3v18M3 12h18M8 7l4-4 4 4M8 17l4 4 4-4M7 8l-4 4 4 4M17 8l4 4-4 4',attack:'M12 3v4M12 17v4M3 12h4M17 12h4M8 8h8v8H8z',repair:'M9 3h6v6h6v6h-6v6H9v-6H3V9h6z',parts:'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',paw:'M5 5h14v14H5zM8 9h1M15 9h1M8 15h8M9 2v3M15 2v3'};
function GuideIcon({type}){return <svg className="proto-guide-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={guideIcons[type]}/></svg>;}
export default function FlightInstructions({visible,onStart,buttonLabel='航行開始'}){
 const [detailed,setDetailed]=useState(false);
 useEffect(()=>{if(!visible)setDetailed(false);},[visible]);
 const button=useRef(null);useEffect(()=>{if(visible)button.current?.focus({preventScroll:true});},[visible]);
 if(!visible)return null;
 return <div className="proto-instructions-backdrop">
  <section className="proto-instructions" role="dialog" aria-modal="true" aria-label="操作説明" data-testid="flight-instructions">
   <div className="proto-instructions-content" key={detailed?'detailed':'simple'}>
    {detailed?<DetailedFlightGuide/>:<><span className="proto-label">FLIGHT GUIDE</span><h2>航行前の操作説明</h2>
    <div className="proto-instructions-columns">
     <div className="proto-instructions-controls">
      <h3><GuideIcon type="move"/>移動・スラスター操作</h3>
      <dl className="proto-guide-keys" aria-label="移動・スラスター操作">
       <div><dt><kbd>Shift</kbd></dt><dd>スラスター推進</dd></div>
       <div><dt><kbd>Shift</kbd><span aria-hidden="true">＋</span><kbd aria-label="左矢印">←</kbd><kbd aria-label="右矢印">→</kbd></dt><dd>スラスタードリフト</dd></div>
      </dl>
      <h3><GuideIcon type="attack"/>攻撃操作</h3>
      <dl className="proto-guide-keys" aria-label="攻撃操作">
       <div><dt><kbd>Space</kbd></dt><dd>通常弾を発射</dd></div>
      </dl>
      <p className="proto-guide-charge-help">長押しでチャージし キーを離すと発射します<br/>チャージ時間に応じて 攻撃が3段階に変化します</p>
      <p className="proto-instructions-charge"><strong>① 波動砲 → ② 拡散波動砲 → ③ 拡散収束波動砲</strong></p>
     </div>
     <div className="proto-instructions-items">
      <h3><GuideIcon type="parts"/>アイテム</h3>
      <table aria-label="アイテム"><tbody>
       <tr><th scope="row">金属板／ワイヤー</th><td>機体修復<br/>金属板は岩からも入手</td></tr>
       <tr><th scope="row">水</th><td>VITAL回復<br/>氷を壊して入手</td></tr>
       <tr><th scope="row">タンク</th><td>スラスター移動距離 ＋5%</td></tr>
       <tr><th scope="row">エンジン</th><td>推力 ＋5%</td></tr>
       <tr><th scope="row">射撃強化装置</th><td>射撃威力 ＋5%</td></tr>
       <tr><th scope="row">パネル</th><td>ダメージ軽減率 ＋3%<br/>通常チャージ速度 ＋3%</td></tr>
      </tbody></table>

     </div>
    </div>
    </>}
   </div>
   <div className="proto-guide-actions">{!detailed&&<button className="proto-guide-details-button" onClick={()=>setDetailed(true)}>詳しい操作・強化ガイド</button>}<button ref={button} onClick={detailed?()=>setDetailed(false):onStart}>{detailed?'操作説明に戻る':buttonLabel}</button></div>
  </section>
 </div>;
}
