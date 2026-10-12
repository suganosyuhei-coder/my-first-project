// Issue #6 provisional display tuning; never scales physics or observation distances.
export const CAMERA={baseScale:1.55,zoomOut:.18};
export const flightScale=(tuning)=>CAMERA.baseScale*(1-CAMERA.zoomOut)*(tuning?.camera.zoom??1);
