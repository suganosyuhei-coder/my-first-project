const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.SHUTLE_CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>requests.push(r.url()));
  const base=process.env.SHUTLE_TEST_URL||'http://127.0.0.1:5173/';const url=new URL('prototype.html',base.endsWith('/')?base:base+'/').href;
  await page.goto(url);await page.getByRole('heading',{name:'宇宙を縫う、船をつくる。'}).waitFor();
  await page.waitForFunction(()=>Number(document.querySelector('[data-testid=proto-distance]').textContent)>10);
  const initial=Number(await page.getByTestId('proto-distance').textContent());
  await page.keyboard.down('KeyD');await page.waitForFunction(()=>Number(document.querySelector('[data-testid=proto-heading]').textContent)>15);await page.keyboard.up('KeyD');
  assert.ok(Number(await page.getByTestId('proto-distance').textContent())>initial);
  await page.keyboard.down('ArrowLeft');await page.waitForTimeout(1400);await page.keyboard.up('ArrowLeft');
  await page.getByRole('gridcell',{name:'セル X5 Y4',exact:true}).hover();assert.ok(await page.locator('.proto-placement-state').textContent().then(t=>t.includes('キャノピー')));
  await page.getByRole('gridcell',{name:'セル X5 Y4',exact:true}).click();assert.equal(await page.getByTestId('proto-parts').textContent(),'6 PARTS');
  const before=Number(await page.getByTestId('proto-time').textContent());
  await page.getByRole('gridcell',{name:'セル X6 Y10',exact:true}).click();assert.equal(await page.getByTestId('proto-parts').textContent(),'7 PARTS');
  assert.equal(await page.getByRole('gridcell',{name:'セル X6 Y9',exact:true}).getAttribute('data-pipe-mask'),'7');
  await page.getByRole('button',{name:'− 取り外し',exact:true}).click();await page.getByRole('gridcell',{name:'セル X6 Y10',exact:true}).click();assert.equal(await page.getByTestId('proto-parts').textContent(),'6 PARTS');
  assert.equal(await page.getByRole('gridcell',{name:'セル X6 Y9',exact:true}).getAttribute('data-pipe-mask'),'3');
  const mass=Number(await page.getByTestId('proto-mass').textContent());
  await page.getByRole('button',{name:'TANK タンク',exact:true}).click();await page.getByRole('gridcell',{name:'セル X7 Y11',exact:true}).click();assert.equal(Number(await page.getByTestId('proto-mass').textContent()),mass+60);
  await page.getByRole('button',{name:'ENGINE エンジン',exact:true}).dragTo(page.getByRole('gridcell',{name:'セル X3 Y12',exact:true}));assert.equal(await page.getByTestId('proto-parts').textContent(),'8 PARTS');
  await page.waitForFunction(t=>Number(document.querySelector('[data-testid=proto-time]').textContent)>t+.5,before);
  assert.equal(await page.locator('canvas').count(),1);assert.ok(!requests.some(r=>/three|rapier|Adventure|WorldEditor/.test(r)));
  const boxes=await page.evaluate(()=>['.proto-flight','.proto-craft','.proto-hud'].map(selector=>{const n=document.querySelector(selector);return n;}).map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));assert.ok(boxes[0].width>boxes[1].width);assert.ok(boxes[0].x+boxes[0].width<=boxes[1].x+1);assert.ok(boxes.every(b=>b.width>0&&b.height>0));
  fs.mkdirSync(path.join(__dirname,'../artifacts'),{recursive:true});await page.mouse.move(10,10);await page.screenshot({path:path.join(__dirname,'../artifacts/prototype-v06.png'),fullPage:true});
  await page.reload();await page.getByRole('heading',{name:'宇宙を縫う、船をつくる。'}).waitFor();assert.equal(await page.getByTestId('proto-parts').textContent(),'6 PARTS');await page.waitForFunction(()=>Number(document.querySelector('[data-testid=proto-time]').textContent)>.5);
  await page.setViewportSize({width:1100,height:850});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  assert.deepEqual(errors,[]);
  console.log('PASS: independent 2D route, automatic flight, A/D and arrows, ongoing craft, invalid placement, sixteen-mask logic integration, removal, mass, drag/drop, HUD, PC layout and reload; no 3D modules loaded');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
