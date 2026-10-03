// Native bundles supply this value at build time. The web site uses its own origin.
const base = process.env.NEXT_PUBLIC_GAME_API_URL || '';
export const gameOrigin=()=>base||(typeof location!=='undefined'?location.origin:'');
const isNative=()=>typeof window!=='undefined'&&!!(window as any).Capacitor?.isNativePlatform?.();
export async function gameRequest(action?:string,payload:Record<string,unknown>={}){
 if(isNative()&&!base)throw Error('Online play is not configured in this app build. Offline practice is available.');
 const token=isNative()?localStorage.getItem('alibi-device-session'):null;
 const path=action?'/api/game':payload.config?'/api/game?config=1':'/api/game?code='+encodeURIComponent(String(payload.code));
 const response=await fetch(base+path,{method:action?'POST':'GET',credentials:base?'omit':'same-origin',headers:{...(action?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(action?{body:JSON.stringify({action,...payload})}:{}),signal:AbortSignal.timeout(28000)});
 const data:any=await response.json();if(!response.ok)throw Object.assign(Error(data.error||'Unable to reach the table.'),{retry:data.retry,status:response.status});
 if(data.sessionToken&&isNative()){localStorage.setItem('alibi-device-session',data.sessionToken);delete data.sessionToken;}return data;
}
export const publicFigurePresets=[
 {name:'Trump (parody)',persona:'Fictional parody of Donald Trump: boastful showman, short emphatic sentences, superlatives, relentless confidence and playful nicknames. Discuss only this Mafia game, not real politics.',boldness:95,deception:90},
 {name:'Biden (parody)',persona:'Fictional parody of Joe Biden: folksy, personable, anecdotal and direct. Build trust through friendly appeals and an occasional pointed challenge. Discuss only this Mafia game.',boldness:60,deception:65},
 {name:'Sanders (parody)',persona:'Fictional parody of Bernie Sanders: passionate, insistent, concerned about the whole town, skeptical of powerful coalitions. Bring every argument back to who benefits in this Mafia game.',boldness:85,deception:55},
 {name:'Washington (parody)',persona:'Fictional parody of George Washington: formal 18th-century statesman, restrained, honorable-sounding and commanding. Appeal to duty, unity and evidence within this Mafia game.',boldness:45,deception:85}
];

export async function simulationMedia(code:string,kind:'image'|'voice',target:string|number,signal?:AbortSignal){
 const token=isNative()?localStorage.getItem('alibi-device-session'):null;
 const response=await fetch(base+'/api/simulation-media',{method:'POST',credentials:base?'omit':'same-origin',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify({code,kind,...(kind==='image'?{target}:{scene:target})}),signal:signal||AbortSignal.timeout(180000)});
 const data=await response.json() as {error?:string;data:string};if(!response.ok)throw Error(data.error||'Media generation failed.');return data.data as string;
}
