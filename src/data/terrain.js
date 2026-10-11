export const EXTENT=192, SEGMENTS=192, STEP=EXTENT*2/SEGMENTS;
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const dune=(x,z)=>smooth((Math.hypot(x,z)-5)/12)*(4*Math.sin(x*.035+z*.021)+2.8*Math.sin(z*.061-x*.013)+1.4*Math.sin(x*.09)*Math.cos(z*.07));
export const vertices=new Float32Array((SEGMENTS+1)**2*3);
export const indices=new Uint32Array(SEGMENTS**2*6);
for(let r=0;r<=SEGMENTS;r++)for(let c=0;c<=SEGMENTS;c++){const i=(r*(SEGMENTS+1)+c)*3,x=c*STEP-EXTENT,z=r*STEP-EXTENT;vertices.set([x,dune(x,z),z],i);}
for(let r=0;r<SEGMENTS;r++)for(let c=0;c<SEGMENTS;c++){const a=r*(SEGMENTS+1)+c,b=a+1,d=a+SEGMENTS+2,e=d-1;indices.set([a,e,b,b,e,d],(r*SEGMENTS+c)*6);}
export function terrainHeight(x,z){const cx=Math.max(0,Math.min(SEGMENTS-.00001,(x+EXTENT)/STEP)),rz=Math.max(0,Math.min(SEGMENTS-.00001,(z+EXTENT)/STEP)),c=Math.floor(cx),r=Math.floor(rz),fx=cx-c,fz=rz-r,a=r*(SEGMENTS+1)+c;const h=i=>vertices[i*3+1];return fx+fz<=1?h(a)+(h(a+1)-h(a))*fx+(h(a+SEGMENTS+1)-h(a))*fz:h(a+SEGMENTS+2)+(h(a+SEGMENTS+1)-h(a+SEGMENTS+2))*(1-fx)+(h(a+1)-h(a+SEGMENTS+2))*(1-fz);}
