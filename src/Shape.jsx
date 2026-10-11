import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { ConvexGeometry } from 'three/addons/geometries/ConvexGeometry.js';
function Polyhedron({ shape, size }) {
  const geometry = useMemo(() => {
    const [x,y,z] = size.map(v => v/2);
    const points = shape === 'pyramid'
      ? [[-x,-y,-z],[x,-y,-z],[-x,-y,z],[x,-y,z],[0,y,0]]
      : shape === 'prism'
      ? [[-x,-y,-z],[x,-y,-z],[0,y,-z],[-x,-y,z],[x,-y,z],[0,y,z]]
      : [[-x,-y,-z],[x,-y,-z],[-x,-y,z],[x,-y,z],[-x,y,z],[x,y,z]];
    return new ConvexGeometry(points.map(p => new THREE.Vector3(...p)));
  }, [shape, ...size]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <primitive object={geometry} attach="geometry"/>;
}
export default function Shape({ shape, size }) {
  if (shape === 'prism' || shape === 'wedge' || shape === 'pyramid') return <Polyhedron shape={shape} size={size}/>;
  if (shape === 'sphere') return <sphereGeometry args={[size[0]/2,24,16]}/>;
  if (shape === 'cone') return <coneGeometry args={[size[0]/2,size[1],32]}/>;
  if (shape === 'pillar') return <cylinderGeometry args={[size[0]/2,size[0]/2,size[1],32]}/>;
  return <boxGeometry args={size}/>;
}
