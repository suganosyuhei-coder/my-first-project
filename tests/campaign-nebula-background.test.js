import test from 'node:test';import assert from 'node:assert/strict';
import {campaignNebulaOpacity} from '../src/prototype/campaignNebulaOpacity.js';
test('background fades smoothly from distant empty space to enemy base',()=>{assert.equal(campaignNebulaOpacity(2000),0);assert.equal(campaignNebulaOpacity(1700),0);assert.ok(campaignNebulaOpacity(1200)<campaignNebulaOpacity(700));assert.equal(campaignNebulaOpacity(0),.65);});
import {campaignNebulaPlacement} from '../src/prototype/CampaignNebulaBackground.js';
test('pixel nebula has a bounded world position beside its base',()=>{const site={position:{x:100,y:-1400},kind:'front'},a=campaignNebulaPlacement(site,0);assert.equal(a.radius,140);assert.equal(Math.hypot(a.x-100,a.y+1400),300);assert.deepEqual(campaignNebulaPlacement(site,0),a);assert.equal(campaignNebulaPlacement({...site,kind:'home'},0).radius,190);});
