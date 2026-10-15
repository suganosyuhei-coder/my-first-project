import {drawPowArmor} from './PowArmor.js';
import {tentacleLocal} from './enemyAnatomy.js';
export {drawGiantFaceBoss as drawTentacleBoss} from './GiantFaceBoss.js';
export function drawSniper(ctx,r){
 ctx.fillStyle='#233c4a';ctx.strokeStyle='#85cfe0';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(r*.85,-r*.2);ctx.lineTo(r*.65,r);ctx.lineTo(-r*.65,r);ctx.lineTo(-r*.85,-r*.2);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#6a9faf';ctx.fillRect(-r*.17,-r*1.9,r*.34,r*2);ctx.fillStyle='#d5f8ff';ctx.fillRect(-r*.23,-r*1.95,r*.46,r*.2);ctx.fillStyle='#a5e6f4';ctx.fillRect(-r*.5,-r*.25,r,.3*r);ctx.fillStyle='#162831';ctx.fillRect(-r*.12,-r*.2,r*.24,r*.5);
}
export function drawMossMember(ctx,r,slot=0,time=0,kind='moss',count=8){
 const wobble=Math.sin(time*1.1+slot)*.04;ctx.fillStyle=kind==='snake'?['#345f68','#426d72','#487e7c'][slot%3]:kind==='crab'?['#6f4c42','#855749','#775b43'][slot%3]:['#4a6d40','#577346','#42663e','#647d48'][slot%4];ctx.strokeStyle=kind==='snake'?'#83c7c8':kind==='crab'?'#d79c7b':'#91ab64';ctx.lineWidth=1;ctx.beginPath();for(let i=0;i<12;i++){const a=i*Math.PI/6,reach=r*(i%2?.84:1.08+wobble);if(i)ctx.lineTo(Math.cos(a)*reach,Math.sin(a)*reach);else ctx.moveTo(Math.cos(a)*reach,Math.sin(a)*reach);}ctx.closePath();ctx.fill();ctx.stroke();for(let i=0;i<9;i++){const a=i*2.399+slot,reach=r*(.3+(i%3)*.22);ctx.fillStyle=i%3?'#a5bc6b':'#2e513b';ctx.fillRect(Math.cos(a)*reach-2,Math.sin(a)*reach-2,4,4);}ctx.fillStyle='#b891aa';ctx.beginPath();ctx.arc(0,0,r*.25,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ecdcad';ctx.fillRect(-r*.08,-r*.2,r*.16,r*.4);if(kind==='snake'&&(slot===0||slot===count-1)){const side=slot===0?-1:1;ctx.fillStyle='#76b4aa';ctx.beginPath();ctx.moveTo(-r*.85,side*r*.3);ctx.lineTo(-r*.6,side*r*1.3);ctx.lineTo(r*.6,side*r*1.3);ctx.lineTo(r*.85,side*r*.3);ctx.closePath();ctx.fill();ctx.fillStyle='#fff1b3';for(const x of [-.42,.42])ctx.fillRect(x*r-r*.12,side*r*.65,r*.24,r*.2);ctx.strokeStyle='#f89da6';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,side*r*1.3);ctx.lineTo(0,side*r*1.8);ctx.lineTo(-r*.2,side*r*2);ctx.moveTo(0,side*r*1.8);ctx.lineTo(r*.2,side*r*2);ctx.stroke();}if(kind==='crab'&&(slot===7||slot===8)){ctx.strokeStyle='#e3af82';ctx.lineWidth=r*.27;ctx.beginPath();ctx.moveTo(-r*.7,-r*.3);ctx.lineTo(-r*.8,-r*1.4);ctx.lineTo(-r*.25,-r*1.7);ctx.moveTo(r*.7,-r*.3);ctx.lineTo(r*.8,-r*1.4);ctx.lineTo(r*.25,-r*1.7);ctx.stroke();}
}

export function drawMossCaptives(ctx,centre,scale,time,kind='moss',count=2){
 ctx.save();ctx.translate(centre.x,centre.y);
 for(let i=0;i<count;i++){
  const side=i%2?-1:1,x=(kind==='snake'?side*43:kind==='crab'?(i-1.5)*45:kind==='largeMoss'?side*88:side*58)*scale,y=(kind==='snake'?(i-1)*80:kind==='crab'?3:kind==='largeMoss'?(Math.floor(i/2)*2-1)*42:6)*scale;
  for(const [width,color] of [[6,'#304b36'],[2,'#91a764']]){ctx.strokeStyle=color;ctx.lineWidth=width*scale;ctx.beginPath();ctx.moveTo(side*18*scale,-18*scale);ctx.bezierCurveTo(side*55*scale,-35*scale,side*78*scale,-12*scale,x+side*8*scale,y+12*scale);ctx.bezierCurveTo(x-side*22*scale,y+22*scale,x-side*25*scale,y-11*scale,side*25*scale,8*scale);ctx.stroke();ctx.beginPath();ctx.moveTo(x-15*scale,y-5*scale);ctx.lineTo(x+14*scale,y+5*scale);ctx.moveTo(x-13*scale,y+6*scale);ctx.lineTo(x+12*scale,y-8*scale);ctx.stroke();}
  ctx.fillStyle='#6d8745';for(let leaf=0;leaf<4;leaf++){const a=leaf*1.8+i;ctx.fillRect(x+Math.cos(a)*18*scale-3,y+Math.sin(a)*13*scale-2,6*scale,4*scale);}
  ctx.save();ctx.translate(x,y);drawPowArmor(ctx,14*scale,time*.2,count>=3&&i===0?'green':i%2?'yellow':'blue');ctx.strokeStyle='#83a353';ctx.lineWidth=2*scale;ctx.beginPath();ctx.moveTo(-12*scale,-3*scale);ctx.lineTo(12*scale,4*scale);ctx.moveTo(-10*scale,5*scale);ctx.lineTo(10*scale,-5*scale);ctx.stroke();ctx.restore();
 }
 ctx.restore();
}
