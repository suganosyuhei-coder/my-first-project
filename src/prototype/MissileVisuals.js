import {missilePhase,MISSILE_PHASES} from './missileFlight.js';
const names={drop:'投下',ignite:'点火',launch:'発射',track:'追尾'};
export function drawMissileVisual(ctx,missile,screen,scale,escort=false,target=null){
 const p=screen(missile.position),phase=missile.phase??missilePhase(missile.age),color=escort?'#a5edff':'#ffcf83';ctx.save();
 const trail=missile.trail??[];
 // Smoke remains behind the bright core trail, making bends and acceleration legible.
 for(let i=0;i<trail.length;i+=4){const q=screen(trail[i]);ctx.fillStyle=`rgba(174,195,201,${.05+.15*i/Math.max(1,trail.length)})`;ctx.beginPath();ctx.arc(q.x,q.y,(3+(trail.length-i)*.15)*scale,0,Math.PI*2);ctx.fill();}
 for(const [width,stroke] of [[5,escort?'#82dfff33':'#ffb44933'],[2,color]]){ctx.strokeStyle=stroke;ctx.lineWidth=width*scale;ctx.beginPath();trail.forEach((point,i)=>{const q=screen(point);if(i)ctx.lineTo(q.x,q.y);else ctx.moveTo(q.x,q.y);});ctx.stroke();}
 if(target&&phase==='track'){const q=screen(target.position);ctx.strokeStyle=escort?'#b4ecff55':'#ffdf9c55';ctx.lineWidth=1;ctx.setLineDash([3,7]);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();ctx.setLineDash([]);for(const [x,y] of [[-1,-1],[1,-1],[-1,1],[1,1]]){ctx.beginPath();ctx.moveTo(q.x+x*11,q.y+y*17);ctx.lineTo(q.x+x*17,q.y+y*17);ctx.lineTo(q.x+x*17,q.y+y*11);ctx.stroke();}}
 ctx.save();ctx.translate(p.x,p.y);ctx.rotate(missile.heading);ctx.scale(scale,scale);
 if(phase!=='drop'){const length=phase==='ignite'?9:phase==='launch'?24:18,flare=length+Math.sin(missile.age*55)*3;ctx.fillStyle=escort?'#87dfff88':'#ff8f3d88';ctx.beginPath();ctx.moveTo(-5,6);ctx.lineTo(0,6+flare);ctx.lineTo(5,6);ctx.closePath();ctx.fill();ctx.fillStyle='#fff4bf';ctx.beginPath();ctx.moveTo(-2,5);ctx.lineTo(0,9+flare*.6);ctx.lineTo(2,5);ctx.closePath();ctx.fill();if(phase==='ignite'){ctx.strokeStyle='#fff0aa';ctx.lineWidth=1;ctx.beginPath();ctx.arc(0,6,9,0,Math.PI*2);ctx.stroke();}}
 ctx.fillStyle='#617883';ctx.fillRect(-6,2,12,6);ctx.fillStyle='#eefaff';ctx.fillRect(-3,-8,6,15);ctx.fillStyle=escort?'#64d8ff':'#ff9672';ctx.beginPath();ctx.moveTo(0,-15);ctx.lineTo(4,-8);ctx.lineTo(-4,-8);ctx.closePath();ctx.fill();ctx.fillStyle='#354b59';ctx.fillRect(-1,-5,2,9);ctx.restore();
 ctx.fillStyle=color;ctx.font='10px ui-monospace,monospace';ctx.fillText(`${escort?'PAW ':''}${names[phase]}`,p.x+11,p.y-10);ctx.restore();
}
export function drawMissileExplosion(ctx,position,age,screen,scale,escort=false){
 const t=Math.max(0,Math.min(1,age/MISSILE_PHASES.effectSeconds)),p=screen(position);ctx.save();ctx.globalAlpha=(1-t)**.7;
 if(t<.22){ctx.fillStyle='#fff8d8';ctx.beginPath();ctx.arc(p.x,p.y,(8+t*75)*scale,0,Math.PI*2);ctx.fill();}
 for(const [offset,color] of [[0,escort?'#b8edff':'#ffd29a'],[8,'#ff8b58']]){ctx.strokeStyle=color;ctx.lineWidth=(3-t*2)*scale;ctx.beginPath();ctx.arc(p.x,p.y,(8+t*38+offset)*scale,0,Math.PI*2);ctx.stroke();}
 for(let i=0;i<9;i++){const a=i*Math.PI*2/9,r=(8+t*48)*scale;ctx.fillStyle=i%2?'#ffab6a':'#fff0bb';ctx.fillRect(p.x+Math.cos(a)*r-2,p.y+Math.sin(a)*r-2,4*scale,4*scale);}
 ctx.fillStyle=escort?'#d3f2ff':'#ffe5bc';ctx.font='10px ui-monospace,monospace';ctx.fillText('爆発',p.x+13,p.y-15);ctx.restore();
}
