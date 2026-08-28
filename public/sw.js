const VERSION = 'photo-metadata-inbox-__BUILD_ID__';
const BUILT_ASSETS = [];
const SHELL = [
  '/', '/index.html', '/offline.html', '/manifest.webmanifest',
  '/assets/archive-line-d52ac22b.webp',
  '/assets/archive-line-6fd7f02a.png', '/assets/icon-192.png', '/assets/icon-512.png',
  ...BUILT_ASSETS
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await Promise.all(SHELL.map(async (path) => {
      const response = await fetch(new Request(path, { cache: 'reload' }));
      if (!response.ok) throw new Error(`Could not cache ${path}`);
      await cache.put(path, response);
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key)))),
    self.clients.claim()
  ]));
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(fetch(request));
    return;
  }
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cached = await caches.match('/index.html', { ignoreSearch: true, ignoreVary: true });
      try {
        const response = await fetch(request);
        const body = await response.clone().text();
        if (!response.ok || !body.trim()) throw new Error('Empty network response');
        await (await caches.open(VERSION)).put('/index.html', response.clone());
        return response;
      } catch {
        return cached || (await caches.match('/offline.html'));
      }
    })());
    return;
  }
  event.respondWith(caches.match(request, { ignoreSearch: true, ignoreVary: true }).then((cached) => cached || fetch(request).then((response) => {
    if (response.ok) caches.open(VERSION).then((cache) => cache.put(request, response.clone()));
    return response;
  })));
});
