// Every pose uses the same display coordinates, scale reference and top anchor.
// Image and clip move together; no frame changes the portrait's view box or size.
export const PORTRAIT_VIEW={width:224,height:289.3};
export function pilotPortraitGeometry(crop){
 const scale=PORTRAIT_VIEW.width/(crop.referenceWidth??crop.width),x=(PORTRAIT_VIEW.width-crop.width*scale)/2;
 return {clip:{x,y:0,width:crop.width*scale,height:crop.height*scale},image:{x:x-crop.x*scale,y:-crop.y*scale,width:crop.sourceWidth*scale,height:crop.sourceHeight*scale}};
}
