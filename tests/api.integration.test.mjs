import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=process.cwd(),tmp=path.join(root,'.sites-runtime','api-tests');await fs.mkdir(tmp,{recursive:true});
// Execute the real handlers with an in-memory SQLite-backed D1 adapter. No live service or model calls.
const database=new DatabaseSync(':memory:');for(const file of (await fs.readdir('drizzle')).filter(f=>f.endsWith('.sql')).sort())database.exec(await fs.readFile('drizzle/'+file,'utf8'));
function prepared(sql){return {args:[],bind(...args){this.args=args;return this;},async first(){return database.prepare(sql).get(...this.args)||null;},async all(){return{results:database.prepare(sql).all(...this.args)};},async run(){const r=database.prepare(sql).run(...this.args);return{meta:{changes:Number(r.changes)}};}};}const DB={prepare:prepared,async batch(statements){database.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());database.exec('COMMIT');return results;}catch(e){database.exec('ROLLBACK');throw e;}}};
const symbol='__alibiTestDB';globalThis[symbol]=DB;
let source=await fs.readFile('app/api/game/route.ts','utf8');source=source.replace("import {env} from 'cloudflare:workers';",'const env={};').replace("import {db} from '@/lib/db';",`const db=()=>globalThis.${symbol};`).replaceAll(/from '@\/lib\/([^']+)'/g,(_,name)=>`from '${pathToFileURL(path.join(root,'lib',name+'.ts')).href}'`);
await fs.writeFile(path.join(tmp,'route.mjs'),ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);const route=await import(pathToFileURL(path.join(tmp,'route.mjs')).href);
const host={token:crypto.randomUUID()},guest={token:crypto.randomUUID()};let code;
async function post(who,action,extra={}){return route.POST(new Request('https://game.test/api/game',{method:'POST',headers:{Origin:'https://game.test','Content-Type':'application/json',Cookie:'alibi='+who.token},body:JSON.stringify({action,code,...extra})}));}
async function read(who){const r=await route.GET(new Request('https://game.test/api/game?code='+code,{headers:{Cookie:'alibi='+who.token}}));assert.equal(r.status,200);return r.json();}
test('two separate sessions create, join, enforce host authorization and keep roles private',async()=>{
 let r=await post(host,'create',{name:'Host'});assert.equal(r.status,200);let g=await r.json();code=g.code;assert.notEqual(g.me,host.token);
 r=await post(guest,'join',{name:'Friend'});assert.equal(r.status,200);const v=await r.json();assert.notEqual(v.me,g.me);
 assert.equal((await post(guest,'addbot')).status,400);
 for(let i=0;i<5;i++)assert.equal((await post(host,'addbot')).status,200);
 r=await post(host,'start');assert.equal(r.status,200);g=await r.json();const other=await read(guest);assert.equal(other.phase,'day');assert.equal(g.players.length,7);
 for(const p of other.players)if(p.id!==other.me&&!(other.players.find(p=>p.id===other.me).role==='Mafia'&&p.role==='Mafia'))assert.equal(p.role,undefined);
 assert.ok(!JSON.stringify(other).includes('memory'));assert.equal(other.actions,undefined);
 assert.equal((await post(guest,'advance')).status,400);
 r=await post(guest,'chat',{text:'I suspect the quiet players.'});assert.equal(r.status,200);assert.ok((await r.json()).messages.some(m=>m.text==='I suspect the quiet players.'));
 assert.equal((await post(guest,'chat',{text:'spam'})).status,400);
 assert.equal((await post(host,'advance')).status,200);assert.equal((await post(host,'advance')).status,400);
 g=await read(host);await post(host,'vote',{target:g.players.find(p=>p.id!==g.me).id});await post(guest,'vote',{target:g.me});
 assert.equal((await post(host,'advance')).status,200);g=await read(host);assert.ok(['night','ended'].includes(g.phase));
 if(g.phase==='night'){const self=g.players.find(p=>p.id===g.me);if(self.alive&&self.role!=='Citizen'){const target=g.players.find(p=>p.alive&&p.id!==self.id&&(self.role!=='Mafia'||p.role!=='Mafia'));assert.equal((await post(host,'night',{target:target.id})).status,200);assert.equal((await read(guest)).myAction,null);}}
});
test('forged public player id cannot authenticate',async()=>{const g=await read(host);const r=await route.GET(new Request('https://game.test/api/game?code='+code,{headers:{Cookie:'alibi='+g.me}}));assert.equal(r.status,401);});
test('timer advances without human votes; host recovers',async()=>{const state=JSON.parse(database.prepare('SELECT state FROM rooms WHERE code=?').get(code).state);state.phase='vote';state.deadline=Date.now()-10;state.votes={};state.players.forEach(p=>p.alive=true);database.prepare('UPDATE rooms SET state=? WHERE code=?').run(JSON.stringify(state),code);database.prepare('UPDATE presence SET seen=0 WHERE id=?').run(code+':'+state.host);const r=await post(guest,'pulse');assert.equal(r.status,200);const g=await r.json();assert.equal(g.host,g.me);assert.notEqual(g.phase,'vote');});
test('room lock rejects concurrent mutation instead of overwriting',async()=>{database.prepare('UPDATE rooms SET locked_until=? WHERE code=?').run(Date.now()+20000,code);const r=await post(guest,'pulse');assert.equal(r.status,409);database.prepare('UPDATE rooms SET locked_until=0 WHERE code=?').run(code);});
test('native origin receives bearer session and CORS; foreign origin rejected',async()=>{const r=await route.POST(new Request('https://game.test/api/game',{method:'POST',headers:{Origin:'capacitor://localhost','Content-Type':'application/json'},body:JSON.stringify({action:'create',name:'Native'})}));assert.equal(r.status,200);const g=await r.json();assert.match(g.sessionToken,/^[a-f0-9-]{36}$/);assert.equal(r.headers.get('access-control-allow-origin'),'capacitor://localhost');const read=await route.GET(new Request('https://game.test/api/game?code='+g.code,{headers:{Authorization:'Bearer '+g.sessionToken,Origin:'capacitor://localhost'}}));assert.equal(read.status,200);const bad=await route.POST(new Request('https://game.test/api/game',{method:'POST',headers:{Origin:'https://evil.test'},body:'{}'}));assert.equal(bad.status,403);});

test('director runs a private eight-AI simulation, assigns roles and cannot play or leak the replay',async()=>{
 const director={token:crypto.randomUUID()};let g=await (await post(director,'create',{simulation:true,name:'Director'})).json();const simCode=g.code;
 for(let i=0;i<2;i++){const r=await post(director,'addbot',{code:simCode});assert.equal(r.status,200);g=await r.json();}
 assert.equal(g.players.length,8);assert.equal(g.players.some(p=>!p.bot),false);assert.equal((await post(director,'addbot',{code:simCode})).status,400);
 assert.equal((await post(guest,'join',{code:simCode})).status,400);assert.equal((await post(guest,'advance',{code:simCode})).status,400);
 const badRead=await route.GET(new Request('https://game.test/api/game?code='+simCode,{headers:{Cookie:'alibi='+guest.token}}));assert.notEqual(badRead.status,200);
 const first=g.players[0];assert.equal((await post(director,'editbot',{code:simCode,target:first.id,name:'Custom Persona',persona:'A skeptical inventor',appearance:'Copper goggles',assignedRole:'Mafia',voice:'sage'})).status,200);
 g=await (await post(director,'start',{code:simCode})).json();assert.equal(g.phase,'day');assert.equal(g.players[0].name,'Custom Persona');assert.equal(g.players[0].role,'Mafia');assert.equal(g.players[0].voice,'sage');assert.ok(g.replay.length);
 assert.equal((await post(director,'vote',{code:simCode,target:g.players[1].id})).status,400);
 const before=g.replay.length;g=await (await post(director,'advance',{code:simCode})).json();assert.equal(g.phase,'day');assert.ok(g.replay.length>before,'discussion advances one speaker at a time');
 let turns=0;while(g.phase!=='ended'&&turns++<400){const r=await post(director,'advance',{code:simCode});assert.equal(r.status,200);g=await r.json();}assert.equal(g.phase,'ended');assert.equal(g.host,g.me);assert.equal(g.replay.at(-1).phase,'ended');assert.ok(g.players.every(p=>p.role));
});

test('media routes enforce ownership, cache paid calls, retry failures, and cap image attempts',async()=>{
 let mediaSource=await fs.readFile('app/api/simulation-media/route.ts','utf8');mediaSource=mediaSource.replace("import {env} from 'cloudflare:workers';",'const env={OPENAI_API_KEY:"test"};').replace("import {db} from '@/lib/db';",`const db=()=>globalThis.${symbol};`).replaceAll(/from '@\/lib\/([^']+)'/g,(_,name)=>`from '${pathToFileURL(path.join(root,'lib',name+'.ts')).href}'`);
 await fs.writeFile(path.join(tmp,'media.mjs'),ts.transpileModule(mediaSource,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText);const media=await import(pathToFileURL(path.join(tmp,'media.mjs')).href);
 const director={token:crypto.randomUUID()};const g=await (await post(director,'create',{simulation:true})).json();const request=(token,target=g.players[0].id)=>media.POST(new Request('https://game.test/api/simulation-media',{method:'POST',headers:{Origin:'https://game.test',Cookie:'alibi='+token},body:JSON.stringify({code:g.code,kind:'image',target})}));
 assert.equal((await request(guest.token)).status,403);let calls=0;const original=globalThis.fetch;globalThis.fetch=async()=>{calls++;return Response.json({data:[{b64_json:'aW1hZ2U='}]});};
 try{let r=await request(director.token);assert.equal(r.status,200);assert.match((await r.json()).data,/^data:image\/jpeg;base64,/);assert.equal((await request(director.token)).status,200);assert.equal(calls,1);
  globalThis.fetch=async()=>{calls++;return new Response('failure',{status:500});};assert.equal((await request(director.token,g.players[1].id)).status,400);
  globalThis.fetch=async()=>{calls++;return Response.json({data:[{b64_json:'aW1hZ2U='}]});};assert.equal((await request(director.token,g.players[1].id)).status,200);assert.equal(calls,3);
  database.prepare('UPDATE simulation_media SET attempts=16 WHERE room=?').run(g.code);assert.equal((await request(director.token,g.players[2].id)).status,409);assert.equal(calls,3);
 }finally{globalThis.fetch=original;}
});
