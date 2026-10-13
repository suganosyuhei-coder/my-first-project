// Issue #6 provisional display tuning; never scales physics or observation distances.
export const CAMERA={baseScale:1.55,zoomOut:.18};
export const flightScale=(tuning)=>CAMERA.baseScale*(1-CAMERA.zoomOut)*(tuning?.camera.zoom??1);

// Shift the view only; simulation and observation remain centred on the physical ship.
export function renderCamera(game){const v=game.tuning?.ship.visualScale??1;return {x:game.flight.position.x+76*v,y:game.flight.position.y-108*v};}
export function flightAnchor(game,width,height){const v=(game.tuning?.ship.visualScale??1)*game.viewport.scale;return {x:width/2-76*v,y:height/2+108*v};}
