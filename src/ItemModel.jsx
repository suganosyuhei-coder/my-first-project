import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { MATERIALS } from './data/materials.js';
import { ITEMS } from './data/items.js';
import { Environment, Lightformer } from '@react-three/drei';

export function StudioEnvironment() {
  return <Environment resolution={64}><Lightformer intensity={2} color="#d3e1fa" scale={[20,15,1]} position={[0,8,-12]}/><Lightformer intensity={1} color="#fff2d9" scale={[15,10,1]} position={[10,3,8]} rotation={[0,-Math.PI/2,0]}/></Environment>;
}
const noise=new Uint8Array(64*64*4);
let noiseSeed=18573;
for(let i=0;i<64*64;i++){noiseSeed^=noiseSeed<<13;noiseSeed^=noiseSeed>>>17;noiseSeed^=noiseSeed<<5;const value=205+((noiseSeed>>>0)%51);noise[i*4]=noise[i*4+1]=noise[i*4+2]=value;noise[i*4+3]=255;}
const concreteTexture=new THREE.DataTexture(noise,64,64);
concreteTexture.wrapS=concreteTexture.wrapT=THREE.RepeatWrapping;concreteTexture.repeat.set(4,4);concreteTexture.minFilter=concreteTexture.magFilter=THREE.LinearFilter;concreteTexture.needsUpdate=true;
function PipeGeometry({ radius, innerRadius, height }) {
  const geometry = useMemo(()=>{
    const section=new THREE.Shape();section.absarc(0,0,radius,0,Math.PI*2,false);
    const hole=new THREE.Path();hole.absarc(0,0,innerRadius,0,Math.PI*2,true);section.holes.push(hole);
    const geo=new THREE.ExtrudeGeometry(section,{depth:height,bevelEnabled:false,curveSegments:12});
    geo.translate(0,0,-height/2);geo.rotateX(-Math.PI/2);return geo;
  },[radius,innerRadius,height]);
  useEffect(()=>()=>geometry.dispose(),[geometry]);
  return <primitive object={geometry} attach="geometry"/>;
}
export function MaterialSurface({ material='resin', color, ghost=false }) {
  const m=MATERIALS[material] || MATERIALS.resin;
  return <meshStandardMaterial color={color || m.color} metalness={m.metalness} roughness={m.roughness} map={material==='concrete'?concreteTexture:null} bumpMap={material==='concrete'?concreteTexture:null} bumpScale={.015} transparent={ghost} opacity={ghost ? .4 : 1} depthWrite={!ghost}/>;
}
export default function ItemModel({ itemId, ghost=false }) {
  const item=ITEMS[itemId];
  return <group>{item.parts.map((p,i)=><mesh key={i} position={p.position} rotation={p.rotation} castShadow={!ghost} receiveShadow>
    {p.kind==='box'?<boxGeometry args={p.size}/>:p.kind==='torus'?<torusGeometry args={[p.radius,p.tube,6,20]}/>:p.kind==='pipe'?<PipeGeometry {...p}/>:<cylinderGeometry args={[p.radius,p.radius,p.height,20]}/>}
    <MaterialSurface material={p.material || item.material} color={p.color} ghost={ghost}/>
  </mesh>)}</group>;
}
