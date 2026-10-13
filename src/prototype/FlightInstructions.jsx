import React,{useEffect,useRef} from 'react';
export default function FlightInstructions({visible,onStart,buttonLabel='航行開始'}){
 const button=useRef(null);useEffect(()=>{if(visible)button.current?.focus();},[visible]);
 if(!visible)return null;
 return <div className="proto-instructions-backdrop"><section className="proto-instructions" role="dialog" aria-modal="true" aria-label="操作説明" data-testid="flight-instructions"><span className="proto-label">FLIGHT GUIDE</span><h2>航行前の操作説明</h2><h3>移動・スラスター操作</h3><dl><div><dt><kbd>Shift</kbd></dt><dd>スラスター推進</dd></div><div><dt><kbd>Shift</kbd> ＋ <kbd>←</kbd> <kbd>→</kbd></dt><dd>スラスタードリフト</dd></div></dl><h3>攻撃操作</h3><dl><div><dt><kbd>Space</kbd></dt><dd>通常弾を発射</dd></div></dl><p>長押しでチャージし、キーを離すと発射します。<br/>チャージ時間に応じて、攻撃が3段階に変化します。</p><ol><li>波動砲</li><li>拡散波動砲</li><li>拡散収束</li></ol><button ref={button} onClick={onStart}>{buttonLabel}</button></section></div>;
}
