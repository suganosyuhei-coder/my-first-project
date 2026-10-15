import {stepTrueBoss,finishTrueBoss} from './trueBoss.js';
import {damageEnemy} from './enemyCombat.js';
import { createGame } from './game.js';
import { CAMPAIGN, activateCampaign } from './campaign.js';
import { applyContact } from './damage.js';
import { cellToWorld } from './ship.js';
import { stepVital } from './vital.js';
import { updateWorld } from './world.js';
import { updateNebula } from './nebula.js';
import { observeSupplies } from './supplyGuidance.js';

export const DEV_SCENARIOS = [
  { id: 'normal', label: '通常開始・安定空域' },
  { id: 'boss', label: '本星ボス前' },
  { id: 'large-moss', label: '大型メガディクティオン型' },
  { id: 'organic-eurypterid', label: 'ウミサソリ型・6体' },
  { id: 'organic-earwig', label: 'ハサミムシ型・8体' },
  { id: 'organic-tardigrade', label: '大型クマムシ型' },
  { id: 'organic-pambdelurion', label: '大型パンブデルリオン型' },
  { id: 'low-vital', label: '低VITAL・氷の補給案内' },
  { id: 'damaged', label: '船体損傷・被ダメージ履歴' },
  { id: 'escort', label: '白PAW同行' },
  { id: 'result', label: '終了直前レポート' },
  { id: 'true-boss', label: '真ボス・同化戦艦' },
  { id: 'true-eye', label: '真ボス・フォース吸収後' },
  { id: 'true-swarm', label: '真ボス・開眼と暴走敵40体' },
  { id: 'true-ending', label: '真エンディング・最初から' },
  { id: 'true-report', label: '真エンディング・回収報告' },
];

// Loaded only by the development branch in useFlight. No settings are saved here.
export function createDevelopmentGame(id, tuning) {
  if (!DEV_SCENARIOS.some(scene => scene.id === id)) throw new Error('未知のテスト場面です');
  const game = createGame({ tuning,stableStart:id==='normal' });
  game.developmentScenario = id;
  game.introduction = false;
  game.paused = true;
  if (id === 'boss') game.flight.position = { x: CAMPAIGN.home.x, y: CAMPAIGN.home.y + 480 };
  const organicType=id==='large-moss'?'megadictyon':id.startsWith('organic-')?id.slice(8):null;
  if (organicType) {
    const group = game.campaign.mossGroups.find(g => g.type === organicType);
    game.flight.position = { x: group.position.x, y: group.position.y + 150 };
  }
  if (id === 'low-vital') {
    game.vital.value = 12;
    const ice = game.hazards.find(h => h.material === 'ice');
    if (ice) game.flight.position = { x: ice.position.x + 60, y: ice.position.y + 30 };
  }
  if (id === 'damaged' || id === 'result') {
    game.flight.elapsed = 8;
    for (const cell of [{ x: 2, y: 8 }, { x: 2, y: 9 }, { x: 4, y: 9 }]) {
      applyContact(game, { type: 'enemyAttack', source: 'テスト敵弾', damage: 20, position: cellToWorld(cell, game.flight) });
    }
  }
  if (id === 'escort') {
    const unit = { id: 'dev-escort', index: 0, position: { x: 45, y: -80 }, joinedAt: 0, hits: 0, cooldown: 0, missileUsed: false, heading: 0 };
    game.escortPaws.units.push(unit);
    game.escortPaws.joined.add(unit.id);
  }
  updateWorld(game);
  updateNebula(game);
  observeSupplies(game);
  if (organicType) {
    activateCampaign(game);
    for (const enemy of game.enemies.units) if (enemy.type === organicType) enemy.detected = true;
  }
  if(id.startsWith('true-')){
    for(const enemy of game.campaign.units)if(enemy.clusterId||enemy.id==='final-boss')enemy.hp=0;
    game.campaign.bossCleared=true;game.paused=false;
    stepTrueBoss(game,0);stepTrueBoss(game,3);
    if(id!=='true-boss'){
      for(const part of game.trueBoss.parts)if(part.required)damageEnemy(game,part,10000,part.position);
      stepTrueBoss(game,0);
      const eye=game.trueBoss.parts.find(p=>p.type==='trueEye');
      for(let i=0;i<6;i++)damageEnemy(game,eye,10,eye.position,0,'normal');
      stepTrueBoss(game,2.4);
      if(id==='true-ending'||id==='true-report'){
        game.trueBoss.timer=5.3;eye.coreOpen=true;damageEnemy(game,eye,10,eye.position,0,'wave');finishTrueBoss(game);game.end.endingElapsed=id==='true-report'?22:0;
      }
    }
    if(game.status==='running'){
      game.flight.position={x:game.trueBoss.position.x,y:game.trueBoss.position.y+260};
      if(id==='true-swarm'){game.trueBoss.timer=5.3;stepTrueBoss(game,0);}
      game.paused=true;
    }
    activateCampaign(game);
  }
  if (id === 'result') {
    game.paused = false;
    game.vital.value = 0;
    stepVital(game, 0);
  }
  return game;
}
