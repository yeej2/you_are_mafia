import {defineConfig} from 'vite';
import path from 'node:path';
export default defineConfig({resolve:{alias:{'@':path.resolve('.'),'cloudflare:workers':path.resolve('scripts/render-env.mjs')}},build:{ssr:'scripts/render-api.ts',outDir:'render-dist',emptyOutDir:true,rollupOptions:{output:{entryFileNames:'api.mjs'}}}});
