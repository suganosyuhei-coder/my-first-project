import {regionDensity} from './nebula.js';
// Pure 2D WebGL overlay: no 3D library, asset, or framebuffer readback in gameplay.
export const NEBULA_FRAGMENT=`
precision highp float;
uniform vec2 resolution,worldSize,camera,center,extent;
uniform float time,visualTime,seed,shape,density,dark,diagnostic;
uniform vec3 palette;
float hash(vec2 p,float s){float a=mod(p.x+mod(s,241.),289.);float b=mod(p.y,289.);float q=mod((a*34.+1.)*a+b,289.);return mod((q*34.+1.)*q,289.)/289.;}
float noise(vec2 p,float s){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(hash(i,s),hash(i+vec2(1,0),s),u.x),mix(hash(i+vec2(0,1),s),hash(i+vec2(1,1),s),u.x),u.y);}
float fbm(vec2 p,float s){float v=0.,a=.5;for(int i=0;i<3;i++){v+=a*noise(p,s);p=p*2.03+vec2(13.1,7.7);a*=.5;}return v/.875;}
float field(vec2 p){
 if(abs(p.x)>1.6||abs(p.y)>1.6)return 0.;
 float t=time*.018;
 vec2 w=vec2(fbm(p*1.7+vec2(t,0),seed),fbm(p*1.7-vec2(0,t),seed+17.))-.5;
 p+=w*.32;float r=length(p);
 if(shape<.5)r=length(p*vec2(1.4,.8));
 else if(shape<1.5)r=length(p*vec2(.8,1.4));
 else if(shape>2.5&&shape<3.5)r*=1.+sin(atan(p.y,p.x)*3.+r*4.)*.14;
 else if(shape>3.5)r=min(length(p-vec2(.23,-.2)),length(p-vec2(-.24,.15)))*1.12;
 float e=clamp((1.2-r)/.85,0.,1.);e=e*e*(3.-2.*e);
 return clamp(e*(.42+.8*fbm(p*3.1+vec2(t*.65,-t*.4),seed+31.))*density,0.,1.);
}
void main(){
 vec2 uv=gl_FragCoord.xy/resolution;uv.y=1.-uv.y;
 vec2 world=camera+(uv-.5)*worldSize,p=(world-center)/extent;float d=field(p);
 if(diagnostic>.5){gl_FragColor=vec4(vec3(d),1.);return;}
 float grain=fbm(p*15.+vec2(visualTime*.05,-visualTime*.03),seed+61.);
 float filaments=pow(fbm(p*7.+vec2(grain*.8,visualTime*.04),seed+47.),2.);
 vec3 color=mix(palette*.25,palette*1.4,filaments*1.5+grain*.35);
 color+=vec3(.48,.63,.7)*pow(grain,5.)*(1.-dark);
 float alpha=clamp(d*(.64+grain*.32),0.,.88);
 color=floor(color*8.+.5)/8.;alpha=floor(alpha*10.+.5)/10.;
 gl_FragColor=vec4(color,alpha);
}`;
export const NEBULA_RENDER={high:{scale:.125,interval:80},low:{scale:.0833,interval:125}};
const VERTEX='attribute vec2 point;void main(){gl_Position=vec4(point,0,1);}';
function compile(gl,type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw Error(message);}return shader;}
export function createNebulaRenderer(){
 const canvas=document.createElement('canvas'),fallback=document.createElement('canvas'),surface=document.createElement('canvas');
 let gl,program,buffer,uniforms={},lost=false,last=-Infinity,signature='',mode='fallback',disposed=false;
 const init=()=>{try{
  gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,depth:false,preserveDrawingBuffer:true});if(!gl)return;
  const vertex=compile(gl,gl.VERTEX_SHADER,VERTEX),fragment=compile(gl,gl.FRAGMENT_SHADER,NEBULA_FRAGMENT);
  program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  for(const name of ['resolution','worldSize','camera','center','extent','time','visualTime','seed','shape','density','dark','diagnostic','palette'])uniforms[name]=gl.getUniformLocation(program,name);
  gl.useProgram(program);const attribute=gl.getAttribLocation(program,'point');gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);mode='webgl';lost=false;last=-Infinity;
 }catch(error){mode='fallback';console.warn('SHuTLe: 星雲を低負荷代替描画に切り替えます',error.message);}};
 const onLost=e=>{e.preventDefault();lost=true;mode='fallback';last=-Infinity;},onRestore=()=>{if(!disposed)init();};canvas.addEventListener('webglcontextlost',onLost);canvas.addEventListener('webglcontextrestored',onRestore);init();
 return {
  get mode(){return mode;},
  draw(width,height,game,{quality='high',reducedMotion=false}={}){
   const setting=NEBULA_RENDER[quality]||NEBULA_RENDER.high,factor=setting.scale,w=Math.max(1,Math.round(width*factor)),h=Math.max(1,Math.round(height*factor)),key=`${w}/${h}/${game.nebula.seed}/${quality}/${reducedMotion}`,now=performance.now();
   if(signature===key&&now-last<setting.interval)return mode==='webgl'?surface:fallback;
   last=now;signature=key;const time=game.flight.elapsed; // No wall-clock physics or random redraws.
   if(!gl||lost||mode!=='webgl'){
    // WebGL unavailable: sample the same density field at low resolution, never a different map.
    fallback.width=Math.max(1,Math.round(width*.05));fallback.height=Math.max(1,Math.round(height*.05));const ctx=fallback.getContext('2d'),image=ctx.createImageData(fallback.width,fallback.height);
    for(let y=0;y<fallback.height;y++)for(let x=0;x<fallback.width;x++){
     const point={x:game.flight.position.x+((x+.5)/fallback.width-.5)*width/1.55,y:game.flight.position.y+((y+.5)/fallback.height-.5)*height/1.55};let alpha=0,color=[0,0,0];
     for(const r of game.nebula.regions){const a=regionDensity(r,point,time)*.75;color=color.map((v,i)=>r.color[i]*a+v*(1-a));alpha=a+alpha*(1-a);}
     const index=(y*fallback.width+x)*4;for(let c=0;c<3;c++)image.data[index+c]=alpha?Math.round(color[c]/alpha*255):0;image.data[index+3]=Math.round(alpha*255);
    }ctx.putImageData(image,0,0);fallback.worldCamera={...game.flight.position};last=performance.now();return fallback;
   }
   if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
   gl.viewport(0,0,w,h);gl.disable(gl.SCISSOR_TEST);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(program);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
   gl.uniform2f(uniforms.resolution,w,h);gl.uniform2f(uniforms.worldSize,width/1.55,height/1.55);gl.uniform2f(uniforms.camera,game.flight.position.x,game.flight.position.y);gl.uniform1f(uniforms.time,time);gl.uniform1f(uniforms.visualTime,reducedMotion?0:time);gl.uniform1f(uniforms.diagnostic,0);
   for(const r of game.nebula.regions){
    const px=w/2+(r.position.x-game.flight.position.x)*1.55*factor,py=h/2+(r.position.y-game.flight.position.y)*1.55*factor,rx=r.extent.x*1.6*1.55*factor,ry=r.extent.y*1.6*1.55*factor;
    const left=Math.max(0,Math.floor(px-rx)),bottom=Math.max(0,Math.floor(h-py-ry)),right=Math.min(w,Math.ceil(px+rx)),top=Math.min(h,Math.ceil(h-py+ry));if(right<=left||top<=bottom)continue;
    gl.enable(gl.SCISSOR_TEST);gl.scissor(left,bottom,right-left,top-bottom);
    gl.uniform2f(uniforms.center,r.position.x,r.position.y);gl.uniform2f(uniforms.extent,r.extent.x,r.extent.y);gl.uniform1f(uniforms.seed,r.seed);gl.uniform1f(uniforms.shape,r.shape);gl.uniform1f(uniforms.density,r.density);gl.uniform1f(uniforms.dark,r.type==='dark'?1:0);gl.uniform3fv(uniforms.palette,r.color);gl.drawArrays(gl.TRIANGLES,0,6);
   }
   // Cache the GPU image once per gas update; normal frames reuse a 2D surface.
   if(surface.width!==w||surface.height!==h){surface.width=w;surface.height=h;}
   const surfaceContext=surface.getContext('2d');surfaceContext.clearRect(0,0,w,h);surfaceContext.drawImage(canvas,0,0);surface.worldCamera={...game.flight.position};last=performance.now();
   return surface;
  },
  dispose(){disposed=true;canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',onRestore);if(gl){gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext();}},
 };
}
