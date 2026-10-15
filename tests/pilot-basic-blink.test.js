import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {BASIC_BLINK, BASIC_PORTRAITS, basicBlinkFrame, validateBasicBlink} from '../src/prototype/pilotBasicBlink.js';
import {suppliedPilotPortrait} from '../src/prototype/pilotSuppliedPortraits.js';
import {pilotPortraitGeometry} from '../src/prototype/pilotPortraitGeometry.js';

test('basic blink follows 16/25/55/45ms boundaries and returns to a four-second rest', () => {
  const start=BASIC_BLINK.intervalMs;
  assert.equal(BASIC_BLINK.durationMs,141);
  for(const [ms,frame] of [[0,0],[3999,0],[start,0],[start+15.99,0],[start+16,1],[start+40.99,1],[start+41,2],[start+95.99,2],[start+96,1],[start+140.99,1],[start+141,0],[start+141+4000+41,2]]) assert.equal(basicBlinkFrame(ms),frame,`time=${ms}`);
  assert.equal(basicBlinkFrame(start+50,true),0);
  assert.equal(basicBlinkFrame(-1),0);
});
test('overall duration scales frame proportions, supports 120–200ms and rejects broken settings', () => {
  for(const durationMs of [120,200]) {
    const config=validateBasicBlink({...BASIC_BLINK,durationMs});
    assert.equal(basicBlinkFrame(config.intervalMs+durationMs*42/141,false,config),2);
    assert.equal(basicBlinkFrame(config.intervalMs+durationMs,false,config),0);
  }
  for(const change of [{durationMs:119},{durationMs:201},{intervalMs:NaN},{frameDurationsMs:[16,0,55,45]},{frameDurationsMs:[16,25,55]}]) assert.throws(()=>validateBasicBlink({...BASIC_BLINK,...change}));
});
test('all blink assets share geometry; base story lines blink while damage and surprise retain their static poses', () => {
  const geometry=pilotPortraitGeometry(BASIC_PORTRAITS[0].crop);
  for(const portrait of BASIC_PORTRAITS){assert.ok(existsSync(new URL(portrait.src)));assert.deepEqual(pilotPortraitGeometry(portrait.crop),geometry);}
  for(const portraitId of ['normal-01','normal-03']) assert.equal(suppliedPilotPortrait({portraitId}).id,'hannme_01');
  assert.equal(suppliedPilotPortrait({expression:'surprised'}).id,'bikkuri-02');
  assert.equal(suppliedPilotPortrait({expression:'pain',id:'warning-core'}).id,'itai-01');
});
