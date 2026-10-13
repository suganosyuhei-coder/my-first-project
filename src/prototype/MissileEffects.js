import {renderCamera} from './camera.js';
import {worldToScreen} from './model.js';
import {drawMissileVisual,drawMissileExplosion} from './MissileVisuals.js';
export function drawMissiles(ctx,width,height,game){
 const state=game.missiles;if(!state)return;const scale=game.viewport.scale,screen=p=>worldToScreen(p,renderCamera(game),width,height,scale);ctx.save();
 for(const missile of state.units){const p=screen(missile.position);if(p.x<-100||p.y<-100||p.x>width+100||p.y>height+100)continue;const target=game.enemies.units.find(e=>e.id===missile.targetId&&e.hp>0);drawMissileVisual(ctx,missile,screen,scale,false,target);}
 for(const effect of state.effects)drawMissileExplosion(ctx,effect.position,effect.age,screen,scale);
 ctx.restore();
}
