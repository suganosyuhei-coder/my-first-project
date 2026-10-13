import {GRID,PARTS,occupiedCells,validatePlacement} from './model.js';
// Materials stay in inventory; recovered equipment is installed only after return.
export function installRecoveredPart(game,type){
 if(!PARTS[type])return null;
 const live=game.ship.parts.filter(p=>p.hp>0),candidates=[];
 for(let y=0;y<GRID.rows;y++)for(let x=0;x<GRID.columns;x++){
  if(!validatePlacement(live,type,x,y).valid)continue;
  const cells=occupiedCells({type,x,y});
  const neighbors=live.filter(p=>occupiedCells(p).some(c=>cells.some(v=>Math.abs(v.x-c.x)+Math.abs(v.y-c.y)===1)));
  const connected=neighbors.filter(p=>type==='pipe'||p.type==='pipe'||type==='tank'&&p.type==='tank');
  const score=connected.reduce((n,p)=>n+(game.energy.active[p.id]||p.type==='tank'?100:10),0)+neighbors.length-Math.abs(x+(PARTS[type].width-1)/2-5)*.1;
  candidates.push({x,y,score});
 }
 candidates.sort((a,b)=>b.score-a.score||a.y-b.y||a.x-b.x);
 if(!candidates.length)return null;
 let sequence=game.nextInstalledPart??1;while(game.ship.parts.some(p=>p.id===`recovered-${type}-${sequence}`))sequence++;game.nextInstalledPart=sequence+1;
 const {x,y}=candidates[0],part={id:`recovered-${type}-${sequence}`,type,x,y,hp:100,stored:0,appearance:{}};
 game.ship.parts.push(part);game.ship.revision++;return part;
}
