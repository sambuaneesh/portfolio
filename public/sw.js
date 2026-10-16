// Service worker: make every visit after the first one feel instant.
// - /_astro/* (fonts, CSS, JS, images): content-hashed names, cache-first.
// - pages: served from cache straight away and refreshed in the background
//   (stale-while-revalidate); network only when a page isn't cached yet.
// - once the first page is idle, the page tells us to precache the whole
//   zine (skipped on data-saver / 2G), so later page turns never wait.
// Each build registers sw.js?v=<build time>; activating it drops the old
// caches, so a deploy (or an admin "Publish") is never stuck behind one.
// Cross-origin requests (Supabase, GitHub, Steam) and /admin/ are left alone.

const VERSION = new URL(self.location).searchParams.get('v') || 'dev';
const CACHE = `zine-${VERSION}`;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

async function refresh(cache, req) {
  const res = await fetch(req);
  if (res.ok && res.type === 'basic') await cache.put(req, res.clone());
  return res;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/admin/')) return;

  if (url.pathname.includes('/_astro/')) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      return (await cache.match(req)) || refresh(cache, req);
    })());
    return;
  }

  // pages and everything else: cached copy now, fresh copy for next time
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const key = req.mode === 'navigate' ? new Request(url.origin + url.pathname) : req; // ignore ?edition= etc.
    const hit = await cache.match(key);
    const update = refresh(cache, key).catch(() => null);
    if (hit) { event.waitUntil(update); return hit; }
    const res = await update;
    if (res) return res;
    return (await cache.match(new URL('./', self.registration.scope).href)) || Response.error();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'precache') return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    for (const href of event.data.urls) {
      const req = new Request(new URL(href, self.location.origin).href);
      if (await cache.match(req)) continue;
      try { await refresh(cache, req); } catch { /* offline: try next time */ }
    }
  })());
});
