const editing=target=>/INPUT|SELECT|TEXTAREA/.test(target?.tagName||'')||target?.isContentEditable;
export function createBoostInput({enqueue,isRunning,heading}){
 const keys=new Set();let armed=false,suspended=false;
 const suspend=()=>{if(armed)enqueue({type:'boost-cancel'});armed=false;suspended=true;};
 const cancel=()=>{if(armed)enqueue({type:'boost-cancel'});keys.clear();armed=false;suspended=false;};
 return {
  down(e){
   if(e.ctrlKey||e.metaKey||e.altKey||(!['ShiftLeft','ShiftRight','Space','KeyA','KeyD','ArrowLeft','ArrowRight'].includes(e.code)&&keys.size)){if(keys.size)suspend();return;}
   if(!['ShiftLeft','ShiftRight'].includes(e.code)||editing(e.target)||e.repeat||!isRunning())return;
   e.preventDefault();if(keys.has(e.code))return;if(keys.size===0&&!suspended){armed=true;enqueue({type:'boost-press'});}keys.add(e.code);
  },
  up(e){if(!['ShiftLeft','ShiftRight'].includes(e.code)||!keys.has(e.code))return;e.preventDefault();keys.delete(e.code);if(keys.size===0){if(armed)enqueue({type:editing(e.target)||!isRunning()?'boost-cancel':'boost-release',heading:heading()});armed=false;suspended=false;}},
  focus(e){if(editing(e.target)&&keys.size)suspend();},cancel,
 };
}
