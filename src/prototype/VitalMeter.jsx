import {vitalWarningStage} from './pilotWarnings.js';
import {VITAL_INITIAL,VITAL_MAX} from './vital.js';
import React from 'react';
export default function VitalMeter({vital,elapsed=0}){
 const value=Math.max(0,Math.min(VITAL_MAX,vital?.value??VITAL_INITIAL)),recovery=vital?.lastRecovery;
 const recovering=recovery&&elapsed-recovery.at>=0&&elapsed-recovery.at<2.2;
 return <div className={'proto-vital'+(recovering?' is-recovering':'')} data-testid="vital-meter" data-warning-stage={vitalWarningStage(value)} role="progressbar" aria-label="パイロットのバイタル" aria-valuemin={0} aria-valuemax={VITAL_MAX} aria-valuenow={value}>
  <div className="proto-vital-label"><span>VITAL</span><span>{recovering?`+${recovery.amount} · `:''}{value} / {VITAL_MAX}</span></div>
  <div className={'proto-vital-track'+(value<=20?' is-low':'')}><i style={{width:`${value/VITAL_MAX*100}%`}}/></div>
 </div>;
}
