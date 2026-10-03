import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {game,media} from '../render-dist/api.mjs';
const root=path.resolve('mobile-dist'),port=Number(process.env.PORT||10000);
const configuredOrigin=process.env.APP_ORIGIN||process.env.RENDER_EXTERNAL_URL;
if(process.env.NODE_ENV==='production'&&!configuredOrigin)throw Error('APP_ORIGIN or RENDER_EXTERNAL_URL is required in production.');
const origin=new URL(configuredOrigin||`http://localhost:${port}`).origin;
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.wav':'audio/wav','.webmanifest':'application/manifest+json','.ico':'image/x-icon'};
const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,origin);
  if(url.origin!==origin){res.writeHead(400);res.end();return;}
  if(url.pathname==='/healthz'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"ok":true}');return;}
  const route=url.pathname==='/api/game'?game:url.pathname==='/api/simulation-media'?media:null;
  if(route){
   const method=req.method||'GET',handler=route[method];if(!handler){res.writeHead(405);res.end();return;}
   const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>5000){res.writeHead(413);res.end();return;}chunks.push(chunk);}
   const request=new Request(url,{method,headers:req.headers,...(method==='POST'?{body:Buffer.concat(chunks)}:{})});
   const response=await handler(request);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
  const filename=path.resolve(root,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));
  if(!filename.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}
  const data=await fs.readFile(filename);res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':url.pathname.startsWith('/assets/')?'public, max-age=31536000, immutable':'no-cache'});res.end(req.method==='HEAD'?undefined:data);
 }catch(e){if(!res.headersSent){res.writeHead(e?.code==='ENOENT'?404:500);res.end(e?.code==='ENOENT'?'Not found':'Service unavailable');}else res.end();}
});
server.requestTimeout=200000;server.listen(port,'0.0.0.0',()=>console.log(`Midnight Alibi listening on port ${port}`));
process.on('SIGTERM',()=>{server.close(()=>process.exit(0));setTimeout(()=>process.exit(0),10000).unref();});
