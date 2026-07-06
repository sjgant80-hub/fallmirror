/* FallMirror service worker · offline-capable · sovereign */
const CACHE = 'fallmirror-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SHELL).catch(() => {});
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.host.includes('esm.run') || url.host.includes('mlc-ai')) return;
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(r => {
        if (r.ok) caches.open(CACHE).then(c => c.put(req, r.clone()));
        return r;
      }).catch(() => caches.match('./')))
    );
  }
});
