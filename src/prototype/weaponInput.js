const typing=target=>/INPUT|SELECT|TEXTAREA/.test(target?.tagName||'')||target?.isContentEditable;
// Space is reserved for shooting; Enter retains native activation for craft buttons.
export function createWeaponInput({enqueue,isRunning,heading,isAuto=()=>false}){
 let pressed=false,metaPending=false;
 const cancel=()=>{if(pressed||isAuto())enqueue({type:'weapon-cancel'});pressed=false;metaPending=false;};
 return {
  down(event){if(event.code==='MetaLeft'||event.code==='MetaRight'){if(!event.repeat&&!typing(event.target)&&isRunning())metaPending=true;return;}metaPending=false;if(event.code!=='Space'||typing(event.target))return;event.preventDefault();if(event.repeat||pressed||!isRunning())return;pressed=true;enqueue({type:'weapon-press'});},
  up(event){if(event.code==='MetaLeft'||event.code==='MetaRight'){if(metaPending&&!typing(event.target)&&isRunning())enqueue({type:'weapon-auto-toggle'});metaPending=false;return;}if(event.code!=='Space')return;if(pressed){event.preventDefault();enqueue({type:typing(event.target)?'weapon-cancel':'weapon-release',heading:heading()});pressed=false;}},
  focus(event){if(typing(event.target))cancel();},cancel,
 };
}
