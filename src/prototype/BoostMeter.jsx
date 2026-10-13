import React from 'react';
export default function BoostMeter({boost}){
 const percent=Math.round(boost.charge/Math.max(boost.chargeLimit??1,.001)*100);
 return <div hidden aria-hidden="true" className={'proto-boost '+(!boost.enabled?'is-locked':'')} title={boost.reason}>
  <b>BOOST</b><div role="meter" aria-label="急加速チャージ" aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent} data-testid="boost-meter" data-enabled={boost.enabled} data-level={boost.level} data-bursts={boost.bursts}><i style={{width:`${percent}%`}}/></div><span>{boost.enabled?`Shift / ${boost.level===2?'II':'I'}`:`${boost.engines}/1基`}</span><span hidden data-testid="boost-reason">{boost.reason}</span>
 </div>;
}
