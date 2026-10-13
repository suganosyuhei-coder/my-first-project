import {drawWeakpointFeedback} from './WeakpointFeedback.js';
import {tentacleLocal,bossTailLocal,bossMouthLocal,bossParasiteLocal} from './enemyAnatomy.js';
// Static diagram-like anatomy, in the same red-line language as the other hostiles.
export function drawGiantFaceBoss(ctx,r,time,enemy={}){
 ctx.save();ctx.strokeStyle='#dd7474';ctx.fillStyle='#141f2a';ctx.lineWidth=1.5;ctx.lineJoin='miter';
 const path=(points,fill=false)=>{ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x*r,y*r):ctx.moveTo(x*r,y*r));ctx.closePath();if(fill)ctx.fill();ctx.stroke();};
 const tail=bossTailLocal(0,r);ctx.beginPath();tail.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();for(let i=0;i<tail.length;i+=3){const p=tail[i],a=p.radius;ctx.beginPath();ctx.moveTo(p.x,p.y-a);ctx.lineTo(p.x+a,p.y);ctx.lineTo(p.x,p.y+a);ctx.lineTo(p.x-a,p.y);ctx.closePath();ctx.fill();ctx.stroke();}
 for(let i=0;i<4;i++){const points=tentacleLocal(i,0,r),tip=points.at(-1);ctx.beginPath();points.forEach((p,j)=>j?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();const x=tip.x/r,y=tip.y/r;path([[x,y-.17],[x+.13,y],[x,y+.17],[x-.13,y]],true);ctx.strokeRect(tip.x-r*.035,tip.y-r*.035,r*.07,r*.07);}
 // Torso and ribs.
 path([[.2,-.7],[.72,-.4],[.8,.45],[.45,1.15],[-.2,1.1],[-.53,.5],[-.5,-.3]],true);
 for(let i=0;i<5;i++){const y=-.35+i*.28;ctx.beginPath();ctx.moveTo(-r*.33,y*r);ctx.lineTo(r*.1,(y+.08)*r);ctx.lineTo(r*.6,y*r);ctx.stroke();}
 // Empty limb sockets are crossed squares rather than fleshy illustrations.
 for(const [x,y] of [[-.5,-.4],[.68,-.3],[-.38,.9],[.5,1.06]]){ctx.fillRect((x-.13)*r,(y-.17)*r,r*.26,r*.34);ctx.strokeRect((x-.13)*r,(y-.17)*r,r*.26,r*.34);ctx.beginPath();ctx.moveTo((x-.08)*r,(y-.11)*r);ctx.lineTo((x+.08)*r,(y+.11)*r);ctx.moveTo((x+.08)*r,(y-.11)*r);ctx.lineTo((x-.08)*r,(y+.11)*r);ctx.stroke();}
 // Huge head: angular skull, single eye, jaw and directional mouth bars.
 path([[.35,-.35],[.58,-.9],[.3,-1.65],[-.45,-1.65],[-.95,-1.2],[-.9,-.85],[-.6,-.57],[-.2,-.45]],true);
 path([[-.8,-1.3],[-.4,-1.45],[-.22,-1.24],[-.56,-1.1]],false);ctx.beginPath();ctx.moveTo(-r*.49,-r*1.36);ctx.lineTo(-r*.49,-r*1.16);ctx.stroke();
 const mouth=bossMouthLocal(r);ctx.strokeRect(mouth.x-r*.25,mouth.y-r*.09,r*.5,r*.18);for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(mouth.x+(-.18+i*.12)*r,mouth.y-r*.09);ctx.lineTo(mouth.x+(-.12+i*.12)*r,mouth.y);ctx.lineTo(mouth.x+(-.18+i*.12)*r,mouth.y+r*.09);ctx.stroke();}ctx.beginPath();ctx.moveTo(-r*.88,-r*.79);ctx.lineTo(-r*.6,-r*.65);ctx.lineTo(-r*.3,-r*.85);ctx.stroke();
 // Abdominal parasite stays a separate symbol in both concealed and exposed states.
 const p=bossParasiteLocal(r),x=p.x/r,y=p.y/r;ctx.strokeStyle=enemy.parasiteRevealed?'#ffb0a4':'#dd7474';path([[x-.3,y-.2],[x,y-.37],[x+.3,y-.2],[x+.3,y+.2],[x,y+.37],[x-.3,y+.2]],true);
 if(enemy.parasiteRevealed){ctx.lineWidth=2;path([[x-.2,y-.17],[x+.16,y-.17],[x+.22,y+.14],[x,y+.23],[x-.22,y+.12]],false);ctx.strokeRect((x-.13)*r,(y-.1)*r,r*.07,r*.05);ctx.strokeRect((x+.06)*r,(y-.1)*r,r*.07,r*.05);ctx.beginPath();ctx.moveTo((x-.13)*r,(y+.08)*r);ctx.lineTo((x+.13)*r,(y+.08)*r);ctx.stroke();}
 else {ctx.beginPath();ctx.moveTo((x-.17)*r,(y-.18)*r);ctx.lineTo((x+.17)*r,(y+.18)*r);ctx.moveTo((x+.17)*r,(y-.18)*r);ctx.lineTo((x-.17)*r,(y+.18)*r);ctx.stroke();for(let i=0;i<(enemy.parasiteHits??0);i++)ctx.strokeRect((x-.12+i*.16)*r,(y+.25)*r,r*.08,r*.05);}
 drawWeakpointFeedback(ctx,p,r*.26,enemy,time);
 ctx.restore();
}
