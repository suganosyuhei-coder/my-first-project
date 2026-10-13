export function startFlight(game){
 if(!game.introduction||game.status!=='running')return false;
 game.introduction=false;game.commands.length=0;return true;
}
