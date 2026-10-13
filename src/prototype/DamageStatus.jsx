import React from 'react';
import {shipDamageStatus} from './shipDamage.js';
export default function DamageStatus({ship,status}){
 const value=status??shipDamageStatus(ship),damaged=value.damaged>0||[...ship.cells,...ship.parts].some(owner=>owner.hp<100);
 return <div className="proto-structure-status" data-testid="structure-warning" data-stage={value.stage} role="status"><strong>{damaged?['損傷あり','船体損傷・警戒','船体損傷・危険','船体崩壊寸前','OVERLOAD'][value.stage]:'損傷なし'}</strong><span>損傷 {Number((value.ratio*100).toFixed(1))}% · {value.damaged}/{value.total}</span></div>;
}
