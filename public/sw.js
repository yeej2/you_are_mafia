// Only static art and audio are cached. Private game responses never enter a cache.
const CACHE='alibi-assets-v1';
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE).then(c=>c.addAll(['/noir-table.webp','/audio/midnight-theme.wav','/icon-192.png'])));});
self.addEventListener('activate',event=>event.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))])));
self.addEventListener('fetch',event=>{const u=new URL(event.request.url);if(u.origin!==self.location.origin||event.request.method!=='GET'||!['/noir-table.webp','/audio/midnight-theme.wav','/icon-192.png'].includes(u.pathname))return;event.respondWith(caches.match(event.request).then(c=>c||fetch(event.request)));});
