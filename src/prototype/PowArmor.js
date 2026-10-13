// Code-native pixel sprite: rounded armored torso, front visor, two mechanical legs.
const BODY=[
'      hhhhhhhh      ',
'    hpppppppphh     ',
'   hppppppppppph    ',
'  hppppppppppppph   ',
' vvvppppppppppppph  ',
'vvvvppppphhhppppppb ',
'vvvvppppphddppppppb ',
'vvvvppppphddppppppb ',
' vvvppppphhhppppppb ',
'  bppppppppppppppbb ',
'   bppppppppppppbb  ',
'    bbbppppppbbbb   ',
'      bbbbbbbb      ',
];
export const POW_COLORS=['blue','red','yellow'];
const PALETTES={white:{p:'#e1e8ed',b:'#536979',h:'#ffffff'},green:{p:'#57b877',b:'#214d3c',h:'#d3f4b5'},blue:{p:'#4f80bd',b:'#243d64',h:'#c4d5e5'},red:{p:'#bb5967',b:'#602a3e',h:'#e1c5cd'},yellow:{p:'#c5a54d',b:'#68552a',h:'#e8dfbc'}};
export function drawPowArmor(ctx,r,elapsed,variant='blue'){
 const colors={...(PALETTES[variant]??PALETTES.blue),v:variant==='green'?'#d9ffac':variant==='white'?'#98e4ff':'#df6a58',d:'#192535'},pixel=Math.max(1,Math.round(r/10));
 ctx.save();ctx.translate(-10*pixel,-11*pixel);
 for(let y=0;y<BODY.length;y++)for(let x=0;x<BODY[y].length;x++){const color=colors[BODY[y][x]];if(color){ctx.fillStyle=color;ctx.fillRect(x*pixel,y*pixel,pixel,pixel);}}
 const stride=Math.sin(elapsed*9)>0?1:-1;
 for(const [side,x] of [[-1,6],[1,12]]){const shift=side*stride;ctx.fillStyle=colors.b;ctx.fillRect(x*pixel,12*pixel,3*pixel,3*pixel);ctx.fillStyle=colors.p;ctx.fillRect((x+shift)*pixel,14*pixel,3*pixel,5*pixel);ctx.fillStyle=colors.h;ctx.fillRect((x+shift-1)*pixel,19*pixel,5*pixel,2*pixel);ctx.fillStyle=colors.b;ctx.fillRect((x+shift-1)*pixel,21*pixel,5*pixel,pixel);}
 ctx.restore();
}
