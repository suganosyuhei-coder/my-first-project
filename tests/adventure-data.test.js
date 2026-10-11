import test from 'node:test';
import assert from 'node:assert/strict';
import { MATERIALS, shapeMass, shapeVolume } from '../src/data/materials.js';
import { ITEMS, itemMass, componentVolume, createInventory, createCollectionPoints, lootWeights, chooseLoot, placeInventoryItem, recoverInventoryItem } from '../src/data/items.js';
import RAPIER from '@dimforge/rapier3d-compat';

test('shape masses use kg/m³ and actual shape volumes',()=>{
  assert.equal(shapeMass('cube',[1,1,1],'gold'),19300);
  assert.equal(shapeMass('cube',[2,2,2],'resin'),8*1100);
  assert.equal(shapeVolume('wedge',[2,2,3]),6);
  assert.ok(Math.abs(shapeVolume('sphere',[2,2,2])-4*Math.PI/3)<1e-10);
  for(const m of Object.values(MATERIALS)) assert.ok(m.density>0 && m.roughness>=0 && m.roughness<=1);
});
test('hollow pipe mass excludes the empty center and all 15 models are defined',()=>{
  assert.equal(Object.keys(ITEMS).length,15);
  const p=ITEMS.pipe.parts[0];
  assert.ok(Math.abs(itemMass('pipe')-Math.PI*(.11**2-.085**2)*1.5*MATERIALS.iron.density)<1e-8);
  assert.ok(componentVolume(p)<Math.PI*.11**2*1.5);
  for(const id of Object.keys(ITEMS)){assert.ok(Number.isFinite(itemMass(id))&&itemMass(id)>0);assert.ok(ITEMS[id].parts.length>0);assert.ok(ITEMS[id].size.every(v=>v>0));}
});
test('place, zero-stock rejection, recovery and duplicate recovery conserve inventory',()=>{
  const original=createInventory();let inventory=original,placed=[];
  for(let i=0;i<original.wire;i++)({inventory,placed}=placeInventoryItem(inventory,placed,'wire',[0,0,0],String(i)));
  assert.equal(inventory.wire,0);assert.equal(placed.length,5);
  const denied=placeInventoryItem(inventory,placed,'wire',[0,0,0],'overflow');assert.equal(denied.placed,placed);
  const result=recoverInventoryItem(inventory,placed,'0');assert.equal(result.inventory.wire,1);assert.equal(result.placed.length,4);
  const duplicate=recoverInventoryItem(result.inventory,result.placed,'0');assert.equal(duplicate.inventory.wire,1);
  assert.equal(original.wire,5);
});
test('distance changes rarity smoothly and every item can be drawn',()=>{
  const near=lootWeights(0),far=lootWeights(125);
  assert.ok(far.far>near.far && far.near<near.near);
  for(let d=0;d<170;d++)for(const key of ['near','mid','far'])assert.ok(Math.abs(lootWeights(d+1)[key]-lootWeights(d)[key])<.03);
  const selected=new Set(Array.from({length:10000},(_,i)=>chooseLoot(70,()=>i/10000)));
  assert.equal(selected.size,15);
  const stars=createCollectionPoints(()=>.5);assert.equal(stars.length,40);assert.equal(new Set(stars.map(s=>s.id)).size,40);
  assert.ok(stars.some(p=>Math.hypot(p.position[0],p.position[2])>100));
});
test('Rapier jump reaches approximately 20cm with lunar gravity',async()=>{
  await RAPIER.init();const world=new RAPIER.World({x:0,y:-1.62,z:0});world.timestep=1/60;
  const ground=world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0,-.5,0));world.createCollider(RAPIER.ColliderDesc.cuboid(4,.5,4),ground);
  const body=world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(0,.76,0).lockRotations());world.createCollider(RAPIER.ColliderDesc.capsule(.45,.3).setRestitution(0),body);
  for(let i=0;i<120;i++)world.step();const y=body.translation().y;
  body.setLinvel({x:0,y:Math.sqrt(2*1.62*.2)+1.62/120,z:0},true);
  let peak=y;for(let i=0;i<120;i++){world.step();peak=Math.max(peak,body.translation().y);}
  assert.ok(Math.abs((peak-y)-.2)<.025,`height ${peak-y}`);world.free();
});
