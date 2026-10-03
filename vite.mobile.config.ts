import {defineConfig,loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig(({mode})=>{const values=loadEnv(mode,process.cwd(),'');const origin=process.env.NEXT_PUBLIC_GAME_API_URL||values.NEXT_PUBLIC_GAME_API_URL||'';if(origin&&!/^https:\/\/[^/]+$/.test(origin))throw Error('NEXT_PUBLIC_GAME_API_URL must be an HTTPS origin without a trailing slash.');return{root:path.resolve('mobile'),publicDir:path.resolve('public'),plugins:[react()],resolve:{alias:{'@':path.resolve('.')}},define:{'process.env.NEXT_PUBLIC_GAME_API_URL':JSON.stringify(origin)},build:{outDir:path.resolve('mobile-dist'),emptyOutDir:true}};});
