import React from 'react';
import {STABLE_ANGEL_LINE} from './stableSpace.js';
export default function StableSpaceView({state}){
 if(!state||state.phase==='normal')return null;
 return <aside className="proto-stable-guide" aria-label="安定空域の案内" data-testid="stable-guide"><strong>{state.inside?'安定空域 / STABLE SPACE':'外縁空域 / APPROACH'}</strong>{state.inside&&<p className="proto-stable-angel">ANGELpack：「{STABLE_ANGEL_LINE}」</p>}<p>{({quiet:'← → / A D：旋回　Shift：スラスター推進。緑の点線が安定空域の境界です。',shooting:'岩と氷で射撃を確認。Spaceで通常弾、長押しして離すと波動砲。氷を壊すと水でVITALが回復します。',combat:state.enemyRemaining?'前方に単独の敵反応。射撃と回避を試し、その先の敵空域へ進んでください。':'単独の敵反応が消失。外縁を抜けると通常の敵空域です。'})[state.phase]}</p></aside>;
}
