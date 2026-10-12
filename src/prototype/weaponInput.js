const typing=target=>/INPUT|SELECT|TEXTAREA/.test(target?.tagName||'')||target?.isContentEditable;
// Space is reserved for shooting; Enter retains native activation for craft buttons.
export function createWeaponInput({enqueue,isRunning,heading}){
 let pressed=false;
 const cancel=()=>{if(pressed)enqueue({type:'weapon-cancel'});pressed=false;};
 return {
  down(event){if(event.code!=='Space'||typing(event.target))return;event.preventDefault();if(event.repeat||pressed||!isRunning())return;pressed=true;enqueue({type:'weapon-press'});},
  up(event){if(event.code!=='Space')return;if(pressed){event.preventDefault();enqueue({type:typing(event.target)?'weapon-cancel':'weapon-release',heading:heading()});pressed=false;}},
  focus(event){if(typing(event.target))cancel();},cancel,
 };
}
