import type {ReplayFrame} from './game';
import {photoCrop,type FaceCrop} from './face-photo';
export type FilmOptions={portraits:Record<string,HTMLImageElement>;photos?:Record<string,HTMLImageElement>;photoCrops?:Record<string,FaceCrop|undefined>;previousFrame?:ReplayFrame;theme:'noir'|'village';camera:boolean;pace:number;showRoles:boolean};
const colors=['#ad748a','#c2a463','#719ea9','#86a886','#9d88ba','#bf896e','#779cba','#bd8f9d'];
function oval(c:CanvasRenderingContext2D,x:number,y:number,rx:number,ry:number,color:string){c.fillStyle=color;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();}
function focusAngle(frame:ReplayFrame,count:number){const i=frame.players.findIndex(p=>p.id===(frame.playerId||frame.actorId));return i<0?.35:i/count*Math.PI*2+Math.PI;}
export function orbitAngle(frame:ReplayFrame,previous:ReplayFrame|undefined,time:number,camera=true){if(!camera)return .35;const target=focusAngle(frame,frame.players.length),from=previous?focusAngle(previous,previous.players.length):.35;const delta=Math.atan2(Math.sin(target-from),Math.cos(target-from));const t=Math.max(0,Math.min(1,time/1.5));return from+delta*t*t*(3-2*t);}
function wrap(c:CanvasRenderingContext2D,text:string,width:number){const result:string[]=[];let line='';for(const word of text.split(/\s+/)){if(c.measureText(line+(line?' ':'')+word).width<=width){line+=(line?' ':'')+word;continue;}if(line)result.push(line);line='';for(const char of word){if(c.measureText(line+char).width>width){result.push(line);line='';}line+=char;}}if(line)result.push(line);return result;}

export function drawReplay(canvas:HTMLCanvasElement,frame:ReplayFrame,index:number,total:number,time=0,options?:FilmOptions){
 if(canvas.width!==1280){canvas.width=1280;canvas.height=720;}const c=canvas.getContext('2d');if(!c)throw Error('Canvas is unavailable.');
 const grove=options?.theme==='village',night=frame.phase==='night';const bg=c.createRadialGradient(640,250,30,640,320,800);bg.addColorStop(0,grove?'#344b4a':'#59404c');bg.addColorStop(1,night?'#080e1c':'#181622');c.fillStyle=bg;c.fillRect(0,0,1280,720);
 for(let i=0;i<9;i++){c.strokeStyle=grove?'#172d2d':'#90707428';c.lineWidth=grove?22:3;c.beginPath();c.ellipse(80+i*145,320,65,230,0,Math.PI,Math.PI*2);c.stroke();}for(let i=0;i<30;i++)oval(c,40+(i*197)%1200,110+(i*71)%330,1.5,1.5,'#e5c99566');
 oval(c,640,427,550,115,'#0b10183b');
 const angle=orbitAngle(frame,options?.previousFrame,time,options?.camera!==false);
 const project=(x:number,z:number,elevation=0)=>{const rx=x*Math.cos(angle)-z*Math.sin(angle),rz=x*Math.sin(angle)+z*Math.cos(angle),scale=900/(1000+rz);return{x:640+rx*scale,y:330-rz*.16*scale-elevation*scale,scale,z:rz};};
 const seats=frame.players.map((p,i)=>({...project(Math.sin(i/frame.players.length*Math.PI*2)*360,Math.cos(i/frame.players.length*Math.PI*2)*360),p,i}));
 const creature=(seat:typeof seats[number])=>{const {p,i,x,y,scale}=seat,talking=p.id===frame.playerId,color=colors[i%colors.length];c.save();c.translate(x,y);c.scale(scale,scale);if(!p.alive)c.globalAlpha=.36;
 oval(c,0,2,48,12,'#07090d66');if(talking){c.strokeStyle='#ecc992';c.lineWidth=2;c.beginPath();c.ellipse(0,2,53+Math.sin(time*5)*2,13,0,0,Math.PI*2);c.stroke();}
 c.translate(0,p.alive?Math.sin(time*(talking?7:2)+i)*(talking?2:1):0);
 // Organic silhouettes: moth wings, antlers, rabbit ears and curled tails.
 if(i%3===0){oval(c,-40,-49,25,40,color);oval(c,40,-49,25,40,color);}else{c.strokeStyle=color;c.lineWidth=12;c.beginPath();c.moveTo(29,-17);c.bezierCurveTo(75,-12,66,-76,44,-55);c.stroke();}
 oval(c,-21,-4,21,10,color);oval(c,21,-4,21,10,color);oval(c,0,-43,39,49,color);oval(c,0,-38,27,34,'#ffffff19');
 for(const side of [-1,1]){c.save();c.translate(side*31,-56);c.rotate(side*(talking?.4+Math.sin(time*6)*.18:.15));oval(c,side*9,10,12,26,color);c.restore();}
 if(i%3===1){oval(c,-24,-129,13,38,color);oval(c,24,-129,13,38,color);oval(c,-24,-130,5,23,'#efd1ad55');oval(c,24,-130,5,23,'#efd1ad55');}else{for(const side of [-1,1]){c.strokeStyle='#d2b18b';c.lineWidth=4;c.beginPath();c.moveTo(side*18,-120);c.quadraticCurveTo(side*36,-161,side*47,-151);c.stroke();oval(c,side*47,-151,5,5,'#e2c598');}}
 oval(c,0,-98,43,39,color);oval(c,-28,-91,18,20,color);oval(c,28,-91,18,20,color);
 const photo=options?.photos?.[p.id],img=options?.portraits[p.id];
 if(photo||img){c.save();c.beginPath();c.ellipse(0,-99,39,35,0,0,Math.PI*2);c.clip();if(photo){const crop=photoCrop(photo.naturalWidth,photo.naturalHeight,options?.photoCrops?.[p.id]);c.drawImage(photo,crop.x,crop.y,crop.size,crop.size,-39,-138,78,78);}else if(img){const e=talking?Math.floor(time*7)%2:frame.phase==='vote'?2:frame.phase==='ended'?3:0,w=img.naturalWidth/2,h=img.naturalHeight/2;c.drawImage(img,e%2*w,Math.floor(e/2)*h,w,h,-45,-145,90,90);}c.restore();}else{for(const side of [-1,1]){oval(c,side*17,-103,12,15,'#f0dfba');oval(c,side*17+(talking?2:0),-101,6,10,'#232330');oval(c,side*17-2,-106,2,3,'#ffffff');}oval(c,0,-86,5,3,'#523844');oval(c,0,-76,7,talking?3+Math.abs(Math.sin(time*10))*4:2,'#392737');}
 // Collar and role medallion leave the photo unobscured.
 oval(c,0,-58,30,8,'#302b40');oval(c,0,-48,12,12,'#d6b582');c.fillStyle='#423444';c.font='bold 15px Arial';c.textAlign='center';c.fillText(options?.showRoles===false?'·':p.role==='Doctor'?'+':p.role==='Detective'?'?':p.role==='Mafia'?'◆':'•',0,-43);
 c.restore();};
 const ordered=[...seats].sort((a,b)=>b.z-a.z);ordered.filter(s=>s.z>=0).forEach(creature);
 const table=(elevation:number,color:string)=>{c.fillStyle=color;c.beginPath();for(let i=0;i<=80;i++){const a=i/80*Math.PI*2,v=project(Math.sin(a)*245,Math.cos(a)*245,elevation);if(i===0)c.moveTo(v.x,v.y);else c.lineTo(v.x,v.y);}c.closePath();c.fill();};
 table(20,'#211f2a');table(39,'#a07b59');table(44,grove?'#344e4a':'#493c53');
 c.strokeStyle='#d7b88955';c.lineWidth=1;for(const seat of seats){const a=project(Math.sin(seat.i/seats.length*Math.PI*2)*175,Math.cos(seat.i/seats.length*Math.PI*2)*175,45);oval(c,a.x,a.y,17*a.scale,7*a.scale,'#dfc7a922');}
 const center=project(0,0,44);oval(c,center.x,center.y,28,10,'#e2ba7544');c.fillStyle='#e9d2a2';c.fillRect(center.x-5,center.y-35,10,35);oval(c,center.x,center.y-40,4+Math.sin(time*8)*.5,9,'#ffdc89');
 ordered.filter(s=>s.z<0).forEach(creature);
 for(const {p,x,y,scale} of seats){c.save();c.translate(x,y);c.scale(scale,scale);c.fillStyle='#151722ed';c.beginPath();c.roundRect(-76,16,152,39,10);c.fill();c.textAlign='center';c.fillStyle='#f4e9d7';c.font='15px Arial';c.fillText(p.name,0,32,144);c.fillStyle='#c6ab93';c.font='11px Arial';c.fillText(!p.alive?'ELIMINATED':options?.showRoles===false&&frame.phase!=='ended'?'Hidden role':p.role,0,47);c.restore();}

 if(frame.event&&frame.targetId){const a=seats.find(s=>s.p.id===frame.actorId),b=seats.find(s=>s.p.id===frame.targetId);if(a&&b){c.strokeStyle=frame.event==='attack'?'#ed9a93':'#b6dfc9';c.lineWidth=3;c.setLineDash([6,6]);c.beginPath();c.moveTo(a.x,a.y-60*a.scale);c.quadraticCurveTo(640,160,b.x,b.y-60*b.scale);c.stroke();c.setLineDash([]);}}
 c.fillStyle='#141219e8';c.fillRect(0,0,1280,90);c.fillStyle='#d29376';c.font='17px Arial';c.fillText('MIDNIGHT ALIBI / SIMULATION STUDIO',36,31);c.fillStyle='#f0e8dd';c.font='29px Georgia';c.fillText(frame.phase==='ended'?'THE FINAL VERDICT':`DAY ${frame.day} / ${frame.phase.toUpperCase()}`,36,67);c.textAlign='right';c.font='16px Arial';c.fillStyle='#c1b4a6';c.fillText(`SCENE ${index+1} / ${total}`,1244,33);c.fillText('Fictional characters · AI voices when enabled',1244,62);c.textAlign='left';

 if(/voted out|not survive|wins|draw\./.test(frame.text)&&!frame.playerId){c.fillStyle=`rgba(129,46,48,${.15+.08*Math.sin(time*4)})`;c.fillRect(0,90,1280,400);}

 c.fillStyle='#111017f2';c.fillRect(24,496,1232,201);c.fillStyle='#dca786';c.font='23px Georgia';c.fillText(frame.name,48,532,1184);c.fillStyle='#f4ede3';c.font='24px Arial';wrap(c,frame.text,1184).slice(0,5).forEach((line,i)=>c.fillText(line,48,570+i*27));c.fillStyle='#56413d';c.fillRect(24,708,1232,3);c.fillStyle='#dca786';c.fillRect(24,708,1232*(index+1)/total,3);

}
export async function loadPortraits(sources:Record<string,string>){const portraits:Record<string,HTMLImageElement>={};await Promise.all(Object.entries(sources).map(async([id,src])=>{const img=new Image();img.src=src;try{await img.decode();portraits[id]=img;}catch{/* Animated default actor remains available. */}}));return portraits;}

