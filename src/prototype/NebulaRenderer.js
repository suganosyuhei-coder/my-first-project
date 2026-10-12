import {regionDensity,noise} from './nebula.js';
import {NEBULA_DETAIL,observationDetailWeight,observationCrop} from './nebulaDetail.js';
// Pure 2D WebGL overlay: no 3D library, asset, or framebuffer readback in gameplay.
export const NEBULA_FRAGMENT=`
precision highp float;
uniform vec2 resolution,worldSize,camera,center,extent,coarseOrigin,coarseStep,colorLevels;
uniform float time,visualTime,seed,shape,density,dark,diagnostic,detailPass,observationRadius,observationFeather;
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
vec4 shade(vec2 world,float detail){
 vec2 p=(world-center)/extent;float d=field(p);if(d<.003)return vec4(0.);
 float grain=fbm(p*mix(15.,35.,detail)+vec2(visualTime*.05,-visualTime*.03),seed+61.);
 float filaments=pow(fbm(p*mix(7.,14.,detail)+vec2(grain*.8,visualTime*.04),seed+47.),2.);
 vec3 color=mix(palette*.25,palette*1.4,filaments*1.5+grain*.35);
 color+=vec3(.48,.63,.7)*pow(grain,5.)*(1.-dark);
 float alpha=clamp(d*(.64+grain*.32),0.,.88),levels=mix(colorLevels.x,colorLevels.y,detail);
 return vec4(floor(color*levels+.5)/levels,floor(alpha*levels+.5)/levels);
}
float detailWeight(vec2 world){if(observationRadius<=0.)return 0.;return 1.-smoothstep(max(0.,observationRadius-observationFeather),observationRadius,length(world-camera));}
void main(){
 vec2 uv=gl_FragCoord.xy/resolution;uv.y=1.-uv.y;
 vec2 world=camera+(uv-.5)*worldSize;
 if(diagnostic>.5&&diagnostic<1.5){gl_FragColor=vec4(vec3(field((world-center)/extent)),1.);return;}
 if(diagnostic>1.5){gl_FragColor=vec4(vec3(detailWeight(world)),1.);return;}
 if(detailPass<.5){gl_FragColor=shade(world,0.);return;}
 vec2 coarse=coarseOrigin+(floor((world-coarseOrigin)/coarseStep)+.5)*coarseStep;
 float weight=detailWeight(world);vec4 base=shade(coarse,0.);
 gl_FragColor=weight>0.?mix(base,shade(world,1.),weight):base;
}`;
export const NEBULA_RENDER={high:{scale:.25,detailScale:.5,interval:80},low:{scale:1/6,detailScale:1/3,interval:125}};
const VERTEX='attribute vec2 point;void main(){gl_Position=vec4(point,0,1);}';
function compile(gl,type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw Error(message);}return shader;}
export function createNebulaRenderer(){
 const canvas=document.createElement('canvas'),coarseSurface=document.createElement('canvas'),detailSurface=document.createElement('canvas'),surface=document.createElement('canvas');
 let gl,program,buffer,uniforms={},lost=false,last=-Infinity,signature='',mode='fallback',disposed=false;
 const init=()=>{try{
  gl=canvas.getContext('webgl',{alpha:true,premultipliedAlpha:false,antialias:false,depth:false,preserveDrawingBuffer:true});if(!gl)return;
  const vertex=compile(gl,gl.VERTEX_SHADER,VERTEX),fragment=compile(gl,gl.FRAGMENT_SHADER,NEBULA_FRAGMENT);
  program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  for(const name of ['resolution','worldSize','camera','center','extent','time','visualTime','seed','shape','density','dark','diagnostic','coarseOrigin','coarseStep','detailPass','observationRadius','observationFeather','colorLevels'])uniforms[name]=gl.getUniformLocation(program,name);
  uniforms.palette=gl.getUniformLocation(program,'palette');
  gl.useProgram(program);const attribute=gl.getAttribLocation(program,'point');gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);mode='webgl';lost=false;last=-Infinity;
 }catch(error){mode='fallback';console.warn('SHuTLe: 星雲を低負荷代替描画に切り替えます',error.message);}};
 const onLost=e=>{e.preventDefault();lost=true;mode='fallback';last=-Infinity;},onRestore=()=>{if(!disposed)init();};canvas.addEventListener('webglcontextlost',onLost);canvas.addEventListener('webglcontextrestored',onRestore);init();
 function cpuShade(game,point,time,fine,visualTime=time){let color=[0,0,0],alpha=0;
  for(const r of game.nebula.regions){const d=regionDensity(r,point,time);if(d<.003)continue;const p={x:(point.x-r.position.x)/r.extent.x,y:(point.y-r.position.y)/r.extent.y},grain=noise(p.x*(fine?35:15)+visualTime*.05,p.y*(fine?35:15)-visualTime*.03,r.seed+61),levels=fine?NEBULA_DETAIL.fineLevels:NEBULA_DETAIL.coarseLevels,a=Math.round(d*(.64+grain*.32)*levels)/levels;
   color=color.map((v,i)=>Math.round(r.color[i]*(.45+grain*.6)*levels)/levels*a+v*(1-a));alpha=a+alpha*(1-a);
  }return [...color,alpha];
 }
 function pass(game,target,screenW,screenH,resolutionScale,detail,time,reducedMotion,origin,step){
  const w=Math.max(1,Math.round(screenW*resolutionScale)),h=Math.max(1,Math.round(screenH*resolutionScale)),scale=game.viewport.scale;
  target.width=w;target.height=h;
  if(!gl||lost||mode!=='webgl'){
   const ctx=target.getContext('2d'),image=ctx.createImageData(w,h);
   for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const point={x:game.flight.position.x+((x+.5)/w-.5)*screenW/scale,y:game.flight.position.y+((y+.5)/h-.5)*screenH/scale};
    let rgba;
    if(detail){const coarse={x:origin.x+(Math.floor((point.x-origin.x)/step.x)+.5)*step.x,y:origin.y+(Math.floor((point.y-origin.y)/step.y)+.5)*step.y},weight=observationDetailWeight(point,game.flight.position,game.observation),base=cpuShade(game,coarse,time,false,reducedMotion?0:time),fine=weight?cpuShade(game,point,time,true,reducedMotion?0:time):base;rgba=base.map((v,i)=>v+(fine[i]-v)*weight);}else rgba=cpuShade(game,point,time,false,reducedMotion?0:time);
    const index=(y*w+x)*4;for(let i=0;i<3;i++)image.data[index+i]=rgba[3]?Math.round(rgba[i]/rgba[3]*255):0;image.data[index+3]=Math.round(rgba[3]*255);
   }ctx.putImageData(image,0,0);return;
  }
  canvas.width=w;canvas.height=h;gl.viewport(0,0,w,h);gl.disable(gl.SCISSOR_TEST);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(program);gl.enable(gl.BLEND);gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  gl.uniform2f(uniforms.resolution,w,h);gl.uniform2f(uniforms.worldSize,screenW/scale,screenH/scale);gl.uniform2f(uniforms.camera,game.flight.position.x,game.flight.position.y);gl.uniform1f(uniforms.time,time);gl.uniform1f(uniforms.visualTime,reducedMotion?0:time);gl.uniform1f(uniforms.diagnostic,0);
  gl.uniform2f(uniforms.coarseOrigin,origin.x,origin.y);gl.uniform2f(uniforms.coarseStep,step.x,step.y);gl.uniform1f(uniforms.detailPass,detail?1:0);gl.uniform1f(uniforms.observationRadius,game.observation);gl.uniform1f(uniforms.observationFeather,NEBULA_DETAIL.feather);gl.uniform2f(uniforms.colorLevels,NEBULA_DETAIL.coarseLevels,NEBULA_DETAIL.fineLevels);
  for(const r of game.nebula.regions){
   const px=w/2+(r.position.x-game.flight.position.x)*scale*resolutionScale,py=h/2+(r.position.y-game.flight.position.y)*scale*resolutionScale,rx=r.extent.x*1.6*scale*resolutionScale,ry=r.extent.y*1.6*scale*resolutionScale;
   const left=Math.max(0,Math.floor(px-rx)),bottom=Math.max(0,Math.floor(h-py-ry)),right=Math.min(w,Math.ceil(px+rx)),top=Math.min(h,Math.ceil(h-py+ry));if(right<=left||top<=bottom)continue;
   gl.enable(gl.SCISSOR_TEST);gl.scissor(left,bottom,right-left,top-bottom);
   gl.uniform2f(uniforms.center,r.position.x,r.position.y);gl.uniform2f(uniforms.extent,r.extent.x,r.extent.y);gl.uniform1f(uniforms.seed,r.seed);gl.uniform1f(uniforms.shape,r.shape);gl.uniform1f(uniforms.density,r.density);gl.uniform1f(uniforms.dark,r.type==='dark'?1:0);gl.uniform3fv(uniforms.palette,r.color);gl.drawArrays(gl.TRIANGLES,0,6);
  }
  target.getContext('2d').drawImage(canvas,0,0);
 }
 return {
  get mode(){return mode;},
  draw(width,height,game,{quality='high',reducedMotion=false}={}){
   if(width<=0||height<=0)return surface;
   const setting=NEBULA_RENDER[quality]||NEBULA_RENDER.high,key=`${width}/${height}/${game.viewport.scale}/${game.nebula.seed}/${quality}/${reducedMotion}/${Math.round(game.observation)}`,now=performance.now();
   if(signature===key&&now-last<setting.interval)return surface;
   signature=key;const time=game.flight.elapsed,scale=game.viewport.scale;
   const fallback=mode!=='webgl',coarseScale=fallback?.125:setting.scale,detailScale=fallback?.25:setting.detailScale;
   const lowW=Math.max(1,Math.round(width*coarseScale)),lowH=Math.max(1,Math.round(height*coarseScale)),origin={x:game.flight.position.x-width/scale/2,y:game.flight.position.y-height/scale/2},step={x:width/scale/lowW,y:height/scale/lowH};
   pass(game,coarseSurface,width,height,coarseScale,false,time,reducedMotion,origin,step);
   surface.width=Math.max(1,Math.round(width));surface.height=Math.max(1,Math.round(height));const ctx=surface.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(coarseSurface,0,0,width,height);
   if(game.observation>0){
    const crop=observationCrop(width,height,scale,game.observation);pass(game,detailSurface,crop.width,crop.height,detailScale,true,time,reducedMotion,origin,step);
    // Copy replaces coarse gas in the crop; the shader returns the identical coarse field outside the circle.
    ctx.save();ctx.beginPath();ctx.rect(crop.left,crop.top,crop.width,crop.height);ctx.clip();ctx.globalCompositeOperation='copy';ctx.drawImage(detailSurface,crop.left,crop.top,crop.width,crop.height);ctx.restore();
   }
   surface.worldCamera={...game.flight.position};surface.detailRadius=game.observation;surface.coarsePixel=1/coarseScale;surface.finePixel=1/detailScale;last=performance.now();return surface;
  },
  dispose(){disposed=true;canvas.removeEventListener('webglcontextlost',onLost);canvas.removeEventListener('webglcontextrestored',onRestore);if(gl){gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext();}},
 };
}
