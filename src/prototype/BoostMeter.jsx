import React from 'react';
export default function BoostMeter({boost}){
 return <div className={'proto-boost '+(!boost.enabled?'is-locked':'')} title={boost.reason}>
  <b>BOOST</b><div role="meter" aria-label="急加速チャージ" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(boost.charge*100)} data-testid="boost-meter" data-enabled={boost.enabled} data-bursts={boost.bursts}><i style={{width:`${boost.charge*100}%`}}/></div><span>{boost.enabled?'Shift':`${boost.engines}/2基`}</span><span hidden data-testid="boost-reason">{boost.reason}</span>
 </div>;
}
