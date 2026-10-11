import React,{useEffect,useRef,useState} from 'react';
import PixelShip from './PixelShip.jsx';
import { drawFlight } from './render.js';
export default function FlightView({flight,parts}) {
  const canvas=useRef(),ship=useRef();const [observation,setObservation]=useState(true);
  useEffect(()=>{
    const element=canvas.current,ctx=element.getContext('2d');let frame;
    let width=0,height=0;
    const resize=new ResizeObserver(entries=>{const box=entries[0].contentRect;const ratio=Math.min(window.devicePixelRatio||1,2);width=box.width;height=box.height;element.width=Math.round(width*ratio);element.height=Math.round(height*ratio);ctx.setTransform(ratio,0,0,ratio,0,0);});resize.observe(element);
    const media=window.matchMedia('(prefers-reduced-motion: reduce)');
    const draw=()=>{drawFlight(ctx,width,height,flight.current,{observation,reducedMotion:media.matches});ship.current.style.transform=`translate(-50%, -50%) rotate(${flight.current.heading}rad)`;frame=requestAnimationFrame(draw);};
    frame=requestAnimationFrame(draw);return()=>{cancelAnimationFrame(frame);resize.disconnect();};
  },[flight,observation]);
  return <section className="proto-flight" aria-label="2D航行ビュー"><canvas ref={canvas} aria-label="相対スクロールする宇宙空間"/><svg ref={ship} className="proto-flight-ship" viewBox="0 0 220 340" role="img" aria-label="航行中の舟形シャトル"><PixelShip parts={parts}/></svg><div className="proto-flight-heading"><span className="proto-label">01 / FLIGHT FIELD</span><span>航行試験</span></div><div className="proto-flight-key"><span className="proto-live-dot"/> AUTO FLIGHT <span className="proto-key-box">A</span><span className="proto-key-box">D</span><span> / ← → 操舵</span></div><button className="proto-observation" aria-pressed={observation} onClick={()=>setObservation(v=>!v)}>{observation?'◉ 観測円を隠す':'○ 観測円を表示'}</button><div className="proto-flight-caption"><span>–– 航跡</span><span className="proto-caution">○ 惑星・力場：表示デモ</span><span>単位：m</span></div></section>;
}
