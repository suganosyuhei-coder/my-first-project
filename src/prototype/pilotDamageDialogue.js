import {shipDamageStatus} from './shipDamage.js';
export const DAMAGE_DIALOGUE_THRESHOLD=.4;
const lines=[
 {heavy:'痛覚落としてエンジェルさん、警告は残しておいて。',light:'少しだけ痛い、でも耐えられるよねエンジェルさん。',aliases:['痛覚、落として。警告は残して。','痛覚、落として、警告は残して。','痛覚、落として……。警告は、消さないで。']},
 {heavy:'右腕の感覚がない。でも…操縦は続ける…負けられない…',light:'手が震える、早くこの戦闘を終わらせないと…',aliases:['右腕の感覚がない。操縦は続ける。']},
];
// Presentation only: use the same occupied-cell damage ratio as the ship HUD.
export function pilotDamageDialogue(action,telemetry){
 const entry=lines.find(l=>l.heavy===action?.line||l.aliases.includes(action?.line));
 if(!entry)return action;
 const ratio=telemetry?.damageStatus?.ratio??(telemetry?.ship?shipDamageStatus(telemetry.ship).ratio:0);
 return ratio>=DAMAGE_DIALOGUE_THRESHOLD?{...action,line:entry.heavy}:{...action,line:entry.light,portraitId:'huan-01',expression:'hesitant'};
}
