const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const base=process.env.SHUTLE_TEST_URL||'http://127.0.0.1:5173/';fs.mkdirSync('artifacts',{recursive:true});
  await page.goto(new URL('prototype.html',base).href);await page.getByTestId('campaign-status').waitFor();assert.equal((await page.getByTestId('campaign-status').textContent()).includes('/ 191'),false);await page.getByTestId('kill-stars').waitFor({state:'attached'});
  const boost=page.getByTestId('boost-meter');assert.equal(await boost.getAttribute('data-enabled'),'true');assert.equal(await boost.getAttribute('data-level'),'1');
  await page.keyboard.down('Shift');await page.waitForFunction(()=>Number(document.querySelector('[data-testid=boost-meter]').getAttribute('aria-valuenow'))===100);await page.keyboard.up('Shift');await page.waitForFunction(()=>document.querySelector('[data-testid=boost-meter]').dataset.bursts==='1');
  for(const demo of ['campaign-front','campaign-home','campaign-boss']){
   await page.goto(new URL(`prototype.html?demo=${demo}`,base).href);await page.waitForFunction(()=>Number(document.querySelector('.proto-flight canvas').dataset.campaignUnits)>0);
   await page.getByRole('button',{name:'DEV 調整',exact:true}).click();await page.getByLabel('カメラ / 表示ズーム倍率 数値',{exact:true}).fill('.5');await page.getByRole('button',{name:'調整パネルを閉じる',exact:true}).click();
   if(demo==='campaign-boss')await page.getByTestId('boss-hp').waitFor();
   await page.locator('.proto-flight').screenshot({path:`artifacts/${demo}.png`});
   assert.ok(await page.getByTestId('force').isVisible());assert.equal(await page.getByTestId('bit-1').count(),1);assert.equal(await page.getByTestId('bit-2').count(),1);
  }
  await page.setViewportSize({width:390,height:844});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  // Run the real combat reducer, then render its real clear component in isolation.
  const result=await page.evaluate(async()=>{
   const {createGame,stepGame,snapshot}=await import('/src/prototype/game.js');
   const {default:FlightResult}=await import('/src/prototype/FlightResult.jsx');
   const reactModule=await import('/node_modules/.vite/deps/react.js');const React=reactModule.default??reactModule;
   const clientModule=await import('/node_modules/.vite/deps/react-dom_client.js');const {createRoot}=clientModule.default??clientModule;
   const game=createGame();game.nebula.regions=[];game.hazards=[];game.bits.forEach(b=>b.state='returning');
   const boss=game.campaign.units.find(e=>e.id==='final-boss');for(const enemy of game.campaign.units)if(enemy!==boss)enemy.hp=0;boss.hp=1;
   game.flight.position={x:boss.position.x,y:boss.position.y+400};game.flight.maxDistance=6400;game.ship.parts.find(p=>p.type==='tank').stored=160;const {stepRailgun}=await import('/src/prototype/railgun.js');stepRailgun(game,[{type:'weapon-press'}],1.2);game.commands.push({type:'weapon-release'});stepGame(game,0,1/60);
   const fixture=document.createElement('div');document.body.append(fixture);createRoot(fixture).render(React.createElement(FlightResult,{telemetry:snapshot(game),restart:()=>{fixture.remove();}}));
   return {status:game.status,distance:game.end.maxDistance,elapsed:game.flight.elapsed};
  });
  assert.equal(result.status,'cleared');assert.equal(result.distance,6400);await page.getByRole('dialog',{name:'作戦クリア'}).waitFor();assert.equal(await page.getByTestId('result-distance').textContent(),'6400.0 m');await page.screenshot({path:'artifacts/campaign-clear.png'});
  await page.getByRole('button',{name:'装備を維持して航行再開',exact:true}).click();assert.equal(await page.getByRole('dialog',{name:'作戦クリア'}).count(),0);
  assert.deepEqual(errors,[]);console.log('PASS: 191-unit mission, front/home/boss views, force + recovery bits, mobile layout, real boss-kill reducer and clear/distance component');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
