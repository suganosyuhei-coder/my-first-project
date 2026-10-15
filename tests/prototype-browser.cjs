const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.SHUTLE_CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}});const errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>requests.push(r.url()));
  const base=process.env.SHUTLE_TEST_URL||'http://127.0.0.1:5173/';const url=new URL('prototype.html',base.endsWith('/')?base:base+'/').href;
  await page.goto(url);await page.locator('.proto-flight').waitFor();
  await page.getByTestId('collection-job').first().waitFor();assert.equal(await page.getByTestId('inventory-tank').textContent(),'0');
  await page.waitForFunction(()=>['bit-1','bit-2'].every(id=>document.querySelector(`[data-testid=${id}]`).dataset.state!=='orbiting'));
  await page.waitForFunction(()=>Number(document.querySelector('[data-testid=inventory-wire]').textContent)>=1,{},{timeout:20000});
  assert.ok(Number(await page.getByTestId('proto-distance').textContent())>10);
  const initial=Number(await page.getByTestId('proto-distance').textContent()),beforeSteerTime=Number(await page.getByTestId('proto-time').textContent()),beforePosition=await page.locator('canvas').evaluate(e=>({x:Number(e.dataset.worldX),y:Number(e.dataset.worldY)}));await page.keyboard.down('KeyD');await page.waitForFunction(t=>Number(document.querySelector('[data-testid=proto-time]').textContent)>t+.4,beforeSteerTime);await page.keyboard.up('KeyD');assert.ok(Number(await page.getByTestId('proto-distance').textContent())>=initial);assert.ok(Number(await page.getByTestId('proto-time').textContent())>beforeSteerTime);const moved=await page.locator('canvas').evaluate(e=>({x:Number(e.dataset.worldX),y:Number(e.dataset.worldY)}));assert.ok(Math.hypot(moved.x-beforePosition.x,moved.y-beforePosition.y)>.1);
  await page.keyboard.down('ArrowLeft');await page.waitForTimeout(800);await page.keyboard.up('ArrowLeft');
  await page.getByRole('gridcell',{name:'セル X5 Y4',exact:true}).hover();assert.ok((await page.locator('.proto-placement-state').textContent()).includes('キャノピー'));await page.getByRole('gridcell',{name:'セル X5 Y4',exact:true}).click();assert.equal(await page.getByTestId('proto-parts').textContent(),'18 PARTS');
  const time=Number(await page.getByTestId('proto-time').textContent());
  await page.getByRole('gridcell',{name:'セル X7 Y10',exact:true}).click();await page.getByText('19 PARTS',{exact:true}).waitFor();assert.equal(await page.getByRole('gridcell',{name:'セル X6 Y10',exact:true}).getAttribute('data-pipe-mask'),'7');
  await page.getByRole('button',{name:'− 取り外し',exact:true}).click();await page.getByRole('gridcell',{name:'セル X7 Y10',exact:true}).click();await page.getByText('18 PARTS',{exact:true}).waitFor();assert.equal(await page.getByRole('gridcell',{name:'セル X6 Y10',exact:true}).getAttribute('data-pipe-mask'),'5');
  await page.getByRole('gridcell',{name:'セル X3 Y7',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-testid=proto-thrust]').textContent==='0'&&Number(document.querySelector('[data-testid=proto-speed]').textContent)>=12);assert.equal(await page.getByTestId('proto-thrust').textContent(),'0');
  await page.getByRole('button',{name:'PIPE 配管',exact:true}).click();await page.getByRole('gridcell',{name:'セル X3 Y7',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[data-testid=proto-thrust]').textContent==='12'&&Number(document.querySelector('[data-testid=proto-speed]').textContent)>=12);assert.equal(await page.getByRole('gridcell',{name:'セル X6 Y10',exact:true}).getAttribute('data-power'),'通電');
  const mass=Number(await page.getByTestId('proto-mass').textContent());await page.getByRole('button',{name:'TANK タンク',exact:true}).click();await page.getByRole('gridcell',{name:'セル X7 Y11',exact:true}).click();await page.waitForFunction(m=>Number(document.querySelector('[data-testid=proto-mass]').textContent)===m+60,mass);
  await page.getByRole('button',{name:'ENGINE エンジン',exact:true}).dragTo(page.getByRole('gridcell',{name:'セル X3 Y12',exact:true}));await page.getByText('20 PARTS',{exact:true}).waitFor();
  assert.ok(Number(await page.getByTestId('proto-time').textContent())>time);assert.equal(await page.locator('canvas').count(),1);assert.ok(!requests.some(r=>/three|rapier|Adventure|WorldEditor/.test(r)));
  assert.equal(await page.locator('[data-renderer=craft-flight]').count(),1);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));
  fs.mkdirSync(path.join(__dirname,'../artifacts'),{recursive:true});await page.mouse.move(10,10);await page.screenshot({path:path.join(__dirname,'../artifacts/prototype-v07.png'),fullPage:true});
  await page.reload();await page.locator('.proto-flight').waitFor();assert.equal(await page.getByTestId('proto-parts').textContent(),'18 PARTS');assert.equal(await page.getByTestId('inventory-tank').textContent(),'0');await page.waitForFunction(()=>Number(document.querySelector('[data-testid=proto-time]').textContent)>.5);
  await page.setViewportSize({width:1100,height:850});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));assert.deepEqual(errors,[]);
  console.log('PASS: automatic bit flight/return/inventory, automatic navigation, steering, ongoing craft, invalid placement, pipe adjacency, energy cut/reconnect/minimum flight, drag/drop, shared craft-driven flight ship, layout and reload');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
