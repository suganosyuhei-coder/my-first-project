import {centipedeBody} from './enemyBodies.js';
export function drawBerserk(ctx,r,time,slot=0){
 ctx.fillStyle='#6f315b';ctx.strokeStyle='#ff8edb';ctx.lineWidth=1.5;ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4,reach=r*(i%2?.7:1.2);const x=Math.cos(a)*reach,y=Math.sin(a)*reach;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);}ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#ffc7f1';ctx.fillRect(-r*.55,-r*.3,r*1.1,r*.25);ctx.strokeStyle='#e65aae';ctx.lineWidth=1;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*r*.65,r*.2);ctx.lineTo(side*r*1.4,r*(.4+Math.sin(time*9+slot)*.25));ctx.lineTo(side*r,r*1.2);ctx.stroke();}ctx.fillStyle='#2b1029';ctx.fillRect(-r*.3,-r*.27,r*.2,r*.2);
}
export function drawCentipede(ctx,scale,time){
 const body=centipedeBody(0);ctx.strokeStyle='#dd7474';ctx.fillStyle='#141f2a';ctx.lineWidth=1.2;ctx.lineJoin='miter';
 for(let i=body.length-1;i>=0;i--){const p=body[i],x=p.x*scale,y=p.y*scale,r=p.radius*scale;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(x+side*r*.7,y);ctx.lineTo(x+side*r*1.5,y-5*scale);ctx.lineTo(x+side*r*1.9,y+5*scale);ctx.stroke();}ctx.beginPath();ctx.moveTo(x,y-r*.8);ctx.lineTo(x+r,y);ctx.lineTo(x,y+r*.8);ctx.lineTo(x-r,y);ctx.closePath();ctx.fill();ctx.stroke();ctx.strokeRect(x-r*.18,y-r*.18,r*.36,r*.36);}
 const x=body[0].x*scale;for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(x+side*8*scale,-9*scale);ctx.lineTo(x+side*17*scale,-22*scale);ctx.lineTo(x+side*7*scale,-18*scale);ctx.stroke();}
}
export function drawScorpion(ctx,r,time){
 ctx.save();ctx.strokeStyle='#dd7474';ctx.fillStyle='#141f2a';ctx.lineWidth=1.5;ctx.lineJoin='miter';
 for(const side of [-1,1])for(let i=0;i<4;i++){const y=(i-1.5)*r*.4;ctx.beginPath();ctx.moveTo(side*r*.5,y);ctx.lineTo(side*r*1.2,y-r*.3);ctx.lineTo(side*r*1.6,y+r*.2);ctx.stroke();}
 ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(r*.7,-r*.4);ctx.lineTo(r*.7,r*.5);ctx.lineTo(0,r);ctx.lineTo(-r*.7,r*.5);ctx.lineTo(-r*.7,-r*.4);ctx.closePath();ctx.fill();ctx.stroke();for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(-r*.5,(i-1)*r*.35);ctx.lineTo(r*.5,(i-1)*r*.35);ctx.stroke();}
 for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*r*.5,-r*.5);ctx.lineTo(side*r*1.2,-r*1.1);ctx.lineTo(side*r*1.4,-r*1.6);ctx.lineTo(side*r*1.8,-r*2);ctx.lineTo(side*r*1.3,-r*2.1);ctx.moveTo(side*r*1.4,-r*1.6);ctx.lineTo(side*r*1.05,-r*1.9);ctx.lineTo(side*r*1.25,-r*2.1);ctx.stroke();}
 const tail=[[0,r*.8],[r*.35,r*1.35],[r*.8,r*1.5],[r*1.2,r*1.1],[r*1.1,r*.5],[r*.7,r*.1]];ctx.beginPath();tail.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.stroke();for(const [x,y] of tail)ctx.strokeRect(x-r*.06,y-r*.06,r*.12,r*.12);ctx.beginPath();ctx.moveTo(r*.7,r*.1);ctx.lineTo(r*.45,-r*.1);ctx.lineTo(r*.5,r*.2);ctx.closePath();ctx.stroke();ctx.strokeRect(-r*.3,-r*.65,r*.2,r*.13);ctx.strokeRect(r*.1,-r*.65,r*.2,r*.13);ctx.restore();
}
