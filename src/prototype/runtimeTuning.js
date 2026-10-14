import preset from './productionTuning.json' with {type:'json'};
import {defaultTuning,validateTuning,loadDevTuning} from './devTuning.js';
// Shipping values are explicitly adopted from the exported JSON, never from public localStorage.
export function productionTuning(){try{return validateTuning(preset);}catch{return defaultTuning();}}
export function loadRuntimeTuning(){return import.meta.env?.DEV?loadDevTuning():productionTuning();}
