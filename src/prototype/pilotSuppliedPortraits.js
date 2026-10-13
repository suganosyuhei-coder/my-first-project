import dialogue from './pilotDialogue.json' with {type:'json'};
const crop={x:0,y:0,width:180,height:213,sourceWidth:180,sourceHeight:213,referenceWidth:180};
const pose=(id,label,src)=>({id,label,src,crop});
export const SUPPLIED_PORTRAITS={
 sadMemory:pose('kanashi-01','エンジェルさんを思う',new URL('../assets/pilot/kanashi-01.jpg',import.meta.url).href),
 sadSoft:pose('kanashi-03','うっすら悲しい',new URL('../assets/pilot/kanashi-03.jpg',import.meta.url).href),
 achieved:pose('yatta-01','大変だったが、やった',new URL('../assets/pilot/yatta-01.jpg',import.meta.url).href),
 accomplished:pose('yatta-02','なんとか、やり遂げた',new URL('../assets/pilot/yatta-02.jpg',import.meta.url).href),
 recalled:pose('bikkuri-01','思い出して、あれ？',new URL('../assets/pilot/bikkuri-01.jpg',import.meta.url).href),
 surprised:pose('bikkuri-02','かわいい驚き',new URL('../assets/pilot/bikkuri-02.jpg',import.meta.url).href),
 mistake:pose('bikkuri-03','ミスして、あちゃー',new URL('../assets/pilot/bikkuri-03.jpg',import.meta.url).href),
 confused:pose('bikkuri-04','困惑・無表情',new URL('../assets/pilot/bikkuri-04.jpg',import.meta.url).href),
 questioning:pose('bikkuri-05','なんで、知らない',new URL('../assets/pilot/bikkuri-05.jpg',import.meta.url).href),
 deepPain:pose('itai-01','深いダメージ',new URL('../assets/pilot/itai-01.jpg',import.meta.url).href),
 resisting:pose('itai-02','やられたが、負けない',new URL('../assets/pilot/itai-02.jpg',import.meta.url).href),
 shy:pose('tereru-01','照れてしまう',new URL('../assets/pilot/tereru-01.jpg',import.meta.url).href),
 shyCute:pose('tereru-02','かわいい照れ',new URL('../assets/pilot/tereru-02.jpg',import.meta.url).href),
 shySoft:pose('tereru-03','照れる',new URL('../assets/pilot/tereru-03.jpg',import.meta.url).href),
 sadSudden:pose('kanashi-02','ふと悲しい',new URL('../assets/pilot/kanashi-02.jpg',import.meta.url).href),
 happySmall:pose('yatta-04','少し嬉しい',new URL('../assets/pilot/yatta-04.jpg',import.meta.url).href),
 happySoft:pose('yatta-05','ちょっと嬉しい',new URL('../assets/pilot/yatta-05.jpg',import.meta.url).href),
 angelJoy:pose('yatta-03','エンジェルさん、やったね',new URL('../assets/pilot/yatta-03.jpg',import.meta.url).href),
 appreciative:pose('yatta-06','やるな',new URL('../assets/pilot/yatta-06.jpg',import.meta.url).href),
 cornered:pose('huan-01','少し追い詰められている',new URL('../assets/pilot/huan-01.jpg',import.meta.url).href),
 normalSoft:pose('normal-01','少し不安げ・柔らかい表情',new URL('../assets/pilot/normal-01.jpg',import.meta.url).href),
 normal:pose('normal-03','少し不安げ・普通の表情',new URL('../assets/pilot/normal-03.jpg',import.meta.url).href),
 disappointed:pose('normal-02','少し残念',new URL('../assets/pilot/normal-02.jpg',import.meta.url).href),
 confident:pose('normal-04','自信あり',new URL('../assets/pilot/normal-04.jpg',import.meta.url).href),
 anxious:pose('huan-03','不安げ・普通の表情',new URL('../assets/pilot/huan-03.jpg',import.meta.url).href),
 slightlyAnxious:pose('huan-02','少し不安',new URL('../assets/pilot/huan-02.jpg',import.meta.url).href),
 certainConcern:pose('huan-04','不安が確信に変わる',new URL('../assets/pilot/huan-04.jpg',import.meta.url).href),
 shyWorry:pose('nayamu-01','照れと不安',new URL('../assets/pilot/nayamu-01.jpg',import.meta.url).href),
 doubtful:pose('nayamu-02','不安と疑惑',new URL('../assets/pilot/nayamu-02.jpg',import.meta.url).href),
 suspicious:pose('nayamu-03','明確な疑惑',new URL('../assets/pilot/nayamu-03.jpg',import.meta.url).href),
};
// Selection changes with dialogue/events, never with the display clock.
const linePoses={
 departure:['normalSoft','normal','normalSoft','confident'],
 search:['anxious','certainConcern','slightlyAnxious','normalSoft'],
 item:['happySmall','happySoft','happySoft','happySmall'],
 confident:['confident','appreciative','confident','appreciative'],
 human:['sadSoft','sadSoft','sadSoft','sadSudden'],
 limbs:['doubtful','doubtful','sadSudden'],
 bydo:['doubtful','suspicious','questioning','suspicious'],
 idle:['sadMemory','sadMemory','recalled','questioning','sadSudden'],
 afterBattle:['accomplished','accomplished','sadSudden','achieved'],
 return:['accomplished','accomplished','shyCute','accomplished'],
 boss:['recalled','doubtful','suspicious','suspicious'],
 part:['shySoft','shyWorry','recalled'],
 upgrade:['achieved','disappointed','achieved','shyCute'],
 multiKill:['surprised','accomplished','angelJoy','recalled'],
 thruster:['shySoft','shyCute',null],
 pain:['resisting','deepPain','deepPain','resisting'],
};
const expressionPoses={neutral:'normal',worried:'anxious',panicked:'cornered',thinking:'shyWorry',hesitant:'doubtful',distrustful:'suspicious',alert:'certainConcern',determined:'confident',smile:'happySmall',relieved:'happySoft',softSmile:'normalSoft',selfMocking:'disappointed',sneer:'appreciative',sad:'sadSoft',lonely:'sadMemory',satisfied:'achieved',surprised:'surprised',confused:'confused',stoic:'confused',questioning:'questioning',embarrassed:'shy',exasperated:'disappointed'};
export function suppliedPilotPortrait(action,telemetry){
 // Critical warnings always win over a softer line-specific expression.
 if(action.expression==='pain'){
  const deep=action.id?.startsWith('warning-')||Math.min(telemetry?.ship?.critical?.core??100,telemetry?.ship?.critical?.canopy??100)<=20||(telemetry?.vital?.value??100)<=5;
  if(deep)return SUPPLIED_PORTRAITS.deepPain;
 }
 if(action.expression==='worried'&&action.id?.startsWith('warning-'))return SUPPLIED_PORTRAITS.slightlyAnxious;
 if(action.portraitId){const supplied=Object.values(SUPPLIED_PORTRAITS).find(p=>p.id===action.portraitId);if(supplied)return supplied;}
 if(action.id==='mistake'||action.scene==='mistake')return SUPPLIED_PORTRAITS.mistake;
 const index=dialogue.scenes[action.scene]?.lines.indexOf(action.line),key=linePoses[action.scene]?.[index];
 if(key)return SUPPLIED_PORTRAITS[key];
 if(action.scene==='human'||action.scene==='limbs')return SUPPLIED_PORTRAITS.sadSoft;
 if(action.scene==='counter'||action.expression==='pain')return SUPPLIED_PORTRAITS.resisting;
 const fallback=expressionPoses[action.expression];return fallback?SUPPLIED_PORTRAITS[fallback]:null;
}
