const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1400,height:800},reducedMotion:'reduce'}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5173/');
 await page.evaluate(async()=>{
  const React=(await import('/node_modules/.vite/deps/react.js')).default,client=await import('/node_modules/.vite/deps/react-dom_client.js'),{createRoot}=client.default??client;
  const {createGame,snapshot}=await import('/src/prototype/game.js'),{stepTrueBoss}=await import('/src/prototype/trueBoss.js'),{drawStableSpace}=await import('/src/prototype/StableSpaceEffects.js'),{drawTrueBoss}=await import('/src/prototype/TrueBossVisuals.js'),{default:PilotPortrait}=await import('/src/prototype/PilotPortrait.jsx');
  document.querySelector('#root').style.display='none';const root=document.createElement('div');root.id='boss-boundary-fixture';document.body.append(root);root.style.cssText='display:flex;gap:16px;padding:12px;background:#101820;color:white';
  const canvas=document.createElement('canvas');canvas.width=1100;canvas.height=700;canvas.style.cssText='width:1100px;height:700px;max-width:none';root.append(canvas);const panel=document.createElement('aside');panel.style.cssText='width:250px;flex-shrink:0';root.append(panel);
  const g=createGame({stableStart:true,campaign:false});g.stableSpace.phase='normal';g.viewport={width:1100,height:700,scale:.8};g.flight.elapsed=10;
  const eye={id:'true-eye',type:'trueEye',hp:1,position:{x:900,y:0},trueBossPart:true,campaign:true,detected:true};g.trueBoss={phase:'pursuit',timer:0,position:{...eye.position},parts:[eye],debris:[],attackClock:100,absorbed:true};stepTrueBoss(g,5);
  const ctx=canvas.getContext('2d');drawStableSpace(ctx,1100,700,g);drawTrueBoss(ctx,1100,700,g);ctx.fillStyle='#d3efdf';ctx.font='16px sans-serif';ctx.fillText('安定空域の境界で停止する真ボス',24,34);createRoot(panel).render(React.createElement(PilotPortrait,{telemetry:snapshot(g)}));
 });
 await page.locator('#boss-boundary-fixture').getByTestId('pilot-portrait').waitFor();assert.equal(await page.locator('#boss-boundary-fixture').getByTestId('pilot-portrait').getAttribute('data-filename'),'bikkuri-02.jpg');await page.locator('#boss-boundary-fixture').getByRole('status',{name:'あ、こいつ、私たちの星には入れないのか…',exact:true}).waitFor();await page.screenshot({path:'artifacts/true-boss-stable-boundary.png'});assert.deepEqual(errors,[]);console.log('PASS: blocked true boss and exact bikkuri-02 portrait/dialogue');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
