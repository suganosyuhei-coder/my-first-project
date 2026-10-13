// Static local anatomy is shared by red-line drawing, collision and projectile origins.
export function tentacleLocal(index,time=0,radius=85){
 const angle=Math.PI/4+index*Math.PI/2,radial={x:Math.cos(angle),y:Math.sin(angle)},side={x:-radial.y,y:radial.x},points=[];
 for(let i=0;i<=16;i++){const t=i/16,length=radius*(.78+t*1.55),bend=Math.sin(t*Math.PI*1.4+index*.8)*radius*.25*t;points.push({x:radial.x*length+side.x*bend,y:radial.y*length+side.y*bend});}
 return points;
}
export function bossTentacleTips(enemy,time=0){const c=Math.cos(enemy.heading??0),s=Math.sin(enemy.heading??0);return Array.from({length:4},(_,i)=>{const p=tentacleLocal(i,time).at(-1);return {x:enemy.position.x+p.x*c-p.y*s,y:enemy.position.y+p.x*s+p.y*c};});}
export const SNIPER={warning:1.2,duration:.28,radius:2.5};
export function sniperOrigin(enemy){const heading=enemy.attackHeading??enemy.heading;return {x:enemy.position.x+Math.sin(heading)*18,y:enemy.position.y-Math.cos(heading)*18};}
export function launchSniperLaser(state,enemy,type,damageScale=1){state.shots.push({id:state.nextShot++,enemyType:enemy.type,kind:'sniperLaser',position:sniperOrigin(enemy),heading:enemy.attackHeading,velocity:{x:0,y:0},radius:SNIPER.radius,length:type.shootRange,damage:type.damage*damageScale,remaining:SNIPER.duration,hitCooldown:0});}
export function bossWorldPoint(enemy,p){const c=Math.cos(enemy.heading??0),s=Math.sin(enemy.heading??0);return {x:enemy.position.x+p.x*c-p.y*s,y:enemy.position.y+p.x*s+p.y*c};}
export const bossMouthLocal=r=>({x:-r*.62,y:-r*1.03});
export const bossParasiteLocal=r=>({x:-r*.12,y:r*.35});
export function bossMouth(enemy){return bossWorldPoint(enemy,bossMouthLocal(85));}
export function bossParasite(enemy){return {position:bossWorldPoint(enemy,bossParasiteLocal(85)),radius:85*.26};}
export function bossTailLocal(time=0,r=85){const points=[];for(let i=0;i<=36;i++){const t=i/36,u=1-t;points.push({x:(u*u*u*.35+3*u*u*t*.9+3*u*t*t*(-2.6)+t*t*t*(-1.9))*r+Math.sin(t*8)*r*.035*t,y:(u*u*u*.95+3*u*u*t*3.8+3*u*t*t*3.3+t*t*t*.7)*r,radius:r*(.19-.115*t)});}return points;}

export const PARASITE_LASER_OFFSETS=[-.22,0,.22];
