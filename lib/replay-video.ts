import type {ReplayFrame} from './game';

import {drawReplay,type FilmOptions} from './film-renderer';
import {fixWebmDuration} from '@fix-webm-duration/fix';
export const frameSeconds=(frame:ReplayFrame)=>Math.max(3,Math.min(24,1.8+frame.text.length/15));

export function videoMime(){if(typeof MediaRecorder==='undefined')return null;return ['video/webm;codecs=vp9','video/webm;codecs=vp8','video/mp4','video/webm'].find(t=>MediaRecorder.isTypeSupported(t))||null;}

export async function exportReplay(frames:ReplayFrame[],options:FilmOptions,voices:Record<number,string>,onProgress:(percent:number)=>void,signal:AbortSignal){

 const mime=videoMime();if(!mime||!HTMLCanvasElement.prototype.captureStream)throw Error('Video export is unavailable in this browser. Try a desktop browser or download the transcript.');

 if(!frames.length)throw Error('Run a simulation first.');

 if(document.hidden)throw Error('Keep this tab visible while exporting.');

 const audio=new AudioContext();await audio.resume();const mix=audio.createMediaStreamDestination();const gain=audio.createGain();gain.gain.value=.12;gain.connect(mix);const voiceGain=audio.createGain();voiceGain.connect(mix);

 const canvas=document.createElement('canvas');drawReplay(canvas,frames[0],0,frames.length,0,options);

 const stream=canvas.captureStream(30);stream.addTrack(mix.stream.getAudioTracks()[0]);let music:AudioBufferSourceNode|undefined;let recorder:MediaRecorder|undefined;

 const chunks:BlobPart[]=[];let recordingError:Error|null=null;

 try{

  const speech:Record<number,AudioBuffer>={};for(const [i,src] of Object.entries(voices)){if(signal.aborted)throw new DOMException('Export cancelled.','AbortError');speech[Number(i)]=await audio.decodeAudioData(await (await fetch(src,{signal})).arrayBuffer());}

  try{const buffer=await audio.decodeAudioData(await (await fetch('/audio/midnight-theme.wav',{signal})).arrayBuffer());music=audio.createBufferSource();music.buffer=buffer;music.loop=true;music.connect(gain);}catch{if(signal.aborted)throw new DOMException('Export cancelled.','AbortError');}

  recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:2200000});

  const stopped=new Promise<void>(resolve=>{recorder!.onstop=()=>resolve();});

  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};

  recorder.onerror=()=>{recordingError=Error('The browser could not record this video.');};

  const recordingStarted=performance.now();recorder.start(1000);music?.start();
  const durations=frames.map((f,i)=>Math.max(frameSeconds(f),speech[i]?.duration||0)*1000/options.pace);const total=durations.reduce((a,b)=>a+b,0);let completed=0;

  for(let i=0;i<frames.length;i++){

   const clip=speech[i]?audio.createBufferSource():null;if(clip){clip.buffer=speech[i];clip.playbackRate.value=options.pace;clip.connect(voiceGain);clip.start();}const duration=durations[i],start=performance.now();

   while(performance.now()-start<duration){

    if(signal.aborted)throw new DOMException('Export cancelled.','AbortError');

    if(document.hidden)throw Error('Export stopped because this tab was hidden. Keep it visible and try again.');

    if(recordingError)throw recordingError;

    drawReplay(canvas,frames[i],i,frames.length,(performance.now()-start)/1000*options.pace,{...options,previousFrame:frames[i-1]});

    onProgress(Math.min(99,Math.round(100*(completed+performance.now()-start)/total)));

    await new Promise(r=>setTimeout(r,33));

   }

   clip?.disconnect();completed+=duration;

  }

  if(recorder.state!=='inactive')recorder.stop();await stopped;

  if(recordingError)throw recordingError;

  const rawBlob=new Blob(chunks,{type:mime});if(!rawBlob.size)throw Error('The recording was empty. Try another browser.');
  const blob=mime.includes('webm')?await fixWebmDuration(rawBlob,performance.now()-recordingStarted,{logger:false}):rawBlob;onProgress(100);
  return {blob,extension:mime.includes('mp4')?'mp4':'webm'};

 }finally{if(recorder&&recorder.state!=='inactive')recorder.stop();stream.getTracks().forEach(t=>t.stop());music?.stop();await audio.close();}

}

