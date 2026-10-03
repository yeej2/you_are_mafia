import {env} from 'cloudflare:workers';
import {db} from '@/lib/db';
import {headers,identity,sessionToken,validOrigin} from '@/lib/session';
import {generateCharacter,generateSpeech,characterPrompt} from '@/lib/media-provider';
import type {Game} from '@/lib/game';
const answer=(r:Request,data:unknown,status=200)=>Response.json(data,{status,headers:headers(r)});
export function OPTIONS(r:Request){return new Response(null,{status:validOrigin(r)?204:403,headers:headers(r)});}
export async function POST(r:Request){let job:string|undefined;try{
 if(!validOrigin(r))return answer(r,{error:'Invalid origin'},403);
 const secret=sessionToken(r);if(!secret)return answer(r,{error:'Create a connected simulation first.'},401);
 const raw=await r.text();if(raw.length>1500)return answer(r,{error:'Request too large'},413);
 const b=JSON.parse(raw);if(!['image','voice'].includes(b.kind))throw Error('Unknown media type.');
 const row=await db().prepare('SELECT state,updated FROM rooms WHERE code=?').bind(String(b.code)).first<{state:string;updated:number}>();
 if(!row||Date.now()-row.updated>86400000)return answer(r,{error:'Simulation expired.'},404);
 const g=JSON.parse(row.state) as Game;if(!g.simulation||g.host!==await identity(secret))return answer(r,{error:'Only the simulation director can generate its assets.'},403);
 const p=g.players.find(p=>p.id===b.target);const frame=Number.isInteger(b.scene)?g.replay?.[b.scene]:undefined;
 if(b.kind==='image'&&!p||b.kind==='voice'&&!frame)throw Error('Character or scene not found.');
 const settings=env as unknown as Record<string,string>;if(!settings.OPENAI_API_KEY)return answer(r,{error:'Image and voice generation require a server API key.'},503);
 const config={key:settings.OPENAI_API_KEY,imageModel:settings.OPENAI_IMAGE_MODEL,voiceModel:settings.OPENAI_VOICE_MODEL};
 const speaker=frame?g.players.find(p=>p.id===frame.playerId):undefined;
 const fingerprint=b.kind==='image'?characterPrompt(p!)+(config.imageModel||'gpt-image-2'):JSON.stringify([frame!.text,speaker?.voice,speaker?.persona,config.voiceModel]);
 const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(fingerprint));const id=g.code+':'+b.kind+':'+Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
 const cached=await db().prepare('SELECT status,content,mime,updated,attempts FROM simulation_media WHERE id=?').bind(id).first<{status:string;content:string;mime:string;updated:number;attempts:number}>();
 if(cached?.status==='complete')return answer(r,{data:`data:${cached.mime};base64,${cached.content}`});
 if(cached?.status==='pending'&&Date.now()-cached.updated<180000)return answer(r,{error:'This asset is still generating. Retry shortly.'},409);if(cached&&cached.attempts>=3)return answer(r,{error:'This asset failed three times. Use the built-in artwork or export with the available voice clips.'},409);
 // One atomic reservation prevents duplicate paid calls; failures still count toward the budget.
 const budget=b.kind==='image'?16:200;
 const reserved=cached?await db().prepare("UPDATE simulation_media SET status='pending',attempts=attempts+1,updated=? WHERE id=? AND (status='failed' OR updated<?) AND attempts<3 AND (SELECT COALESCE(SUM(attempts),0) FROM simulation_media WHERE room=? AND kind=?) < ?").bind(Date.now(),id,Date.now()-180000,g.code,b.kind,budget).run():await db().prepare("INSERT OR IGNORE INTO simulation_media (id,room,kind,status,updated) SELECT ?,?,?,'pending',? WHERE (SELECT COALESCE(SUM(attempts),0) FROM simulation_media WHERE room=? AND kind=?) < ?").bind(id,g.code,b.kind,Date.now(),g.code,b.kind,budget).run();
 if(reserved.meta.changes!==1)return answer(r,{error:'The media budget is reached or this asset is already generating.'},409);job=id;
 const result=b.kind==='image'?await generateCharacter(p!,config):await generateSpeech(frame!,speaker,config);
 await db().prepare("UPDATE simulation_media SET status='complete',content=?,mime=?,updated=? WHERE id=?").bind(result.base64,result.type,Date.now(),id).run();
 return answer(r,{data:`data:${result.type};base64,${result.base64}`});
 }catch(e){if(job)await db().prepare("UPDATE simulation_media SET status='failed',updated=? WHERE id=?").bind(Date.now(),job).run();return answer(r,{error:e instanceof Error?e.message:'Media generation failed.'},400);}}
