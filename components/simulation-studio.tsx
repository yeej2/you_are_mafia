'use client';

import {useEffect,useMemo,useRef,useState} from 'react';

import {createSimulation,player,cast,start,advance,validateSimulation,type Game,type Player,type ReplayFrame,type Role} from '@/lib/game';

import {gameRequest,simulationMedia} from '@/lib/client';

import {drawReplay,loadPortraits,type FilmOptions} from '@/lib/film-renderer';

import {exportReplay,frameSeconds,videoMime} from '@/lib/replay-video';

import {portraitKey,readAsset,saveAsset} from '@/lib/studio-storage';



import {importFace,type FaceCrop} from '@/lib/face-photo';

type StudioPlayer=Player & {faceAsset?:string;faceCrop?:FaceCrop};
type Persona=Pick<Player,'name'|'persona'|'appearance'|'voice'|'boldness'|'deception'> & {id:string;faceAsset?:string;faceCrop?:FaceCrop};

type Match=Pick<Game,'code'|'phase'|'day'|'winner'|'players'|'replay'|'aiMode'>;

const roles:Role[]=['Mafia','Doctor','Detective','Citizen'];

const voices=['alloy','ash','coral','echo','fable','nova','onyx','sage'];

const defaults=()=>createSimulation('STUDIO','director').players;

const textError=(e:unknown)=>e instanceof Error?e.message:'Something went wrong.';

function download(blob:Blob,filename:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}



export function SimulationStudio({onClose,aiAvailable}:{onClose:()=>void;aiAvailable:boolean}){

 const [draft,setDraft]=useState<StudioPlayer[]>(defaults),[library,setLibrary]=useState<Persona[]>([]),[match,setMatch]=useState<Match|null>(null),[connected,setConnected]=useState(aiAvailable),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');

 const [autoArt,setAutoArt]=useState(true),[autoVoice,setAutoVoice]=useState(true),[sources,setSources]=useState<Record<string,string>>({}),[portraits,setPortraits]=useState<Record<string,HTMLImageElement>>({}),[speech,setSpeech]=useState<Record<number,string>>({});

 const [photoSources,setPhotoSources]=useState<Record<string,string>>({}),[photos,setPhotos]=useState<Record<string,HTMLImageElement>>({});

 const [scene,setScene]=useState(0),[playing,setPlaying]=useState(false),[theme,setTheme]=useState<'noir'|'village'>('noir'),[pace,setPace]=useState(1.5),[camera,setCamera]=useState(true),[showRoles,setShowRoles]=useState(true),[progress,setProgress]=useState<number|null>(null),[video,setVideo]=useState<{url:string;extension:string}|null>(null);

 const local=useRef<Game|null>(null),remote=useRef<string|null>(null),cancel=useRef<AbortController|null>(null),canvas=useRef<HTMLCanvasElement|null>(null),voiceAudio=useRef<HTMLAudioElement|null>(null),locked=useRef(false),mounted=useRef(true);

 const frames=match?.replay||[];const frame=frames[scene];const active=!!match&&match.phase!=='lobby';

 const film=useMemo<FilmOptions>(()=>({portraits,photos,photoCrops:Object.fromEntries(draft.flatMap((p,i)=>[[p.id,p.faceCrop],[match?.players[i]?.id||p.id,p.faceCrop]])),theme,pace,camera,showRoles}),[portraits,photos,draft,match?.code,theme,pace,camera,showRoles]);

 const preview:ReplayFrame=frame||{day:0,phase:'lobby',name:'The director',text:'Cast your characters. Give them a personality, an appearance, and a secret role. Then let the story unfold.',players:draft.map(p=>({id:p.id,name:p.name,role:p.assignedRole||'Citizen',alive:true}))};

 function persist(next:Match){setMatch(next);try{sessionStorage.setItem('alibi-studio-match',JSON.stringify({match:next,local:local.current,remote:remote.current,draft}));}catch{setNotice('This match is too large to restore automatically. Download the transcript before leaving.');}}

 useEffect(()=>{mounted.current=true;try{const saved=localStorage.getItem('alibi-personas');if(saved)setLibrary(JSON.parse(saved));const state=sessionStorage.getItem('alibi-studio-match');if(state){const saved=JSON.parse(state);setDraft(saved.draft);setMatch(saved.match);local.current=saved.local;remote.current=saved.remote;setConnected(!!saved.remote);}}catch{setNotice('Saved studio data could not be restored.');}return()=>{mounted.current=false;cancel.current?.abort();voiceAudio.current?.pause();};},[]);

 useEffect(()=>{let stale=false;void loadPortraits(sources).then(p=>{if(!stale)setPortraits(p);});return()=>{stale=true;};},[sources]);

 useEffect(()=>{let stale=false;void (async()=>{const assets:Record<string,string>={},faces:Record<string,string>={};for(const p of draft){try{if(p.faceAsset){const photo=await readAsset(p.faceAsset);if(photo)faces[p.id]=photo;}const saved=await readAsset(portraitKey(p));if(saved)assets[p.id]=saved;else if(p.name===cast[0].name&&p.persona===cast[0].persona&&!p.appearance)assets[p.id]='/studio/vivian-creature-expressions.png';}catch{/* Artwork is optional when storage is blocked. */}const remoteId=match?.players[draft.indexOf(p)]?.id;if(remoteId&&assets[p.id])assets[remoteId]=assets[p.id];if(remoteId&&faces[p.id])faces[remoteId]=faces[p.id];}if(!stale){setSources(assets);setPhotoSources(faces);setPhotos(await loadPortraits(faces));}})();return()=>{stale=true;};},[draft,match?.code]);

 useEffect(()=>{if(!frame||!playing){voiceAudio.current?.pause();return;}const src=speech[scene];if(src){const audio=new Audio(src);voiceAudio.current=audio;audio.playbackRate=pace;void audio.play().catch(()=>setNotice('Voice playback was blocked. Press Play again to enable it.'));return()=>audio.pause();}},[scene,playing,speech,pace,frame]);

 useEffect(()=>{let raf=0;const start=performance.now();const render=()=>{if(!canvas.current)return;const elapsed=playing?(performance.now()-start)/1000*pace:2;drawReplay(canvas.current,preview,scene,Math.max(1,frames.length),elapsed,{...film,previousFrame:frames[scene-1]});const duration=Math.max(frameSeconds(preview),voiceAudio.current&&Number.isFinite(voiceAudio.current.duration)?voiceAudio.current.duration:0);if(playing&&elapsed>=duration){if(scene<frames.length-1)setScene(i=>i+1);else setPlaying(false);return;}if(playing)raf=requestAnimationFrame(render);};render();return()=>cancelAnimationFrame(raf);},[frame,scene,playing,film,draft,frames.length]);

 useEffect(()=>{let stale=false;if(match?.phase==='ended'&&remote.current)void (async()=>{const clips:Record<number,string>={};for(let i=0;i<(match.replay||[]).length;i++){try{const saved=await readAsset(`voice:${match.code}:${i}:${match.replay![i].text}`);if(saved)clips[i]=saved;}catch{}}if(!stale)setSpeech(old=>({...clips,...old}));})();return()=>{stale=true;};},[match?.code,match?.phase]);

 useEffect(()=>()=>{if(video)URL.revokeObjectURL(video.url);},[video]);

 function edit(id:string,patch:Partial<StudioPlayer>){setDraft(ps=>ps.map(p=>p.id===id?{...p,...patch}:p));setError('');}

 function savePersona(p:StudioPlayer){const next=[...library.filter(x=>x.name!==p.name),{id:crypto.randomUUID(),name:p.name,persona:p.persona,appearance:p.appearance,voice:p.voice,boldness:p.boldness,deception:p.deception,faceAsset:p.faceAsset,faceCrop:p.faceCrop}].slice(-40);try{localStorage.setItem('alibi-personas',JSON.stringify(next));setLibrary(next);setNotice(`${p.name} saved to your persona library on this device.`);}catch{setError('Your browser could not save this persona.');}}

 async function uploadFace(id:string,file:File){await operation(async()=>{const data=await importFace(file);const key='face:'+crypto.randomUUID();await saveAsset(key,data);edit(id,{faceAsset:key,faceCrop:{x:50,y:50,zoom:1}});setNotice('Face photo saved on this device. It appears in previews and exported videos.');});}

 async function syncCast(){validateSimulation(draft);let g:Match;if(remote.current){g=await gameRequest(undefined,{code:remote.current});if(g.phase!=='lobby')return g;}else{g=await gameRequest('create',{simulation:true,name:'Director'});remote.current=g.code;}

  while(g.players.length>draft.length)g=await gameRequest('removebot',{code:g.code,target:g.players.at(-1)!.id});while(g.players.length<draft.length)g=await gameRequest('addbot',{code:g.code});

  // Temporary unique names allow swapping two existing names without duplicate-name rejection.

  for(let i=0;i<draft.length;i++)g=await gameRequest('editbot',{code:g.code,target:g.players[i].id,name:`Cast ${i+1} ${g.code}`});

  for(let i=0;i<draft.length;i++){const p=draft[i];g=await gameRequest('editbot',{code:g.code,target:g.players[i].id,name:p.name,persona:p.persona,appearance:p.appearance,voice:p.voice,boldness:p.boldness,deception:p.deception,assignedRole:p.assignedRole});}

  return g;

 }

 async function art(g:Match,signal:AbortSignal){const next={...sources};for(let i=0;i<draft.length;i++){if(signal.aborted)return;const p=draft[i],key=portraitKey(p);if(p.faceAsset)continue;setStatus(`Creating expression sheet ${i+1} of ${draft.length}: ${p.name}`);const cached=await readAsset(key);const src=cached||await simulationMedia(g.code,'image',g.players[i].id,signal);if(!cached)await saveAsset(key,src);next[p.id]=src;next[g.players[i].id]=src;setSources({...next});}}

 async function narrate(g:Match,signal:AbortSignal){const next:Record<number,string>={...speech};const replay=g.replay||[];for(let i=0;i<replay.length;i++){if(signal.aborted)return;setStatus(`Creating AI voice ${i+1} of ${replay.length}`);const key=`voice:${g.code}:${i}:${replay[i].text}`;const cached=await readAsset(key);next[i]=cached||await simulationMedia(g.code,'voice',i,signal);if(!cached)await saveAsset(key,next[i]);setSpeech({...next});}}

 async function operation(work:(signal:AbortSignal)=>Promise<void>){if(locked.current)return;locked.current=true;setBusy(true);setPlaying(false);setError('');const controller=new AbortController();cancel.current=controller;try{await work(controller.signal);}catch(e){if(!controller.signal.aborted)setError(textError(e));}finally{locked.current=false;if(mounted.current){setBusy(false);setStatus(controller.signal.aborted?'Stopped. Your completed work is saved.':'');}}}

 async function run(){await operation(async signal=>{let g:Match;if(connected){setStatus('Preparing the cast…');g=await syncCast();persist(g);if(autoArt&&g.phase==='lobby')await art(g,signal);}else{validateSimulation(draft);if(!local.current){local.current=createSimulation('STUDIO','director');local.current.players=structuredClone(draft);}g=local.current;}if(signal.aborted)return;

   if(g.phase==='lobby'){setSpeech({});setScene(0);setVideo(null);if(connected)g=await gameRequest('start',{code:g.code});else{start(local.current!);g=structuredClone(local.current!);}persist(g);}

   while(g.phase!=='ended'&&!signal.aborted){setStatus(`Simulating day ${g.day}: ${g.phase}…`);if(connected)g=await gameRequest('advance',{code:g.code});else{advance(local.current!,{force:true});g=structuredClone(local.current!);await new Promise(r=>setTimeout(r,90));}persist(g);}

   if(g.phase==='ended'&&!signal.aborted){if(connected&&autoVoice)await narrate(g,signal);setScene(0);setNotice(`${g.winner==='Draw'?'Draw':g.winner+' wins'}. Your episode is ready to preview and export.`);}

  });}

 async function makeArt(){await operation(async signal=>{setStatus('Preparing the cast…');const g=await syncCast();persist(g);await art(g,signal);});}

 async function exportVideo(){await operation(async signal=>{setProgress(0);setStatus('Recording the animated episode. Keep this tab visible.');try{const result=await exportReplay(frames,film,speech,setProgress,signal);setVideo({url:URL.createObjectURL(result.blob),extension:result.extension});}finally{setProgress(null);}});}

 function newEpisode(){setPlaying(false);setMatch(null);local.current=null;remote.current=null;setSpeech({});setScene(0);setVideo(null);sessionStorage.removeItem('alibi-studio-match');setNotice('Your cast and saved personas are ready for another episode.');}

 const duration=Math.ceil(frames.reduce((n,f)=>n+frameSeconds(f),0)/pace/60);

 return <div className="app studio"><header className="topbar"><button className="brand" disabled={busy} onClick={onClose}>MIDNIGHT ALIBI</button><span className="eyebrow">SIMULATION STUDIO</span><button className="help" disabled={busy} onClick={onClose}>Back to game</button></header><main className="studio-main">

  <div className="studio-heading"><div><div className="eyebrow">YOUR CAST. THEIR ALIBIS.</div><h1>Direct a beautiful lie.</h1><p>Create 5–8 AI characters, assign their secrets, and turn the match into an animated episode.</p></div><div className="studio-badge">{draft.length} / 8 AI · You direct</div></div>

  {error&&<div className="error" role="alert">{error}</div>}{notice&&<div className="notice" role="status">{notice}</div>}

  <div className="studio-layout"><section className="studio-cast"><div className="section-title"><h2>01 / Cast & personas</h2><span>2 Mafia · 1 Doctor · 1 Detective</span></div><p className="supporting">Personality controls how they reason and bluff. Appearance controls generated art. Voices are original synthetic performances.</p>

   <fieldset disabled={busy||active}><div className="studio-cards">{draft.map((p,i)=><article className="studio-card" key={p.id}><div className="studio-card-title"><span className="studio-number">{String(i+1).padStart(2,'0')}</span><input aria-label={`Character ${i+1} name`} value={p.name} maxLength={24} onChange={e=>edit(p.id,{name:e.target.value})}/><button className="help" aria-label={`Remove ${p.name}`} disabled={draft.length<=5} onClick={()=>setDraft(ps=>ps.filter(x=>x.id!==p.id))}>×</button></div>

    <div className="studio-pair"><label>Role<select value={p.assignedRole} onChange={e=>edit(p.id,{assignedRole:e.target.value as Role})}>{roles.map(r=><option key={r}>{r}</option>)}</select></label><label>Voice<select value={p.voice||'alloy'} onChange={e=>edit(p.id,{voice:e.target.value})}>{voices.map(v=><option key={v}>{v}</option>)}</select></label></div>

    <label>Personality<textarea value={p.persona} maxLength={500} onChange={e=>edit(p.id,{persona:e.target.value})} placeholder="A charming liar who deflects suspicion with dry humor…"/></label><label>Appearance<input value={p.appearance||''} maxLength={300} onChange={e=>edit(p.id,{appearance:e.target.value})} placeholder="Velvet moth ears, emerald cape, tiny gold antlers…"/></label>

    <div className="studio-photo"><label>Face photo<input aria-label={`Face photo for ${p.name}`} type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{const file=e.target.files?.[0];if(file)void uploadFace(p.id,file);e.target.value='';}}/></label><small>JPEG, PNG or WebP · up to 8 MB · stored on this device</small>{p.faceAsset&&<><div className="studio-photo-preview">{photoSources[p.id]&&<img src={photoSources[p.id]} alt={`${p.name} uploaded face`} style={{objectPosition:`${p.faceCrop?.x??50}% ${p.faceCrop?.y??50}%`}}/>}<button className="text-button" onClick={()=>edit(p.id,{faceAsset:undefined,faceCrop:undefined})}>Remove photo</button></div>{(['zoom','x','y'] as const).map(axis=><label key={axis}>{axis==='zoom'?'Face zoom':axis==='x'?'Horizontal crop':'Vertical crop'}<input type="range" min={axis==='zoom'?1:0} max={axis==='zoom'?3:100} step={axis==='zoom'?.05:1} value={p.faceCrop?.[axis]??(axis==='zoom'?1:50)} onChange={e=>edit(p.id,{faceCrop:{x:50,y:50,zoom:1,...p.faceCrop,[axis]:Number(e.target.value)}})}/></label>)}</>}</div>
    <div className="studio-pair"><label>Boldness {p.boldness}<input type="range" min="0" max="100" value={p.boldness} onChange={e=>edit(p.id,{boldness:Number(e.target.value)})}/></label><label>Bluffing {p.deception}<input type="range" min="0" max="100" value={p.deception} onChange={e=>edit(p.id,{deception:Number(e.target.value)})}/></label></div>

    <div className="studio-pair"><button className="secondary" onClick={()=>savePersona(p)}>Save persona</button><select aria-label={`Load persona for character ${i+1}`} value="" onChange={e=>{const saved=library.find(x=>x.id===e.target.value);if(saved){const {id:_,...rest}=saved;edit(p.id,{...rest,faceAsset:saved.faceAsset,faceCrop:saved.faceCrop});}}}><option value="">Load saved persona</option>{library.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></div>

   </article>)}</div><button className="add-player" disabled={draft.length>=8} onClick={()=>{const c=cast.find(c=>!draft.some(p=>p.name===c.name))||{...cast[0],name:`Character ${draft.length+1}`};setDraft(ps=>[...ps,player(crypto.randomUUID(),c.name,true,{...c,assignedRole:'Citizen'})]);}}>+ Add AI character</button></fieldset>

  </section><section className="studio-production"><h2>02 / Produce the episode</h2><fieldset disabled={busy||active}><label>Simulation engine<select value={connected?'connected':'offline'} onChange={e=>{setConnected(e.target.value==='connected');remote.current=null;local.current=null;setMatch(null);}}><option value="offline">Offline strategy bots</option><option value="connected" disabled={!aiAvailable}>Connected conversational AI{!aiAvailable?' — server required':''}</option></select></label><label className="studio-check"><input type="checkbox" checked={autoArt} disabled={!connected} onChange={e=>setAutoArt(e.target.checked)}/> Automatically generate persona expression sheets</label><label className="studio-check"><input type="checkbox" checked={autoVoice} disabled={!connected} onChange={e=>setAutoVoice(e.target.checked)}/> Automatically generate character dialogue audio</label></fieldset>

   <p className="supporting">{connected?'Art and voices use the server’s AI provider. Assets are reused when unchanged. Limits per simulation: 16 image attempts and 200 voice clips.':'Offline mode includes animated actors, captions, and a music soundtrack. Custom AI art, free-form dialogue, and character voices need a configured server.'}</p>

   <div className="studio-actions">{match?.phase!=='ended'&&<button className="primary" disabled={busy} onClick={()=>void run()}>{active?'Resume simulation':'Produce episode'}</button>}<button className="secondary" disabled={busy||!connected||active} onClick={()=>void makeArt()}>Generate cast art</button>{match?.phase==='ended'&&connected&&<button className="secondary" disabled={busy} onClick={()=>void operation(signal=>narrate(match,signal))}>Generate / resume voices</button>}{match&&<button className="secondary" disabled={busy} onClick={newEpisode}>New episode with this cast</button>}</div>

   {busy&&<div className="studio-progress" role="status"><p>{status}</p>{progress!==null&&<progress value={progress} max={100}/>}<button className="text-button" onClick={()=>cancel.current?.abort()}>Stop after current operation</button></div>}

   <button className="text-button" onClick={()=>void canvas.current?.requestFullscreen().catch(()=>setNotice('Fullscreen is unavailable in this browser.'))}>Expand stage</button><div className="studio-preview"><canvas ref={canvas} width={1280} height={720} aria-label="Animated simulation preview"/><div className="studio-preview-caption" aria-live="polite">{frame?`${frame.name}: ${frame.text}`:'Preview of your cast. Creatures seated around the table. Uploaded faces take priority over generated art.'}</div></div>

   <fieldset disabled={busy}><div className="studio-pair"><label>Set<select value={theme} onChange={e=>setTheme(e.target.value as 'noir'|'village')}><option value="noir">Velvet lounge</option><option value="village">Moonlit grove</option></select></label><label>Pacing<select value={pace} onChange={e=>setPace(Number(e.target.value))}><option value={.75}>Dramatic · 0.75×</option><option value={1}>Natural · 1×</option><option value={1.5}>Brisk · 1.5×</option><option value={2}>Fast · 2×</option></select></label></div><div className="studio-pair"><label className="studio-check"><input type="checkbox" checked={camera} onChange={e=>setCamera(e.target.checked)}/> Orbit camera toward speakers</label><label className="studio-check"><input type="checkbox" checked={showRoles} onChange={e=>setShowRoles(e.target.checked)}/> Show role labels & props</label></div></fieldset>

   {!!frames.length&&<><div className="studio-actions"><button className="secondary" disabled={busy} onClick={()=>{if(scene===frames.length-1)setScene(0);setPlaying(!playing);}}>{playing?'Pause':'Play episode'}</button><span>{scene+1} / {frames.length} scenes · ~{duration} min{Object.keys(speech).length?` · ${Object.keys(speech).length} voiced`:''}</span></div><label>Scene<input type="range" min="0" max={frames.length-1} value={scene} disabled={busy} onChange={e=>{setPlaying(false);setScene(Number(e.target.value));}}/></label><div className="studio-actions"><button className="primary" disabled={busy||match?.phase!=='ended'} onClick={()=>void exportVideo()}>Export animated video</button><button className="secondary" disabled={busy} onClick={()=>download(new Blob([JSON.stringify({title:'Midnight Alibi',cast:draft,frames},null,2)],{type:'application/json'}),'midnight-alibi-transcript.json')}>Download transcript</button></div><p className="supporting">Video records at playback speed in this tab, with animated characters, captions, generated voice clips when available, and music. {typeof window!=='undefined'&&!videoMime()?'This browser does not support video recording.':''}</p></>}

   {video&&<div className="studio-result"><video controls src={video.url}/><a className="primary" href={video.url} download={`midnight-alibi.${video.extension}`}>Download episode .{video.extension}</a></div>}

  </section></div></main></div>;

}

