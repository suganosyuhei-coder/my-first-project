import {ORGANIC_ENCOUNTERS,organicLocalBodies} from './organicEncounters.js';
// Static red-line symbols. Physics and drawing share the same body centres.
export function drawOrganicEncounter(ctx,type,scale){
 const config=ORGANIC_ENCOUNTERS[type],r=config.radius*scale,bodies=organicLocalBodies(type);
 ctx.strokeStyle='#dd7474';ctx.fillStyle='#141f2a';ctx.lineWidth=1.3;ctx.lineJoin='miter';
 const path=points=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x*r,y*r):ctx.moveTo(x*r,y*r));ctx.stroke();};
 const legs=type==='tardigrade'?4:type==='eurypterid'?4:type==='earwig'?3:7;
 for(let i=0;i<legs;i++)for(const side of [-1,1]){
  const y=type==='tardigrade'?-.6+i*.5: type==='eurypterid'?-.2+i*.35:type==='earwig'?-.4+i*.4:-.65+i*.4;
  const reach=type==='pambdelurion'?1.3:1.05;
  path([[side*.35,y],[side*reach,y+.18],[side*(reach+.1),y+.42]]);
  if(type==='tardigrade')path([[side*(reach+.1),y+.42],[side*(reach+.27),y+.3]]);
 }
 for(const body of [...bodies].reverse()){
  const x=body.x*scale,y=body.y*scale,b=body.radius*scale;
  ctx.beginPath();ctx.moveTo(x,y-b);ctx.lineTo(x+b*.8,y-b*.5);ctx.lineTo(x+b,y+b*.4);ctx.lineTo(x,y+b);ctx.lineTo(x-b,y+b*.4);ctx.lineTo(x-b*.8,y-b*.5);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(x-b*.6,y);ctx.lineTo(x+b*.6,y);ctx.stroke();
 }
 if(type==='eurypterid'){
  for(const side of [-1,1])path([[side*.4,-.5],[side*1.2,-1.15],[side*1.3,-1.8],[side*.9,-1.55]]);
  path([[0,1.8],[-.35,2.5],[0,2.3],[.35,2.5],[0,1.8]]);
 }else if(type==='earwig'){
  for(const side of [-1,1]){path([[side*.2,1.3],[side*.8,1.9],[side*.65,2.4],[side*.15,2.15]]);path([[side*.2,-1],[side*.7,-1.6]]);}
 }else if(type==='megadictyon'||type==='pambdelurion'){
  for(const side of [-1,1]){path([[side*.35,-.75],[side*1.15,-1.5],[side*.9,-2],[side*.3,-1.65]]);for(let i=0;i<3;i++)path([[side*(.5+i*.2),-1.2-i*.17],[side*(.35+i*.2),-1.4-i*.17]]);}
  ctx.beginPath();ctx.arc(0,-r*.8,r*.23,0,Math.PI*2);ctx.stroke();
  if(type==='pambdelurion')for(let i=0;i<6;i++)for(const side of [-1,1])path([[side*.6,-.25+i*.4],[side*1.55,-.05+i*.4],[side*.65,.15+i*.4]]);
 }else{path([[-.25,-1.05],[0,-1.2],[.25,-1.05]]);}
 for(const side of [-1,1])ctx.strokeRect(side*r*.2-r*.045,-r*.85,r*.09,r*.09);
}
