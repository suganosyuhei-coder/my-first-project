// Independent, ram-only replacements for the former combined encounters.
export const ORGANIC_ENCOUNTERS={
 eurypterid:{name:'ウミサソリ型',count:6,hp:690,radius:28,vital:4},
 earwig:{name:'ハサミムシ型',count:8,hp:690,radius:23,vital:4},
 tardigrade:{name:'大型クマムシ型',count:1,hp:2070,radius:70,vital:20},
 megadictyon:{name:'大型メガディクティオン型',count:1,hp:2070,radius:64,vital:20},
 pambdelurion:{name:'大型パンブデルリオン型',count:1,hp:2070,radius:64,vital:20},
};
const shapes={
 eurypterid:[[0,-.5,.65],[0,.4,.62],[0,1.15,.4],[0,1.8,.25]],
 earwig:[[0,-.65,.55],[0,0,.65],[0,.7,.55],[0,1.25,.36]],
 tardigrade:[[0,-.7,.62],[0,0,.95],[0,.85,.82]],
 megadictyon:Array.from({length:7},(_,i)=>[0,(i-2)*.46,.55+Math.sin(i/6*Math.PI)*.23]),
 pambdelurion:Array.from({length:8},(_,i)=>[0,(i-2)*.43,.45+Math.sin(i/7*Math.PI)*.3]),
};
const localBodies=Object.fromEntries(Object.entries(shapes).map(([type,shapes])=>[type,shapes.map(([x,y,r])=>({x:x*ORGANIC_ENCOUNTERS[type].radius,y:y*ORGANIC_ENCOUNTERS[type].radius,radius:r*ORGANIC_ENCOUNTERS[type].radius}))]));
export function organicLocalBodies(type){return localBodies[type]??null;}
export function organicWorldBodies(enemy){
 const local=organicLocalBodies(enemy.type);if(!local)return null;
 const c=Math.cos(enemy.heading??0),s=Math.sin(enemy.heading??0);
 return local.map(p=>({position:{x:enemy.position.x+p.x*c-p.y*s,y:enemy.position.y+p.x*s+p.y*c},radius:p.radius}));
}
