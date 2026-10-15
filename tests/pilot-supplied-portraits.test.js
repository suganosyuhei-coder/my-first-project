import test from 'node:test';import assert from 'node:assert/strict';import {existsSync} from 'node:fs';
import {SUPPLIED_PORTRAITS,suppliedPilotPortrait} from '../src/prototype/pilotSuppliedPortraits.js';import {PILOT_SCENES} from '../src/prototype/pilotExpressions.js';import {pilotPortraitGeometry} from '../src/prototype/pilotPortraitGeometry.js';
const line=(scene,index,expression=PILOT_SCENES[scene].expression)=>({scene,line:PILOT_SCENES[scene].lines[index],expression});
test('all thirty specified individual images exist and keep identical display geometry',()=>{
 assert.equal(Object.keys(SUPPLIED_PORTRAITS).length,30);const reference=pilotPortraitGeometry(SUPPLIED_PORTRAITS.sadMemory.crop);for(const pose of Object.values(SUPPLIED_PORTRAITS)){assert.ok(existsSync(new URL(pose.src)));assert.deepEqual(pilotPortraitGeometry(pose.crop),reference);assert.equal(pose.crop.width,180);assert.equal(pose.crop.height,213);}
});
test('recollections, accomplishments, confusion and shy lines select their intended still portraits',()=>{
 for(const [action,id] of [[line('idle',1),'kanashi-01'],[line('human',0),'kanashi-03'],[line('afterBattle',3),'yatta-01'],[line('return',0),'yatta-02'],[line('boss',0),'bikkuri-01'],[{expression:'surprised'},'bikkuri-02'],[{expression:'confused'},'bikkuri-04'],[{expression:'questioning'},'bikkuri-05'],[{expression:'embarrassed'},'tereru-01'],[line('return',2),'tereru-02'],[line('thruster',0),'tereru-03']])assert.equal(suppliedPilotPortrait(action).id,id);
});
test('deep damage warnings take precedence while normal hits and retaliation show resistance',()=>{
 assert.equal(suppliedPilotPortrait({...line('pain',3),id:'warning-structure-3'}).id,'itai-01');assert.equal(suppliedPilotPortrait(line('pain',0),{ship:{critical:{core:15,canopy:100}}}).id,'itai-01');assert.equal(suppliedPilotPortrait(line('pain',3)).id,'itai-02');assert.equal(suppliedPilotPortrait(line('counter',0)).id,'itai-02');
});
test('same action does not animate, unknown expressions fall back, mistake pose requires an explicit mistake event',()=>{
 const action=line('boss',0),t={flight:{elapsed:0}};const first=suppliedPilotPortrait(action,t);t.flight.elapsed=999;assert.equal(suppliedPilotPortrait(action,t),first);assert.equal(suppliedPilotPortrait({expression:'unregistered'}),null);assert.equal(suppliedPilotPortrait({id:'mistake'}).id,'bikkuri-03');assert.notEqual(suppliedPilotPortrait(line('combat',0))?.id,'bikkuri-03');
});

test('additional moods follow soft everyday lines, escalating anxiety and Angel-directed achievement',()=>{
 for(const [action,id] of [[line('departure',0),'hannme_01'],[{expression:'neutral'},'hannme_01'],[line('upgrade',1),'normal-02'],[line('combat',0),'normal-04'],[{expression:'panicked'},'huan-01'],[{expression:'worried'},'huan-03'],[{expression:'worried',id:'warning-structure-1'},'huan-02'],[line('search',1),'huan-04'],[line('part',1),'nayamu-01'],[line('boss',1),'nayamu-02'],[line('boss',2),'nayamu-03'],[line('multiKill',2),'yatta-03'],[line('item',0),'yatta-04'],[line('item',1),'yatta-05'],[line('confident',1),'yatta-06'],[line('human',3),'kanashi-02']])assert.equal(suppliedPilotPortrait(action).id,id);
});
