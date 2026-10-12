// Issue #6 provisional rendering values, independent of environmental physics.
export const NEBULA_DETAIL={feather:20,coarseLevels:16,fineLevels:64};
export function observationDetailWeight(point,camera,radius,feather=NEBULA_DETAIL.feather){
 if(radius<=0)return 0;const distance=Math.hypot(point.x-camera.x,point.y-camera.y),start=Math.max(0,radius-feather),t=Math.max(0,Math.min(1,(distance-start)/(radius-start)));
 return 1-t*t*(3-2*t);
}
export function observationCrop(width,height,scale,radius){const w=Math.min(width,2*radius*scale),h=Math.min(height,2*radius*scale);return {width:w,height:h,left:(width-w)/2,top:(height-h)/2};}
