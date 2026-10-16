// Service worker: make repeat visits nearly free.
// - /_astro/* (fonts, CSS, JS, images): content-hashed file names, so a
//   cached copy is always correct: cache-first.
// - pages: network-first (a new deploy shows up immediately), falling back
//   to the cached copy when offline.
// - everything else on this origin: stale-while-revalidate.
// Cross-origin requests (Supabase, GitHub, Steam) are never touched.
// Each deploy registers sw.js?v=<commit>, which drops the old caches.

const VERSION = new URL(self.location).searchParams.get('v') || 'dev';
const CACHE = `zine-${VERSION}`;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/admin/')) return;

  if (url.pathname.includes('/_astro/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) cache.put(req, res.clone());
      return res;
    })());
    return;
  }

  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch {
        return (await cache.match(req, { ignoreSearch: true })) || (await cache.match(new URL('./', self.registration.scope).href)) || Response.error();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    const fresh = fetch(req).then((res) => { if (res.ok) cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || fresh;
  })());
});
