import {bossWorldPoint,bossTailLocal,bossParasite} from './enemyAnatomy.js';
import data from './enemyTypes.json' with {type:'json'};
// Shared metres-based geometry for the drawn carapace and all contact tests.
export function centipedeBody(time=0){return Array.from({length:12},(_,i)=>({x:Math.sin(-i*.65)*Math.min(i*1.8,13),y:i*14,radius:Math.max(6,16-i*.7)}));}
export function enemyBodies(enemy){
 const radius=data.types.find(t=>t.id===enemy.type)?.radius??8;
 if(enemy.type==='finalBoss')return [{position:bossWorldPoint(enemy,{x:-12,y:-76}),radius:65},{position:bossWorldPoint(enemy,{x:20,y:30}),radius:55},...bossTailLocal(enemy.bodyTime??0).filter((_,i)=>i%2===0).map(p=>({position:bossWorldPoint(enemy,p),radius:p.radius}))];
 if(enemy.type!=='centipede')return [{position:enemy.position,radius}];
 const c=Math.cos(enemy.heading??0),s=Math.sin(enemy.heading??0);return centipedeBody(enemy.bodyTime??0).map(p=>({position:{x:enemy.position.x+p.x*c-p.y*s,y:enemy.position.y+p.x*s+p.y*c},radius:p.radius}));
}
export function segmentHit(from,to,center,radius){
 const dx=to.x-from.x,dy=to.y-from.y,fx=from.x-center.x,fy=from.y-center.y,a=dx*dx+dy*dy,c=fx*fx+fy*fy-radius*radius;
 if(c<=0)return 0;if(a===0)return null;
 const b=2*(fx*dx+fy*dy),disc=b*b-4*a*c;if(disc<0)return null;
 const t=(-b-Math.sqrt(disc))/(2*a);return t>=0&&t<=1?t:null;
}
export function enemySegmentHit(from,to,enemy,padding=0){if(enemy.type==='finalBoss'&&enemy.parasiteRevealed){const core=bossParasite(enemy),t=segmentHit(from,to,core.position,core.radius+padding);if(t!==null)return t;}let first=null;for(const body of enemyBodies(enemy)){const t=segmentHit(from,to,body.position,body.radius+padding);if(t!==null&&(first===null||t<first))first=t;}return first;}
