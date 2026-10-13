// Grid-space damage markers include destroyed owners, unlike live collision cells.
export function gridDamageMarkers(ship){
 const markers=new Map();
 for(const owner of [...ship.cells,...ship.parts]){
  if(!Number.isFinite(owner.hp)||owner.hp>=100)continue;
  const point=owner.lastDamageCell??owner,key=`${point.x},${point.y}`;
  const hp=Math.max(0,Math.ceil(owner.hp)),severity=owner.hp<=0?'destroyed':owner.hp<=35?'critical':'damaged';
  const marker={x:point.x,y:point.y,hp,severity,symbol:severity==='destroyed'?'×':severity==='critical'?'!':'△'};
  if(!markers.has(key)||markers.get(key).hp>hp)markers.set(key,marker);
 }
 return [...markers.values()];
}
