import { GRID, isHull, criticalAt, occupiedCells } from './model.js';
export function createShip(parts) {
  const cells=[];
  for(let y=0;y<GRID.rows;y++)for(let x=0;x<GRID.columns;x++)if(isHull(x,y))cells.push({x,y,role:criticalAt(x,y),hp:100,appearance:{}});
  return {cells,parts:parts.map(p=>({...p,hp:100,stored:0,appearance:{}})),critical:{canopy:100,core:100},revision:0};
}
export function shipCells(ship) {
  const cells=new Map(ship.cells.filter(c=>c.hp>0).map(c=>[`${c.x},${c.y}`,c]));
  for(const part of ship.parts.filter(p=>p.hp>0))for(const c of occupiedCells(part))cells.set(`${c.x},${c.y}`,{...c,part,role:null,hp:part.hp,appearance:part.appearance});
  return [...cells.values()];
}
export const CELL_METERS=6;
export function cellToWorld(cell,flight) {
  const x=(cell.x-5)*CELL_METERS,y=(cell.y-8)*CELL_METERS,c=Math.cos(flight.heading),s=Math.sin(flight.heading);
  return {x:flight.position.x+x*c-y*s,y:flight.position.y+x*s+y*c};
}
export function worldToCell(point,flight) {
  const x=point.x-flight.position.x,y=point.y-flight.position.y,c=Math.cos(flight.heading),s=Math.sin(flight.heading);
  return {x:Math.round((x*c+y*s)/CELL_METERS+5),y:Math.round((-x*s+y*c)/CELL_METERS+8)};
}
