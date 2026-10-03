export type Role = 'Citizen' | 'Mafia' | 'Detective' | 'Doctor';

export type Phase = 'lobby' | 'day' | 'vote' | 'night' | 'ended';

export type Player = {id:string; name:string; bot:boolean; alive:boolean; role:Role; assignedRole?:Role; appearance?:string; voice?:string; persona:string; boldness:number; deception:number; notes:string[]; memory:string; absent?:boolean};

export type ReplayFrame = {day:number;phase:Phase;name:string;text:string;playerId?:string;event?:'vote'|'attack'|'protect'|'investigate';actorId?:string;targetId?:string;players:{id:string;name:string;role:Role;alive:boolean}[]};

export type Message = {name:string; text:string; playerId?:string};

export type Game = {simulation?:boolean;discussionTurns?:number;replay?:ReplayFrame[];code:string; host:string; phase:Phase; day:number; players:Player[]; messages:Message[]; votes:Record<string,string>; actions:Record<string,string>; winner:string|null; revision:number; deadline:number; aiCalls:number; aiMode:'strategy'|'connected'|'fallback'; history:{day:number;votes:Record<string,string>;eliminated:string|null}[]; lastChat:Record<string,number>; turn:number};

export const cast = [

 {name:'Vivian Voss',persona:'Elegant and calculating. Ask who benefits. Use measured, precise sentences and quietly undermine weak alibis.',boldness:70,deception:90},

 {name:'Frankie Vale',persona:'Brash showman. Big confident claims, pointed questions, playful exaggeration. Never give up a defense easily.',boldness:95,deception:80},

 {name:'Professor Finch',persona:'Methodical skeptic. Compare voting records, state uncertainty, notice contradictions. Short analytical sentences.',boldness:35,deception:75},

 {name:'Ruby Monroe',persona:'Charming coalition builder. Address people warmly, persuade through questions, make strategic alliances.',boldness:65,deception:85},

 {name:'Silas Reed',persona:'Quiet observer. Few words, dry wit, suspicious of convenient consensus. Wait for evidence before committing.',boldness:25,deception:80},

 {name:'Pearl Black',persona:'Fearless prosecutor. Demand specific explanations and challenge people who dodge direct questions.',boldness:85,deception:55},

 {name:'Oscar Night',persona:'Patient strategist with dry humor. Keep a consistent story, deflect gracefully, count the votes.',boldness:45,deception:70}

];

const number=(n:unknown)=>Number.isFinite(Number(n))?Math.max(0,Math.min(100,Number(n))):50;

export function player(id:string,name:string,bot=false,p:Partial<Player>={}):Player{return{id,name:name.trim().slice(0,24)||'Guest',bot,alive:true,role:'Citizen',persona:String(p.persona||'Curious and observant.').slice(0,500),boldness:number(p.boldness??50),deception:number(p.deception??50),notes:[],memory:'',appearance:String(p.appearance||'').slice(0,300),voice:['alloy','ash','coral','echo','fable','nova','onyx','sage'].includes(p.voice||'')?p.voice:'alloy',...(p.assignedRole?{assignedRole:p.assignedRole}:{})};}

export function create(code:string,id:string,name:string):Game{return{code,host:id,phase:'lobby',day:0,players:[player(id,name)],messages:[],votes:{},actions:{},winner:null,revision:0,deadline:0,aiCalls:0,aiMode:'strategy',history:[],lastChat:{},turn:0};}

export function normalize(g:Game):Game {g.deadline??=0;g.aiCalls??=0;g.aiMode??='strategy';g.history??=[];g.lastChat??={};g.turn??=0;g.players.forEach(p=>p.memory??='');return g;}

export const alive=(g:Game)=>g.players.filter(p=>p.alive);

export const pick=<T,>(xs:T[]):T=>xs[Math.floor(Math.random()*xs.length)];

export function message(g:Game,text:string,name='The moderator',playerId?:string){g.messages.push({name,text:text.slice(0,400),...(playerId?{playerId}:{})});g.messages=g.messages.slice(-160);recordReplay(g,text,name,playerId);}

export function recordReplay(g:Game,text:string,name='The moderator',playerId?:string,event?:ReplayFrame['event'],actorId?:string,targetId?:string){if(!g.simulation)return;g.replay??=[];if(g.replay.length<1000)g.replay.push({day:g.day,phase:g.phase,name,playerId,event,actorId,targetId,text:text.slice(0,400),players:g.players.map(({id,name,role,alive})=>({id,name,role,alive}))});}
export function setPhase(g:Game,phase:Phase,now=Date.now()){g.phase=phase;if(phase==='day')g.discussionTurns=0;g.deadline=phase==='day'?now+120000:phase==='vote'||phase==='night'?now+60000:0;g.turn++;}

export function check(g:Game){const m=alive(g).filter(p=>p.role==='Mafia').length,c=alive(g).length-m;if(m===0||m>=c){setPhase(g,'ended');g.winner=m===0?'The town':'The Mafia';message(g,`${g.winner} wins. All roles are revealed.`);}}

export function start(g:Game,now=Date.now(),talk=true){if(g.phase!=='lobby')throw Error('This game has already started.');if(g.players.length<5||g.players.length>10)throw Error('You need 5–10 players.');if(g.players.filter(p=>p.bot).length>8)throw Error('A table supports up to 8 AI players.');if(g.simulation)validateSimulation(g.players);const roles:Role[]=Array(g.players.length).fill('Citizen');roles[0]='Mafia';roles[1]='Mafia';roles[2]='Doctor';roles[3]='Detective';for(let i=roles.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[roles[i],roles[j]]=[roles[j],roles[i]];}g.players.forEach((p,i)=>{p.role=g.simulation?p.assignedRole!:roles[i];p.alive=true;p.notes=[];p.memory='';});g.aiCalls=0;g.history=[];if(g.simulation)g.replay=[];g.day=1;g.votes={};g.actions={};g.winner=null;setPhase(g,'day',now);message(g,'Day 1 begins. Two Mafia are hiding among you. Discuss your suspicions.');if(talk)botTalk(g);}

export function legalTargets(g:Game,p:Player,night=false){return alive(g).filter(x=>night&&p.role==='Doctor'?true:x.id!==p.id&&(!night||p.role!=='Mafia'||x.role!=='Mafia'));}

export function chooseTarget(g:Game,p:Player,night=false):Player|undefined{

 let options=legalTargets(g,p,night);

 // Mafia know their own allies. Other bots see only public votes and their personal investigation results.

 if(p.role==='Mafia')options=options.filter(x=>x.role!=='Mafia');

 if(night&&p.role==='Doctor'){const claimant=options.find(x=>g.messages.some(m=>m.playerId===x.id&&/i investigated|i am the detective/i.test(m.text)));return claimant||pick(options);}

 const score=(x:Player)=>{let s=Math.random()*18;const result=p.notes.find(n=>n.startsWith(x.id+':'))?.split(':')[1];if(result==='Mafia')s+=1000;if(result==='Town'&&p.role!=='Mafia')s-=1000;

 for(const round of g.history){const dead=g.players.find(q=>q.id===round.eliminated);if(dead?.role==='Mafia'&&round.votes[x.id]===dead.id)s-=35;if(dead&&dead.role!=='Mafia'&&round.votes[x.id]===dead.id)s+=12;}

 const votes=Object.values(g.votes).filter(id=>id===x.id).length;s+=votes*(p.role==='Mafia'?p.deception/4:3);

 if(night&&p.role==='Mafia'&&g.messages.some(m=>m.playerId===x.id&&/investigated|detective/i.test(m.text)))s+=60;return s;};

 return options.map(x=>({x,s:score(x)})).sort((a,b)=>b.s-a.s)[0]?.x;

}

export function botSpeech(g:Game,p:Player){const t=chooseTarget(g,p);if(!t)return;const addressed=g.messages.slice(-6).findLast(m=>m.playerId!==p.id&&m.text.toLowerCase().includes(p.name.split(' ')[0].toLowerCase()));const result=p.notes.find(n=>n.startsWith(t.id+':'));let line:string;

 if(result===`${t.id}:Mafia`)line=`I investigated ${t.name}. My result was Mafia. That is my vote.`;

 else if(addressed){line=p.role==='Mafia'&&p.deception>60?`You're putting pressure on me, but ${t.name} benefits if we waste this vote. Ask them to explain their position.`:`I'll answer that. I haven't cleared ${t.name}; compare their votes before you decide I'm the problem.`;}

 else if(g.day>1){line=`Look at the last vote before trusting ${t.name}. I'm weighing who pushed it and who stayed out of it.`;}

 else line=pick(p.boldness>70?[`${t.name}, who is your strongest suspect? Commit to a name.`,`I'm putting ${t.name} under pressure. A confident answer isn't the same as a good one.`]:p.boldness<40?[`I don't have evidence against ${t.name} yet. I'd like to hear their reasoning.`,`Let's listen to ${t.name} before we settle into an easy consensus.`]:[`Before we accuse ${t.name}, who benefits from that vote?`,`I want to hear ${t.name}'s theory. We need something we can compare later.`]);

 const persona=p.persona.toLowerCase();if(/formal|statesman|18th|washington/.test(persona))line=`My friends, ${line[0].toLowerCase()+line.slice(1)}`;else if(/wit|humor|funny/.test(persona))line+= ' Convenient stories are in generous supply tonight.';

 message(g,line,p.name,p.id);

}

export function botTalk(g:Game,limit=10){const bots=alive(g).filter(p=>p.bot);for(const p of bots.slice(0,limit))botSpeech(g,p);}

export function advance(g:Game,options:{force?:boolean;now?:number;talk?:boolean}={}){const now=options.now??Date.now();const force=!!options.force;

 if(g.phase==='day'){setPhase(g,'vote',now);g.votes={};message(g,'Voting is open. Select a living player. Ties result in no elimination.');return;}

 if(g.phase==='vote'){

  const missing=alive(g).filter(p=>!p.bot&&!g.votes[p.id]);if(missing.length&&!force)throw Error('Every living human player must vote first, or wait for the timer.');

  for(const p of alive(g).filter(p=>p.bot)){if(!g.votes[p.id]){const t=chooseTarget(g,p);if(t)g.votes[p.id]=t.id;}}

  if(g.simulation)for(const [voter,target] of Object.entries(g.votes)){recordReplay(g,`${g.players.find(p=>p.id===voter)?.name} votes for ${g.players.find(p=>p.id===target)?.name}.`,'The moderator',undefined,'vote',voter,target);}

  const counts:Record<string,number>={};Object.values(g.votes).forEach(id=>{if(alive(g).some(p=>p.id===id))counts[id]=(counts[id]||0)+1;});const sorted=Object.entries(counts).sort((a,b)=>b[1]-a[1]);let eliminated:string|null=null;

  if(sorted[0]&&sorted[0][1]!==sorted[1]?.[1]){const p=g.players.find(p=>p.id===sorted[0][0])!;p.alive=false;eliminated=p.id;message(g,`${p.name} was voted out. They were ${p.role}.`);}else message(g,'The vote is tied. Nobody is eliminated.');

  g.history.push({day:g.day,votes:{...g.votes},eliminated});g.history=g.history.slice(-20);if(missing.length)message(g,`${missing.length} missing vote(s) counted as abstentions.`);check(g);if(!g.winner){setPhase(g,'night',now);g.actions={};message(g,'Night falls. Mafia, Doctor, and Detective: choose your action.');}return;

 }

 if(g.phase==='night'){

  const missing=alive(g).filter(p=>!p.bot&&p.role!=='Citizen'&&!g.actions[p.id]);if(missing.length&&!force)throw Error('Waiting for all human night actions, or the timer.');

  for(const p of alive(g).filter(p=>p.bot&&p.role!=='Citizen'))if(!g.actions[p.id]){const t=chooseTarget(g,p,true);if(t)g.actions[p.id]=t.id;}

  const attackers=alive(g).filter(p=>p.role==='Mafia').map(p=>g.actions[p.id]).filter(Boolean);const victim=attackers.length?pick(attackers):null;

  if(g.simulation)for(const p of alive(g).filter(p=>p.role!=='Citizen')){const t=g.players.find(x=>x.id===g.actions[p.id]);if(t)recordReplay(g,`${p.name} ${p.role==='Mafia'?'targets':p.role==='Doctor'?'protects':'investigates'} ${t.name}.`,'The moderator',undefined,p.role==='Mafia'?'attack':p.role==='Doctor'?'protect':'investigate',p.id,t.id);}
  const saved=alive(g).filter(p=>p.role==='Doctor').some(p=>g.actions[p.id]===victim);

  for(const p of alive(g).filter(p=>p.role==='Detective')){const t=g.players.find(x=>x.id===g.actions[p.id]);if(t&&!p.notes.some(n=>n.startsWith(t.id+':')))p.notes.push(`${t.id}:${t.role==='Mafia'?'Mafia':'Town'}`);}

  if(victim&&!saved){const p=g.players.find(p=>p.id===victim)!;p.alive=false;message(g,`${p.name} did not survive the night. They were ${p.role}.`);}else message(g,'Everyone survived the night.');check(g);

  if(g.simulation&&!g.winner&&g.day>=20){setPhase(g,'ended');g.winner='Draw';message(g,'Twenty nights have passed. The simulation ends in a draw.');}if(!g.winner){g.day++;g.votes={};g.actions={};setPhase(g,'day',now);message(g,`Day ${g.day} begins.`);if(options.talk!==false)botTalk(g);}return;

 }

 throw Error('There is no phase to advance.');

}

export function rematch(g:Game){if(g.phase!=='ended')throw Error('Finish the match first.');setPhase(g,'lobby');g.day=0;g.winner=null;g.messages=[];g.votes={};g.actions={};g.history=[];g.aiCalls=0;g.lastChat={};if(g.simulation)g.replay=[];g.players.forEach(p=>{p.alive=true;p.role='Citizen';p.notes=[];p.memory='';});}

export function view(g:Game,id:string){const me=g.players.find(p=>p.id===id);const director=!!g.simulation&&g.host===id;if(!me&&!director)throw Error('Join this room first.');return{...(director?{simulation:true,replay:g.replay||[]}:{}),code:g.code,host:g.host,phase:g.phase,day:g.day,winner:g.winner,revision:g.revision,deadline:g.deadline,aiMode:g.aiMode,messages:g.messages,votes:g.votes,history:g.history,me:id,myAction:g.actions[id]??null,players:g.players.map(p=>({id:p.id,name:p.name,bot:p.bot,alive:p.alive,appearance:p.appearance,voice:p.voice,persona:p.persona,boldness:p.boldness,deception:p.deception,absent:!!p.absent,...(director?{assignedRole:p.assignedRole}:{}),role:director||g.phase==='ended'||p.id===id||!p.alive||(me?.role==='Mafia'&&p.role==='Mafia')?p.role:undefined,notes:p.id===id?p.notes:undefined}))};}



export function validateSimulation(players:Player[]){

 if(players.length<5||players.length>8||players.some(p=>!p.bot))throw Error('Cast 5–8 AI characters.');

 if(players.some(p=>!p.name.trim()||p.name.trim().toLowerCase()==='the moderator'))throw Error('Give each character a name other than The moderator.');
 if(new Set(players.map(p=>p.name.trim().toLowerCase())).size!==players.length)throw Error('Give every character a unique name.');

 const counts=(role:Role)=>players.filter(p=>p.assignedRole===role).length;

 if(counts('Mafia')!==2||counts('Doctor')!==1||counts('Detective')!==1||counts('Citizen')!==players.length-4)throw Error('Assign 2 Mafia, 1 Doctor, 1 Detective, and Citizens to the remaining characters.');

}

export function createSimulation(code:string,owner:string){

 const g=create(code,owner,'Director');g.simulation=true;g.replay=[];

 g.players=cast.slice(0,6).map((c,i)=>player('cast-'+i,c.name,true,{...c,voice:['sage','ash','echo','coral','onyx','nova','fable','alloy'][i],assignedRole:i<2?'Mafia':i===2?'Doctor':i===3?'Detective':'Citizen'}));return g;

}

