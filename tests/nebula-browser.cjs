const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const {NEBULA_FRAGMENT}=await import('../src/prototype/NebulaRenderer.js');
 const {nebulaRegions,regionDensity}=await import('../src/prototype/nebula.js');
 const cases=[];
 for(const region of nebulaRegions(7309,{x:0,y:0},2500).slice(0,20))for(const time of [0,17])for(const offset of [0,.4,1.1]){
  const point={x:region.position.x+region.extent.x*offset,y:region.position.y-region.extent.y*offset*.5};cases.push({region,point,time,expected:regionDensity(region,point,time)});
 }
 const browser=await chromium.launch({executablePath:process.env.SHUTLE_CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1200}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
  const base=process.env.SHUTLE_TEST_URL||'http://127.0.0.1:5173/';await page.goto(new URL('prototype.html',base).href);
  await page.waitForFunction(()=>document.querySelector('canvas').dataset.nebulaRenderer==='webgl');
  // Diagnostic framebuffer sampling is test-only; gameplay does not read GPU pixels.
  const agreement=await page.evaluate(({source,cases})=>{
   const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const gl=canvas.getContext('webgl',{preserveDrawingBuffer:true});if(!gl)throw Error('WebGL unavailable in shader test');
   const compile=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
   const program=gl.createProgram();gl.attachShader(program,compile(gl.VERTEX_SHADER,'attribute vec2 point;void main(){gl_Position=vec4(point,0,1);}'));gl.attachShader(program,compile(gl.FRAGMENT_SHADER,source));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));gl.useProgram(program);
   const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const a=gl.getAttribLocation(program,'point');gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);
   const u=name=>gl.getUniformLocation(program,name),pixel=new Uint8Array(4);gl.viewport(0,0,1,1);gl.uniform2f(u('resolution'),1,1);gl.uniform2f(u('worldSize'),1,1);gl.uniform1f(u('diagnostic'),1);let maxError=0;const info=gl.getExtension('WEBGL_debug_renderer_info'),gpu=info?gl.getParameter(info.UNMASKED_RENDERER_WEBGL):'unreported';
   for(const c of cases){const r=c.region;gl.uniform2f(u('camera'),c.point.x,c.point.y);gl.uniform2f(u('center'),r.position.x,r.position.y);gl.uniform2f(u('extent'),r.extent.x,r.extent.y);gl.uniform1f(u('time'),c.time);gl.uniform1f(u('seed'),r.seed);gl.uniform1f(u('shape'),r.shape);gl.uniform1f(u('density'),r.density);gl.drawArrays(gl.TRIANGLES,0,6);gl.readPixels(0,0,1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);maxError=Math.max(maxError,Math.abs(pixel[0]/255-c.expected));}
   gl.getExtension('WEBGL_lose_context')?.loseContext();return {maxError,count:cases.length,gpu};
  },{source:NEBULA_FRAGMENT,cases});assert.ok(agreement.maxError<.012,JSON.stringify(agreement));
  await page.reload();await page.locator('[data-nebula]').first().waitFor();assert.equal(await page.getByTestId('nebula-analysis').getAttribute('data-state'),'unobserved');assert.equal(await page.locator('.proto-nebula-panel dl').count(),0);
  const t0=Number(await page.getByTestId('proto-time').textContent());await page.locator('[data-nebula]').first().click();
  await page.waitForFunction(()=>document.querySelector('[data-testid=nebula-analysis]').dataset.state==='analyzed',{},{timeout:15000});assert.ok(await page.locator('.proto-nebula-panel dl').textContent());assert.ok(Number(await page.getByTestId('proto-time').textContent())>t0+3.8);
  await page.getByRole('combobox',{name:'星雲画質'}).selectOption('low');await page.getByRole('checkbox',{name:'装飾の動きを抑える'}).check();await page.waitForFunction(()=>document.querySelector('canvas').dataset.nebulaRenderer==='webgl');
  await page.getByRole('gridcell',{name:'セル X7 Y10',exact:true}).focus();await page.keyboard.down('Space');await page.waitForFunction(()=>Number(document.querySelector('[data-testid=beam-meter]').getAttribute('aria-valuenow'))>=50);await page.keyboard.up('Space');await page.getByTestId('last-shot').waitFor({state:'attached'});assert.ok(Number(await page.getByTestId('shot-count').textContent())>=1);
  await page.getByRole('button',{name:'PIPE 配管',exact:true}).click();await page.getByRole('gridcell',{name:'セル X7 Y10',exact:true}).click();await page.getByText('19 PARTS',{exact:true}).waitFor();
  await page.getByRole('combobox',{name:'星雲画質'}).selectOption('high');await page.getByRole('checkbox',{name:'装飾の動きを抑える'}).uncheck();await page.waitForFunction(()=>Number(document.querySelector('[data-testid=proto-distance]').textContent)>=230,{},{timeout:15000});
  fs.mkdirSync('artifacts',{recursive:true});await page.mouse.move(0,0);await page.screenshot({path:'artifacts/prototype-v09.png',fullPage:true});
  // Measure responsiveness without claiming a universal FPS guarantee on software/headless GPUs.
  const performanceSample=await page.evaluate(()=>new Promise(resolve=>{let previous=performance.now(),count=0,intervals=[];const start=previous;const tick=now=>{intervals.push(now-previous);previous=now;count++;if(now-start>=1200)resolve({frames:count,maxFrame:Math.max(...intervals),meanFrame:(now-start)/count});else requestAnimationFrame(tick);};requestAnimationFrame(tick);}));assert.ok(performanceSample.frames>=10,JSON.stringify(performanceSample));
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const beam=await page.locator('.proto-beam').boundingBox(),flight=await page.locator('.proto-flight').boundingBox();assert.ok(beam.x+beam.width<=flight.x+flight.width+1);
  await page.reload();assert.equal(await page.locator('[aria-label="星雲画質"]').inputValue(),'low');await page.getByTestId('nebula-analysis').waitFor();assert.equal(await page.getByTestId('nebula-analysis').getAttribute('data-state'),'unobserved');
  const fallback=await browser.newPage({viewport:{width:1100,height:900},reducedMotion:'reduce'});
  await fallback.addInitScript(()=>{const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return type==='webgl'?null:original.call(this,type,...args);};});fallback.on('pageerror',e=>errors.push(e.message));await fallback.goto(new URL('prototype.html',base).href);await fallback.getByTestId('nebula-renderer').waitFor();assert.ok((await fallback.getByTestId('nebula-renderer').textContent()).includes('代替描画'));assert.ok(await fallback.getByRole('checkbox',{name:'装飾の動きを抑える'}).isChecked());await fallback.waitForFunction(()=>Number(document.querySelector('[data-testid=proto-time]').textContent)>.5);
  assert.deepEqual(errors,[]);console.log('PASS: v0.9 WebGL/CPU density agreement',JSON.stringify(agreement),'analysis disclosure, live flight/craft/shot, low quality, reduced motion, mobile, reload and no-WebGL fallback;',JSON.stringify(performanceSample));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
