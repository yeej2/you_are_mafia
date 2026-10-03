import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSimulation,player,start,advance,view,validateSimulation} from '../lib/game.ts';
import {observation} from '../lib/ai.ts';
import {generateCharacter,generateSpeech} from '../lib/media-provider.ts';
test('director assigns exact roles, observes all roles, but bots cannot see the replay or unknown roles',()=>{
 const g=createSimulation('FILM','director');g.players.reverse();start(g);assert.equal(g.players.some(p=>!p.bot),false);
 for(const p of g.players){assert.equal(p.role,p.assignedRole);const obs=observation(g,p);assert.equal('replay' in obs,false);for(const other of obs.players)if(other.id!==p.id&&!(p.role==='Mafia'&&other.role==='Mafia'))assert.equal(other.role,undefined);assert.equal('assignedRole' in obs.you!,false);}
 assert.equal(view(g,'director').players.filter(p=>p.role).length,6);assert.throws(()=>view(g,'intruder'));assert.ok(view(g,'director').replay?.length);
});
test('simulation rejects more than eight AI, duplicate names, humans and invalid role distributions',()=>{
 const g=createSimulation('F','D');g.players.push(player('7','Seven',true,{assignedRole:'Citizen'}),player('8','Eight',true,{assignedRole:'Citizen'}));validateSimulation(g.players);
 assert.throws(()=>validateSimulation([...g.players,player('9','Nine',true,{assignedRole:'Citizen'})]));g.players[0].assignedRole='Doctor';assert.throws(()=>start(g));g.players[0].assignedRole='Mafia';g.players[1].name=g.players[0].name;assert.throws(()=>start(g));g.players[1].name='Unique';g.players[0].bot=false;assert.throws(()=>start(g));
});
test('all-AI matches finish, archive the result and keep earlier snapshots immutable',()=>{
 for(let i=0;i<30;i++){const g=createSimulation('F','D');start(g);const first=structuredClone(g.replay![0]);let turns=0;while(g.phase!=='ended'&&turns++<100)advance(g,{force:true});assert.equal(g.phase,'ended');assert.ok(g.winner);assert.deepEqual(g.replay![0],first);assert.equal(g.replay!.at(-1)!.phase,'ended');assert.ok(g.replay!.some(f=>f.text.includes('votes for')));}
});
test('image generation incorporates persona, appearance and role with a bounded expression atlas',async()=>{
 const p=createSimulation('F','D').players[0];p.appearance='Emerald coat';let body:any;
 const result=await generateCharacter(p,{key:'test'},async(_url,init)=>{body=JSON.parse(String(init?.body));return Response.json({data:[{b64_json:'aW1hZ2U='}]});});
 assert.match(body.prompt,/Emerald coat/);assert.match(body.prompt,/Mafia/);assert.match(body.prompt,/2 by 2/);assert.equal(body.n,1);assert.equal(result.type,'image/jpeg');
 await assert.rejects(generateCharacter(p,{key:'test'},async()=>Response.json({data:[]})),/invalid/);
});
test('speech uses the saved original voice and actual match dialogue',async()=>{
 const g=createSimulation('F','D');start(g);const p=g.players[0];p.voice='sage';let body:any;
 const result=await generateSpeech(g.replay![0],p,{key:'test'},async(_url,init)=>{body=JSON.parse(String(init?.body));return new Response(new Uint8Array([1,2,3]));});assert.equal(body.voice,'sage');assert.equal(body.input,g.replay![0].text);assert.equal(result.type,'audio/mpeg');assert.match(body.instructions,/not an imitation/);
});

test('night actions appear in the director film but never in public messages or bot observations',()=>{
 const g=createSimulation('F','D');start(g);g.phase='night';g.actions={};advance(g,{force:true});const privateFrames=g.replay!.filter(f=>['attack','protect','investigate'].includes(f.event||''));assert.ok(privateFrames.length>=3);for(const f of privateFrames){assert.ok(f.actorId);assert.ok(f.targetId);assert.ok(!g.messages.some(m=>m.text===f.text));}for(const p of g.players){const obs=JSON.stringify(observation(g,p));assert.ok(!obs.includes('"replay"'));}
});
