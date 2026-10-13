const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.SHUTLE_TEST_URL||'http://127.0.0.1:5173/prototype.html');
  const force=page.getByTestId('force');await force.waitFor();assert.equal(await page.getByTestId('bit-1').count(),1);assert.equal(await page.getByTestId('bit-2').count(),1);
  assert.equal(await force.locator('[data-force-body=sphere]').count(),1);assert.equal(await force.locator('[data-force-antennas]').getAttribute('data-force-antennas'),'4');
  assert.equal(await force.locator('[data-force-rod]').count(),4);
  const rod=force.locator('[data-force-rod="0"]'),initial=await rod.getAttribute('transform');
  await page.waitForFunction(value=>document.querySelector('[data-force-rod="0"]').getAttribute('transform')!==value,initial);
  assert.ok(Number(await force.getAttribute('data-width'))>0);
  fs.mkdirSync('artifacts',{recursive:true});
  await page.keyboard.press('Space');await page.waitForFunction(()=>Number(document.querySelector('[data-testid=shot-count]').textContent)===1);
  await page.locator('.proto-flight').screenshot({path:'artifacts/force-normal.png'});
  await page.keyboard.down('Space');await page.waitForFunction(()=>Number(document.querySelector('[data-testid=beam-meter]').getAttribute('aria-valuenow'))===100);
  await page.locator('.proto-flight').screenshot({path:'artifacts/force-charge.png'});
  await page.keyboard.up('Space');await page.waitForFunction(()=>Number(document.querySelector('[data-testid=shot-count]').textContent)===2);
  await page.locator('.proto-flight').screenshot({path:'artifacts/force-charged.png'});
  assert.equal(await page.getByTestId('last-shot').getAttribute('data-stage'),'2');
  assert.ok(Number(await page.getByTestId('proto-time').textContent())>2);
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.ok(await force.isVisible());
  await page.reload();await page.getByTestId('force').waitFor();assert.equal(await page.getByTestId('shot-count').textContent(),'0');
  assert.deepEqual(errors,[]);console.log('PASS: initial force + two bits, normal/charged input, charge continuity, mobile layout, reload, no browser errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
