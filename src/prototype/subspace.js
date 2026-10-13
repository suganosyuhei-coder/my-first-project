export function subspaceActive(game){return game.status==='running'&&Boolean(game.flight?.planetDive||(game.boost?.subspace&&game.boost.remaining>0));}
