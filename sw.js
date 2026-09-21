const CACHE = 'van-audit-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

// App shell (the page itself + manifest) goes network-first so a deploy is
// picked up on the very next load; the last-fetched copy still serves as an
// offline fallback for techs auditing in a dead-signal spot in the van.
// Everything else (e.g. Supabase reads) was never precached, so it just
// falls through to the network like before.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const isAppShell = e.request.mode === 'navigate'
    || e.request.url.endsWith('/manifest.json');

  if (isAppShell) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
});
