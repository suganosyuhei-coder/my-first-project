// Development settings only. No server write endpoint, Git or deploy integration.
export const TUNING_KEY = 'shutle.dev-tuning.v1';
export const TUNING_FIELDS = [
 ['enemies','speedMultiplier','敵 / 追跡速度倍率',.25,2,.05,1],
 ['enemies','damageMultiplier','敵 / 攻撃ダメージ倍率',0,2,.1,1],
 ['enemies','bitDamageMultiplier','ビット / 迎撃威力倍率',.5,2,.1,1],
 ['force','normalInterval','フォース / 通常レーザー発射間隔 s',.4,3,.05,.8],
 ['force','normalRange','フォース / 通常レーザー長さ・射程 m',420,1200,10,700],
 ['force','normalDuration','フォース / 通常レーザー表示時間 s',.3,1.5,.05,.65],
 ['force','spreadDegrees','フォース / 通常レーザー左右角度 °',10,60,1,30],
 ['force','chargedDamage','フォース / 波動砲威力倍率',1,4,.1,2],
 ['force','chargedWidth','フォース / 波動砲幅・判定倍率',1,3,.1,1.8],
 ['environment','galaxyStrength','銀河 / 常時流れの強さ',0,3,.1,1],
 ['environment','nebulaRecovery','星雲 / 密度1の回復 E/s',0,30,1,5],
 ['environment','planetStrength','惑星 / 重力流の強さ',0,2,.05,1],
 ['environment','nebulaStrength','星雲 / 航行影響倍率',0,4,.1,2],
 ['energy','generation','ソーラー / 1基の生成 E/s',4,32,.5,16],
 ['energy','tankLinkBonus','タンク / 連結容量ボーナス',0,.5,.05,.25],
 ['boost','impulseMultiplier','ブースト / 加速倍率',1,3,.05,1.65],
 ['boost','duration','ブースト / 持続時間 s',.5,2,.05,1.25],
 ['boost','diveGraceFrames','亜空間 / 波動砲発射後の猶予（60fps換算）',0,30,1,5],
 ['boost','turnMultiplier','Shift / 急旋回倍率',1,6,.1,3.5],
 ['ship','speedMultiplier','機体 / 前進速度倍率',.5,12,.05,1],
 ['ship','rotationRate','機体 / 旋回速度 rad/s',.05,1.5,.01,.32],
 ['ship','visualScale','機体 / 表示サイズ（判定は不変）',.5,2,.05,1],
 ['observation','radius','観測 / 基本半径 m',20,600,5,140],
 ['observation','opacity','観測円 / 境界透明度',0,1,.01,68/255],
 ['observation','lineWidth','観測円 / 境界線 px',.5,5,.5,1],
 ['nebula','dotMultiplier','星雲 / ドットサイズ倍率',.5,4,.1,1],
 ['nebula','densityMultiplier','星雲 / 密度倍率（物理にも反映）',0,2,.05,1],
 ['nebula','opacity','星雲 / 表示透明度',0,1,.01,1],
 ['camera','zoom','カメラ / 表示ズーム倍率',.5,2,.05,1],
 ['ui','hudScale','HUD / サイズ倍率',.75,1.5,.05,1],
 ['ui','offsetX','HUD / 横位置 px',-100,100,1,0],
 ['ui','offsetY','HUD / 縦位置 px',-100,100,1,0],
 ['ui','padding','HUD / 余白 px',0,30,1,0],
 ['ui','opacity','HUD / 透明度',.2,1,.05,1],
 ['animation','visualSpeed','星雲装飾 / 動作速度倍率',0,3,.1,1],
 ['animation','reactionDuration','パイロット / 反応時間倍率',.25,3,.05,1],
];
export function defaultTuning(){const value={version:1};for(const [group,key,,,,,initial] of TUNING_FIELDS)(value[group]??={})[key]=initial;return value;}
export function validateTuning(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||input.version!==1)throw new Error('設定バージョンは1が必要です');
 const result=defaultTuning(),groups=Object.keys(result);
 if(Object.keys(input).some(k=>!groups.includes(k)))throw new Error('未知の設定項目があります');
 for(const group of groups.filter(k=>k!=='version')){
  // Old v1 files omit these newly added categories: retain their other settings.
  if(input[group]===undefined&&['energy','boost','environment','enemies','force'].includes(group))continue;
  if(!input[group]||typeof input[group]!=='object'||Array.isArray(input[group]))throw new Error(`${group} の設定が不足しています`);
  const fields=TUNING_FIELDS.filter(f=>f[0]===group);
  if(Object.keys(input[group]).some(k=>!fields.some(f=>f[1]===k)))throw new Error(`${group} に未知の項目があります`);
  for(const [,key,label,min,max] of fields){const n=input[group][key];if(n===undefined&&(group==='force'&&['normalInterval','normalRange','normalDuration'].includes(key)||['boost.diveGraceFrames','boost.turnMultiplier','environment.galaxyStrength','environment.nebulaRecovery'].includes(group+'.'+key)))continue;if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max)throw new Error(`${label}: ${min}〜${max} の数値が必要です`);result[group][key]=n;}
 }
 return result;
}
export function readTuning(storage){try{const json=storage.getItem(TUNING_KEY);return {value:json?validateTuning(JSON.parse(json)):defaultTuning(),error:null};}catch(e){return {value:defaultTuning(),error:`保存設定を読み込めませんでした。初期値を使用：${e.message}`};}}
export function saveTuning(storage,value){const clean=validateTuning(value);storage.setItem(TUNING_KEY,JSON.stringify(clean));return clean;}
export function loadDevTuning(){if(!import.meta.env?.DEV)return undefined;try{return readTuning(window.localStorage).value;}catch{return defaultTuning();}}
