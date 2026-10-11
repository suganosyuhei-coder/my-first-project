import test from 'node:test';
import assert from 'node:assert/strict';
import {createFlight,stepFlight,worldToScreen,screenToWorld,pipeMask,initialParts,shipStats,validatePlacement,occupiedCells,criticalAt} from '../src/prototype/model.js';
test('prototype auto flight updates world position and maximum radial distance',()=>{
 const s=createFlight();for(let i=0;i<600;i++)stepFlight(s,0,1/60);
 assert.ok(Math.abs(s.position.y+240)<1e-8);assert.ok(Math.abs(s.maxDistance-240)<1e-8);
 s.position={x:0,y:-5};stepFlight(s,0,1/60);assert.ok(Math.abs(s.maxDistance-240)<1e-8);
 assert.ok(s.trail.length<=500);
});
test('prototype steering is bounded, smooth and independent from crafting',()=>{
 const s=createFlight();stepFlight(s,1,1/60);assert.ok(s.angularVelocity>0&&s.angularVelocity<.32);
 for(let i=0;i<600;i++)stepFlight(s,1,1/60);
 assert.ok(s.angularVelocity<=.32);assert.ok(s.position.x>0);
 const time=s.elapsed,stats=shipStats(initialParts());assert.ok(stats.mass>420);assert.equal(s.elapsed,time);
 for(let i=0;i<600;i++)stepFlight(s,0,1/60);assert.ok(Math.abs(s.angularVelocity)<1e-10);
});
test('coordinate transforms preserve center and invert world/screen positions',()=>{
 const camera={x:813,y:-233};assert.deepEqual(worldToScreen(camera,camera,800,600,1.55),{x:400,y:300});
 const point={x:41,y:-99},result=screenToWorld(worldToScreen(point,camera,800,600,1.55),camera,800,600,1.55);
 assert.ok(Math.abs(result.x-point.x)<1e-10&&Math.abs(result.y-point.y)<1e-10);
});
test('all sixteen pipe junction masks reflect adjacency and removal',()=>{
 for(let mask=0;mask<16;mask++){
  const parts=[{id:'center',type:'pipe',x:6,y:9},...[[0,-1,1],[1,0,2],[0,1,4],[-1,0,8]].filter(([, ,bit])=>mask&bit).map(([x,y,bit])=>({id:String(bit),type:'pipe',x:6+x,y:9+y}))];
  assert.equal(pipeMask(parts,6,9),mask);
  assert.equal(pipeMask(parts.filter(p=>p.id!=='2'),6,9),mask&~2);
 }
});
test('crafting rejects critical overlaps, occupied cells, detached placements and multi-cell overflow',()=>{
 const parts=initialParts();assert.equal(validatePlacement(parts,'pipe',5,4).valid,false);
 assert.equal(validatePlacement(parts,'pipe',5,9).valid,false);assert.equal(criticalAt(5,4),'canopy');assert.equal(criticalAt(5,9),'core');
 assert.equal(validatePlacement(parts,'tank',10,8).valid,false);assert.equal(validatePlacement(parts,'pipe',0,0).valid,false);
 assert.equal(validatePlacement(parts,'pipe',6,8).valid,false);assert.equal(validatePlacement(parts,'pipe',6,10).valid,true);
 assert.equal(occupiedCells({type:'solar',x:0,y:0}).length,6);
 const baseline=shipStats(parts),added=shipStats([...parts,{type:'engine',x:7,y:11}]);assert.equal(added.mass-baseline.mass,35);assert.equal(added.thrust-baseline.thrust,12);
});
