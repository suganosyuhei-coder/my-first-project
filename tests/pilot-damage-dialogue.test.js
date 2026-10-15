import test from 'node:test';
import assert from 'node:assert/strict';
import {pilotDamageDialogue} from '../src/prototype/pilotDamageDialogue.js';
import {SUPPLIED_PORTRAITS,suppliedPilotPortrait} from '../src/prototype/pilotSuppliedPortraits.js';
import {createPilotController} from '../src/prototype/pilotExpressions.js';
import {createGame,snapshot} from '../src/prototype/game.js';
import {pilotPortraitGeometry} from '../src/prototype/pilotPortraitGeometry.js';
const pairs=[['痛覚落としてエンジェルさん、警告は残しておいて。','少しだけ痛い、でも耐えられるよねエンジェルさん。'],['右腕の感覚がない。でも…操縦は続ける…負けられない…','手が震える、早くこの戦闘を終わらせないと…']];
test('specified pain lines use the 40% boundary and a softer portrait below it, without mutating actions',()=>{
 for(const [heavy,light] of pairs)for(const ratio of [0,.38,.39,.3999,.4,.5]){
  const action={line:heavy,expression:'pain',portraitId:'itai-01'},before=structuredClone(action),t={damageStatus:{ratio},ship:{critical:{core:5,canopy:5}},vital:{value:3}},result=pilotDamageDialogue(action,t);
  assert.deepEqual(action,before);assert.equal(result.line,ratio<.4?light:heavy);
  if(ratio<.4){const pose=suppliedPilotPortrait(result,t);assert.equal(pose.filename,'sukosi_itai_01.jpg');assert.ok(pose.src.includes('sukosi_itai_01'));}else assert.equal(result.portraitId,'itai-01');
 }
});
test('matching legacy and story variants are gated, unrelated dialogue remains unchanged',()=>{
 for(const line of ['痛覚、落として。警告は残して。','痛覚、落として、警告は残して。','痛覚、落として……。警告は、消さないで。'])assert.equal(pilotDamageDialogue({line},{damageStatus:{ratio:.39}}).line,pairs[0][1]);
 const other={line:'大丈夫。まだ、動かせる。',expression:'pain'};assert.equal(pilotDamageDialogue(other,{damageStatus:{ratio:0}}),other);
});
test('image replacement preserves every existing action mapping and display geometry',()=>{
 for(const [id,file] of [['yatta-06','sukosi_itai_04.jpg'],['yatta-03','sukosi_itai_04.jpg'],['bikkuri-04','sukosi_itai_03.jpg'],['normal-04','sukosi_itai_04.jpg'],['huan-02','sukosi_itai_04.jpg'],['normal-02','sukosi_itai_04.jpg'],['nayamu-03','sukosi_itai_03.jpg'],['nayamu-02','sukosi_itai_03.jpg'],['huan-04','sukosi_itai_03.jpg'],['bikkuri-03','bikkuri-02.jpg'],['bikkuri-05','bikkuri-02.jpg'],['kanashi-01','sukosi_itai_01.jpg'],['yatta-01','sukosi_itai_01.jpg'],['nayamu-01','sukosi_itai_01.jpg'],['huan-03','sukosi_itai_01.jpg'],['itai-02','sukosi_itai_01.jpg'],['yatta-04','sukosi_itai_01.jpg'],['yatta-05','sukosi_itai_01.jpg'],['huan-01','sukosi_itai_01.jpg'],['yatta-02','sukosi_itai_02.jpg']]){const pose=suppliedPilotPortrait({portraitId:id});assert.equal(pose.filename,file);assert.ok(pose.src.includes(file));assert.deepEqual(pilotPortraitGeometry(pose.crop),pilotPortraitGeometry(SUPPLIED_PORTRAITS.deepPain.crop));}
});
test('controller gates pain dialogue from real telemetry and re-evaluates an active line after a repair',()=>{
 const t=snapshot(createGame({campaign:false}));t.flight.elapsed=10;t.damageStatus={...t.damageStatus,ratio:.4,stage:0};
 const select=createPilotController([{id:'pain-fixture',condition:'cruising',scene:'custom',line:pairs[1][0],priority:120,expression:'pain'}]);
 // A deterministic custom scene exercises the same final gate as damage and warning scenes.
 const first=select(t);assert.equal(first.line,pairs[1][0]);t.damageStatus.ratio=.399;t.flight.elapsed+=.1;const light=select(t);assert.equal(light.line,pairs[1][1]);assert.equal(suppliedPilotPortrait(light,t).filename,'sukosi_itai_01.jpg');
});
