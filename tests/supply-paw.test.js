import test from 'node:test';import assert from 'node:assert/strict';
import {createGame,snapshot,stepGame} from '../src/prototype/game.js';import {SUPPLY_PAW,supplyPawHome,stepSupplyPaws,deliverSupply} from '../src/prototype/supplyPaw.js';import {cellToWorld} from '../src/prototype/ship.js';import {launchMissiles} from '../src/prototype/missiles.js';import {createPilotController} from '../src/prototype/pilotExpressions.js';
const supply=(g,index=0)=>({id:`supply-paw-${g.nebula.seed}-${index}`,index,position:{...g.flight.position},radius:14,variant:'green'});
test('supply gives one part, one water and twelve vital, repairing only once at 8/4 percent',()=>{
 const g=createGame({campaign:false});g.ship.parts=[];g.vital.value=50;for(const y of [7,8,9])g.ship.cells.find(c=>c.x===2&&c.y===y).hp=y===8?20:40;const u=supply(g),before=g.recoveredCount;
 assert.equal(deliverSupply(g,u),true);assert.equal(g.vital.value,62);assert.equal(g.inventory.water,1);assert.equal(g.recoveredCount,before+1);assert.equal(g.ship.cells.find(c=>c.x===2&&c.y===8).hp,28);assert.equal(g.ship.cells.find(c=>c.x===2&&c.y===7).hp,44);assert.equal(g.ship.cells.find(c=>c.x===2&&c.y===9).hp,44);assert.equal(g.supplyPaws.lastReceipt.repairCount,3);assert.equal(g.score,0);assert.equal(g.enemies.kills,0);const beforeRepeat=JSON.stringify(snapshot(g));assert.equal(deliverSupply(g,u),false);assert.equal(JSON.stringify(snapshot(g)),beforeRepeat);
});
test('actual hull contact grants supply, removes the robot and prevents revisit farming',()=>{
 const g=createGame({campaign:false}),home=supplyPawHome(0,g.nebula.seed);g.flight.elapsed=0;g.flight.position={x:home.x,y:home.y+6};stepSupplyPaws(g,1/60);assert.equal(g.supplyPaws.supplied.size,1);assert.ok(g.supplyPaws.units.every(u=>u.id!==`supply-paw-${g.nebula.seed}-0`));const water=g.inventory.water;g.flight.position={x:4000,y:-10000};stepSupplyPaws(g,1/60);g.flight.position={x:home.x,y:home.y+6};stepSupplyPaws(g,1/60);assert.equal(g.inventory.water,water);
});
test('paused and ended games cannot grant supply and retry resets it',()=>{
 const g=createGame({campaign:false}),u=supply(g);g.paused=true;assert.equal(deliverSupply(g,u),false);g.paused=false;g.status='ended';assert.equal(deliverSupply(g,u),false);assert.equal(createGame().supplyPaws.supplied.size,0);
});
test('green robots are separate from enemy targets, missile targets, score and ordinary PAW colors',()=>{
 const g=createGame({campaign:false,force:false});g.enemies.units=[];g.supplyPaws.units=[supply(g)];g.ship.parts.push({id:'launcher',type:'missile',hp:100,x:0,y:0,appearance:{}});assert.equal(launchMissiles(g),false);assert.equal(g.enemies.units.length,0);assert.equal(g.supplyPaws.units[0].variant,'green');
});
test('supply spacing is one fifth of ordinary PAW frequency, seeded, with bounded active units',()=>{
 assert.equal(SUPPLY_PAW.spacing,5000);assert.equal(1000/SUPPLY_PAW.spacing,.2);assert.deepEqual(supplyPawHome(-4,11),supplyPawHome(-4,11));assert.notDeepEqual(supplyPawHome(-4,11),supplyPawHome(-4,12));const g=createGame({campaign:false});for(let i=-30;i<30;i++){const p=supplyPawHome(i,g.nebula.seed);g.flight.position={x:p.x+100,y:p.y+100};stepSupplyPaws(g,.1);assert.ok(g.supplyPaws.units.length<=3);}
});
test('water is still granted at full vital, telemetry is isolated and the supply scene fires only after delivery',()=>{
 const g=createGame({campaign:false}),select=createPilotController();g.flight.elapsed=10;g.vital.value=100;select(snapshot(g));deliverSupply(g,supply(g));g.flight.elapsed++;const action=select(snapshot(g));assert.equal(g.vital.value,100);assert.equal(g.inventory.water,1);assert.equal(action.storyTrigger,'pawAssist');assert.equal(action.portraitId,'yatta-06');const t=snapshot(g);t.supplyPaws.lastReceipt.position.x=9999;assert.notEqual(g.supplyPaws.lastReceipt.position.x,9999);
});

test('normal game ticks apply supply on contact without an explicit collection command',()=>{const g=createGame({campaign:false,force:false}),home=supplyPawHome(-1,g.nebula.seed);g.vital.value=40;g.flight.elapsed=0;g.flight.position={x:home.x+Math.sin(-1)*16,y:home.y+Math.cos(-1)*6};stepGame(g,0,1/60);assert.equal(g.inventory.water,1);assert.equal(g.vital.value,52);assert.ok(g.supplyPaws.lastReceipt);});
