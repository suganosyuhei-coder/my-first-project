import {createGame} from '../../src/prototype/game.js';
export function createEquippedGame(options={}){return createGame({initialEquipment:true,manualPlacement:true,...options});}
