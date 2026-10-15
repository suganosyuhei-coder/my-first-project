import test from 'node:test';
import assert from 'node:assert/strict';
import {productionTuning} from '../src/prototype/runtimeTuning.js';
import {createNebulaRenderer} from '../src/prototype/NebulaRenderer.js';

function fakeDocument(webgl){
 const canvases=[];
 const document={createElement(){
  let width=300,height=150;
  const canvas={resizes:0,images:0,copies:[],clears:[],listeners:{},addEventListener(name,fn){this.listeners[name]=fn;},removeEventListener(){},get width(){return width;},set width(n){width=n;this.resizes++;},get height(){return height;},set height(n){height=n;this.resizes++;}};
  const ctx={createImageData(w,h){canvas.images++;return {width:w,height:h,data:new Uint8ClampedArray(w*h*4)};},putImageData(image){canvas.lastPixels=[...image.data];},clearRect(...rect){canvas.clears.push(rect);},drawImage(...args){canvas.copies.push(args);},save(){},restore(){},beginPath(){},rect(){},clip(){}};
  const gl=new Proxy({getShaderParameter:()=>true,getProgramParameter:()=>true,getAttribLocation:()=>0,getUniformLocation:(_,name)=>name,getExtension:()=>null},{get(target,key){return key in target?target[key]:key===key.toUpperCase()?1:()=>({});}});
  canvas.getContext=type=>type==='webgl'?(webgl?gl:null):ctx;
  canvases.push(canvas);return canvas;
 }};
 return {document,canvases};
}
const game=()=>({viewport:{scale:1},flight:{position:{x:0,y:0},heading:0,elapsed:0},nebula:{seed:1,regions:[]},observation:4,tuning:{...productionTuning(),nebula:{...productionTuning().nebula,dotMultiplier:1}}});

test('GL and 2D surfaces reuse allocation, clear transparent old pixels, crop the active GL viewport and grow on resize',t=>{
 const fake=fakeDocument(true);const previous=globalThis.document;globalThis.document=fake.document;t.after(()=>{globalThis.document=previous;});
 const renderer=createNebulaRenderer(),g=game();const surface=renderer.draw(80,60,g);
 const [glCanvas,coarse,detail]=fake.canvases,counts=fake.canvases.map(c=>c.resizes);
 assert.equal(renderer.mode,'webgl');
 renderer.draw(80,60,g,{reducedMotion:true});
 assert.deepEqual(fake.canvases.map(c=>c.resizes),counts);
 for(const target of [coarse,detail]){
  const copy=target.copies.at(-1);assert.equal(copy[0],glCanvas);
  assert.deepEqual(copy.slice(1),[0,glCanvas.height-target.height,target.width,target.height,0,0,target.width,target.height]);
  assert.deepEqual(target.clears.at(-1),[0,0,target.width,target.height]);
 }
 assert.deepEqual(surface.clears.at(-1),[0,0,80,60]);
 renderer.draw(1600,900,g);assert.equal(surface.width,1600);assert.equal(surface.height,900);assert.equal(glCanvas.width,400);assert.equal(glCanvas.height,225);
 const grown=glCanvas.resizes;renderer.draw(80,60,g);assert.equal(glCanvas.resizes,grown);renderer.dispose();
});
test('CPU fallback reuses ImageData without stale pixels and reallocates only for changed dimensions',t=>{
 const fake=fakeDocument(false);const previous=globalThis.document;globalThis.document=fake.document;t.after(()=>{globalThis.document=previous;});
 const renderer=createNebulaRenderer(),g=game();g.observation=0;
 g.nebula.regions=[{position:{x:0,y:0},extent:{x:100,y:100},seed:1,density:1,shape:0,color:[1,.2,.3],type:'energetic'}];
 renderer.draw(16,16,g);const coarse=fake.canvases[1];assert.ok(coarse.lastPixels.some(n=>n>0));
 const resizes=fake.canvases.map(c=>c.resizes);assert.equal(coarse.images,1);
 g.nebula.regions=[];renderer.draw(16,16,g,{reducedMotion:true});assert.equal(coarse.images,1);assert.deepEqual(fake.canvases.map(c=>c.resizes),resizes);assert.ok(coarse.lastPixels.every(n=>n===0));
 renderer.draw(24,16,g);assert.equal(coarse.images,2);renderer.dispose();
});
