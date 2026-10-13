// One inexpensive effect for every attack: one ring and six small sparks.
const DIRECTIONS=Array.from({length:6},(_,i)=>({x:Math.cos(i*Math.PI/3),y:Math.sin(i*Math.PI/3)}));
export function drawDestruction(ctx,p,r,t,scale){
 ctx.save();ctx.globalAlpha=1-t;ctx.strokeStyle='#ffd18a';ctx.lineWidth=Math.max(1,scale);
 const reach=r*(.4+t*1.8);
 ctx.beginPath();ctx.arc(p.x,p.y,reach,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle='#ffe3a6';const size=Math.max(1,3*scale*(1-t));
 for(const d of DIRECTIONS)ctx.fillRect(p.x+d.x*reach-size/2,p.y+d.y*reach-size/2,size,size);
 ctx.restore();
}
