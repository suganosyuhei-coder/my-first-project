const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.SHUTLE_CHROMIUM_PATH||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',e=>{if(e.type()==='error')errors.push(e.text());});
  const base=process.env.SHUTLE_TEST_URL||'http://127.0.0.1:5173/';await page.goto(new URL('prototype.html',base).href);await page.getByRole('meter',{name:'BEAMチャージ'}).waitFor();
  assert.equal(await page.locator('[data-renderer=flight-shuttle]').count(),1);assert.equal(await page.locator('[data-renderer=pseudo-2d]').count(),0);
  const compact=await page.locator('.proto-beam').evaluate(element=>{const box=element.getBoundingClientRect();return {height:box.height,visibleText:element.innerText};});assert.ok(compact.height<=24,JSON.stringify(compact));assert.equal(compact.visibleText,'BEAM');
  await page.getByRole('gridcell',{name:'セル X7 Y10',exact:true}).focus();await page.keyboard.down('Space');await page.waitForFunction(()=>Number(document.querySelector('[data-testid=beam-meter]').getAttribute('aria-valuenow'))===100);await page.keyboard.up('Space');
  await page.waitForFunction(()=>document.querySelector('[data-testid=hit-count]').textContent==='1');fs.mkdirSync('artifacts',{recursive:true});await page.screenshot({path:'artifacts/beam-redesign.png',fullPage:true});
  await page.keyboard.press('Space');await page.waitForTimeout(100);assert.equal(await page.getByTestId('hit-count').textContent(),'1');
  await page.waitForFunction(()=>Number(document.querySelector('[data-testid=proto-distance]').textContent)>300,{},{timeout:20000});await page.screenshot({path:'artifacts/pixel-flight-redesign.png',fullPage:true});
  // Removed rock remains absent after multiple fixed updates; no second hit on its old location.
  assert.equal(await page.getByTestId('hit-count').textContent(),'1');assert.ok(Number(await page.getByTestId('proto-time').textContent())>5);
  await page.getByRole('button',{name:'PIPE 配管',exact:true}).click();await page.getByRole('gridcell',{name:'セル X7 Y10',exact:true}).click();await page.getByText('19 PARTS',{exact:true}).waitFor();
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const meter=await page.locator('.proto-beam').boundingBox(),flight=await page.locator('.proto-flight').boundingBox();assert.ok(meter.x+meter.width<=flight.x+flight.width+1);assert.ok(meter.height<=24);
  assert.deepEqual(errors,[]);console.log('PASS: compact BEAM-only HUD, winged ship, instant beam/rock destruction/no repeat hit, continued flight/craft and mobile layout');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
