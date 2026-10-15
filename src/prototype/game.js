import {createStableSpace,updateStableSpace,stableSpaceSnapshot,insideStableSpace} from './stableSpace.js';
import {stepTrueBoss,stepTrueEnding,trueBossSnapshot} from './trueBoss.js';
import { damageReport } from "./flightDiagnostics.js";
import { observeSupplies, supplyGuidance } from "./supplyGuidance.js";
import { TUNING, cruiseSpeed } from "./flightSpeed.js";
export { TUNING } from "./flightSpeed.js";
import { createEscortPaws, stepEscortPaws, escortPawSnapshot } from "./escortPaw.js";
import { createSupplyPaws, stepSupplyPaws, supplyPawSnapshot } from "./supplyPaw.js";
import { createMissiles, stepMissiles, missileSnapshot } from "./missiles.js";
import { shipDamageStatus, checkShipFailure } from "./shipDamage.js";
import { createVital, stepVital } from "./vital.js";
import { stepBitShoot } from "./bitShoot.js";
import { stepForceContact } from "./forceContact.js";
import { poweredThrust, solarDefense } from "./equipment.js";
import { createCampaign, activateCampaign, campaignSnapshot } from "./campaign.js";
import { finishVictory } from "./victory.js";
import { createEnemies, stepEnemies, enemySnapshot } from "./enemies.js";
import { createForce } from "./force.js";
import { nearbyPlanets, nearbySatellites, planetEnvironment, PLANET_FLOW } from "./planetFlow.js";
import { flightScale } from "./camera.js";
import { createBoost, cancelBoost, stepBoost, decayBoost, boostTurnMultiplier } from "./boost.js";
import { rockWarnings } from "./targeting.js";
import { createNebula, updateNebula, environmentForFlight, stepNebulaContacts, stepNebulaObservation, requestAnalysis, nebulaSnapshot, NEBULA } from "./nebula.js";
import { createFlight, stepFlight, initialParts, validatePlacement, partAt, shipStats } from "./model.js";
import { createShip, shipCells, CELL_METERS } from "./ship.js";
import { stepEnergy } from "./energy.js";
import { createBits, requestCollection, stepCollection } from "./collection.js";
import { initialResources, updateWorld } from "./world.js";
import { createRailgun, cancelRailgun, stepRailgun, stepProjectiles, RAILGUN } from "./railgun.js";
import { checkContacts } from "./damage.js";
function equipment() {
  const parts = initialParts();
  parts.push({ id: "railgun-0", type: "railgun", x: 7, y: 8 });
  parts.push({ id: "observer-0", type: "observer", x: 7, y: 4 });
  for (const [x, y] of [[3, 6], [3, 7], [5, 8], [6, 4], [6, 5], [6, 6], [6, 7], [6, 10], [6, 11], [6, 12]]) parts.push({ id: `pipe-${x}-${y}`, type: "pipe", x, y });
  return parts;
}
export function createGame({ seed = NEBULA.seed, force = true, campaign = true, initialEquipment = true, manualPlacement = true, tuning, stableStart = false } = {}) {
  const flight = createFlight(), ship = createShip(initialEquipment ? equipment() : equipment().filter((p) => p.type === "pipe"));
  const initialTank = ship.parts.find((p) => p.type === "tank");
  if (initialTank) initialTank.stored = RAILGUN.initialStored;
  const game = {
    flight,
    ship,
    tuning,
    vital: createVital(),
    supplyPaws: createSupplyPaws(),
    escortPaws: createEscortPaws(),
    missiles: createMissiles(),
    enemies: createEnemies(),
    nebula: createNebula(seed),
    weapon: createRailgun(),
    boost: createBoost(),
    status: "running",
    paused: false,
    score: 0,
    observationBonus: 0,
    manualPlacement,
    bits: createBits(flight.position),
    resources: initialResources(),
    jobs: [],
    recoveredCount: 0,
    inventory: { missile: 0, water: 0, wire: 0, plate: 0, tank: 0, solar: 0, engine: 0, observer: 0, railgun: 0, pipe: 0 },
    nextJob: 1,
    commands: [],
    viewport: { width: 800, height: 600, scale: flightScale(tuning) },
    energy: null,
    observation: 0,
    notice: "資材をクリックしてビットへ指示。観測範囲内の素材は空きビットが自動回収します。",
    hazards: [],
    destroyedRocks: /* @__PURE__ */ new Set(),
    warnedRocks: /* @__PURE__ */ new Set(),
    rockAlerts: /* @__PURE__ */ new Map(),
    contacts: /* @__PURE__ */ new Set(),
    depleted: /* @__PURE__ */ new Set(),
    discovered: /* @__PURE__ */ new Set(),
  };
  if(stableStart)game.stableSpace=createStableSpace();
  game.force = createForce(force);
  game.campaign = campaign ? createCampaign() : null;
  game.energy = stepEnergy(ship, 0);
  flight.velocity.y = -cruiseSpeed(ship, game.energy, tuning, { initial: true });
  stepBoost(game, [], 0);
  game.observation = tuning?.observation.radius ?? TUNING.observation;
  if (tuning) game.baseObservation = game.observation;
  updateWorld(game);
  rockWarnings(game);
  updateNebula(game);
  observeSupplies(game);
  return game;
}
export function applyCommand(game, command) {
  if (game.status !== "running" || game.paused) return;
  if (["place", "remove"].includes(command.type) && !game.manualPlacement) return;
  if (command.type === "analyze") {
    const result = requestAnalysis(game, command.id);
    game.notice = result.reason;
    return;
  }
  if (command.type === "collect") {
    const result = requestCollection(game, command.id, "click");
    game.notice = result.reason;
    return;
  }
  if (command.type === "place") {
    const result = validatePlacement(game.ship.parts.filter((p) => p.hp > 0), command.partType, command.x, command.y);
    if (!result.valid) {
      game.notice = result.reason;
      return;
    }
    game.ship.parts.push({ id: command.id, type: command.partType, x: command.x, y: command.y, hp: 100, stored: 0, appearance: {} });
    game.ship.revision++;
    game.notice = "パーツを配置しました";
  }
  if (command.type === "remove") {
    const part = partAt(game.ship.parts, command.x, command.y);
    if (!part) {
      game.notice = "重要部分・船体は取り外せません";
      return;
    }
    game.ship.parts = game.ship.parts.filter((p) => p.id !== part.id);
    game.ship.revision++;
    game.notice = "パーツを取り外しました";
  }
}
export function stepGame(game, steering, dt) {
  if(stepTrueEnding(game,dt))return game;
  if (game.introduction) {
    game.commands.length = 0;
    return game;
  }
  const pauseCommands = game.commands.filter((c) => c.type === "pause-toggle");
  game.commands = game.commands.filter((c) => c.type !== "pause-toggle");
  if (game.status === "running" && pauseCommands.length % 2) {
    game.paused = !game.paused;
    game.weapon.autoFire = false;
    game.weapon.subspaceGrace = 0;
    cancelRailgun(game.weapon);
    cancelBoost(game.boost);
    game.commands.length = 0;
    return game;
  }
  if (game.paused) {
    game.commands.length = 0;
    return game;
  }
  if (game.status !== "running") {
    stepEscortPaws(game, 0);
    stepMissiles(game, 0);
    stepRailgun(game, [], 0);
    stepBoost(game, [], 0);
    stepProjectiles(game, 0);
    stepEnemies(game, 0);
    game.commands.length = 0;
    return game;
  }
  const commands = game.commands.splice(0);
  for (const command of commands.filter((c) => !["collect", "analyze"].includes(c.type))) applyCommand(game, command);
  if (checkShipFailure(game)) return game;
  updateStableSpace(game);
  updateNebula(game);
  game.energy = stepEnergy(game.ship, dt, { ...game.tuning?.energy, nebulaRate: game.nebula.field.density * (game.tuning?.environment.nebulaRecovery ?? NEBULA.recoveryPerDensity) });
  if (game.energy.overflow > 0) game.notice = '装備の損傷を確認しました';
  stepTrueBoss(game,dt);
  stepRailgun(game, commands, dt);
  stepBoost(game, commands, dt);
  activateCampaign(game);
  stepMissiles(game, dt);
  stepProjectiles(game, dt);
  // Instant beams resolve before this tick's rock contacts.
  if (finishVictory(game)) return game;
  updateNebula(game);
  game.baseObservation = (game.tuning?.observation.radius ?? TUNING.observation) + (game.observationBonus ?? 0);
  game.observation = game.baseObservation;
  const hullRadius = Math.max(50, ...shipCells(game.ship).map((c) => Math.hypot((c.x - 5) * CELL_METERS, (c.y - 8) * CELL_METERS) + 4));
  const environment = planetEnvironment(environmentForFlight(game.nebula.field, game.flight.heading, game.tuning?.environment.nebulaStrength ?? PLANET_FLOW.nebulaStrength), game.flight, nearbyPlanets(game.flight.position), hullRadius, game.tuning?.environment.planetStrength ?? PLANET_FLOW.strength, game.tuning?.environment.galaxyStrength ?? PLANET_FLOW.galaxyStrength, nearbySatellites(nearbyPlanets(game.flight.position), game.flight.elapsed));
  if(insideStableSpace(game))Object.assign(environment,{drag:0,lateral:0,turn:0,weight:0,flowMix:0,controlFactor:1,flowVelocity:{x:0,y:0},galaxyVelocity:{x:0,y:0}});
  game.environment = { hullRadius, planetId: environment.planetId || null, influence: environment.weight, controlFactor: environment.controlFactor, galaxyFlow: Math.hypot(environment.galaxyVelocity.x, environment.galaxyVelocity.y) };
  stepFlight(game.flight, steering, dt, cruiseSpeed(game.ship, game.energy, game.tuning), environment, game.boost.velocity, (game.tuning?.ship.rotationRate ?? 0.32) * boostTurnMultiplier(game));
  stepVital(game, dt);
  if (game.status !== "running") return game;
  decayBoost(game, dt);
  updateStableSpace(game);
  updateWorld(game);
  rockWarnings(game);
  updateNebula(game);
  stepSupplyPaws(game, dt);
  observeSupplies(game);
  game.observation = game.baseObservation;
  for (const command of commands.filter((c) => c.type === "analyze")) applyCommand(game, command);
  stepNebulaObservation(game, dt);
  stepNebulaContacts(game, dt);
  if (game.status !== "running") {
    stepEnemies(game, 0);
    return game;
  }
  for (const resource of game.resources) if (Math.hypot(resource.position.x - game.flight.position.x, resource.position.y - game.flight.position.y) <= game.observation) {
    resource.discovered = true;
    game.discovered.add(resource.id);
  }
  // Explicit clicks reserve both the target and bits before proximity automation.
  for (const command of commands.filter((c) => c.type === "collect")) applyCommand(game, command);
  stepForceContact(game);
  if (finishVictory(game)) return game;
  for (const resource of game.resources.filter((r) => r.state === "available").sort((a, b) => Math.hypot(a.position.x - game.flight.position.x, a.position.y - game.flight.position.y) - Math.hypot(b.position.x - game.flight.position.x, b.position.y - game.flight.position.y))) requestCollection(game, resource.id, "auto");
  checkContacts(game);
  if (game.status === "running") stepCollection(game, dt);
  stepBitShoot(game, dt);
  stepEscortPaws(game, dt);
  stepEnemies(game, dt);
  if (finishVictory(game)) return game;
  if (game.status !== "running") stepRailgun(game, [], 0);
  return game;
}
export function snapshot(game) {
  return {
    stableSpace:stableSpaceSnapshot(game),
    developmentScenario: game.developmentScenario ?? null,
    trueBoss: trueBossSnapshot(game),
    damageReport: damageReport(game),
    supplyGuidance: supplyGuidance(game),
    introduction: !!game.introduction,
    nearbyIce: game.hazards.filter((h) => h.material === "ice" && !game.destroyedRocks.has(h.id) && Math.hypot(h.position.x - game.flight.position.x, h.position.y - game.flight.position.y) <= game.observation + h.radius).map((h) => ({ id: h.id, large: !!h.large, position: { ...h.position } })),
    escortPaws: escortPawSnapshot(game.escortPaws),
    supplyPaws: supplyPawSnapshot(game.supplyPaws),
    lastEnemyDefeat: game.lastEnemyDefeat ? { ...game.lastEnemyDefeat } : null,
    missiles: missileSnapshot(game.missiles),
    damageStatus: shipDamageStatus(game.ship),
    vital: { ...game.vital, lastRecovery: game.vital?.lastRecovery ? { ...game.vital.lastRecovery } : null },
    repairEffects: (game.repairEffects ?? []).filter((e) => game.flight.elapsed - e.at < 2.2).map((e) => ({ ...e })),
    equipmentPickup: game.equipmentPickup ? { ...game.equipmentPickup } : null,
    score: game.score ?? 0,
    paused: !!game.paused,
    recoveredCount: game.recoveredCount,
    thermal: { hot: game.hazards.some((h) => h.type === "heatContact" && game.contacts.has(h.id)) },
    campaign: campaignSnapshot(game),
    force: { ...game.force },
    enemies: enemySnapshot(game.enemies),
    environment: game.environment,
    tuning: game.tuning,
    boost: { ...game.boost, velocity: { ...game.boost.velocity }, lastBurst: game.boost.lastBurst ? { ...game.boost.lastBurst } : null },
    nebula: nebulaSnapshot(game.nebula, game),
    baseObservation: game.baseObservation ?? game.observation,
    weapon: { ...game.weapon, projectiles: game.weapon.projectiles.map((p) => ({ ...p, position: { ...p.position } })), effects: game.weapon.effects.map((e) => ({ ...e })) },
    flight: { ...game.flight, position: { ...game.flight.position } },
    ship: { ...game.ship, cells: game.ship.cells.map((c) => ({ ...c, appearance: { ...c.appearance } })), parts: game.ship.parts.map((p) => ({ ...p, appearance: { ...p.appearance } })), critical: { ...game.ship.critical } },
    stats: { ...shipStats(game.ship.parts.filter((p) => p.hp > 0)), thrust: poweredThrust(game.ship, game.energy), defense: solarDefense(game.ship.parts) },
    energy: game.energy,
    observation: game.observation,
    bits: game.bits.map((b) => ({ ...b, position: { ...b.position } })),
    jobs: game.jobs.map((j) => ({ ...j })),
    resources: game.resources.map((r) => ({ ...r })),
    inventory: { ...game.inventory },
    status: game.status,
    notice: game.notice,
    end: game.end,
  };
}
