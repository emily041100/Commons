// 배포할 때마다 V의 숫자를 올리세요. 그래야 기기에 새 버전이 반영돼요.
const V='gk-v1',F=['./','index.html','app.js','manifest.json','sample-assets.json','icon.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(F)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!=V).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(u.hostname=='api.github.com'||e.request.method!='GET')return;e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)))});
