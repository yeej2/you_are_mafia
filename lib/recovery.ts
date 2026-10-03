import {message,type Game} from './game.ts';
export function recoverHost(g:Game,seen:Record<string,number>,now:number){for(const p of g.players)if(!p.bot)p.absent=now-(seen[p.id]||0)>45000;if(g.players.find(p=>p.id===g.host)?.absent){const next=g.players.find(p=>!p.bot&&!p.absent);if(next){g.host=next.id;message(g,`${next.name} is now the host after a disconnect.`);}}}
