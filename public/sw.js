// Service worker: make every visit after the first one feel instant.
// - /_astro/* (fonts, CSS, JS, images): content-hashed names, cache-first.
// - pages: network first with a 1.5 s timeout, then the cached copy (so a
//   new publish is never hidden behind a stale page, and offline still works).
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

  // pages: network first (a publish shows up immediately); if the network is
  // slow (>1.5 s) or down, the cached copy instead, so it still opens offline
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const key = new Request(url.origin + url.pathname); // ignore ?edition= etc.
      const fresh = refresh(cache, key);
      const timeout = new Promise((r) => setTimeout(() => r(null), 1500));
      const first = await Promise.race([fresh.catch(() => null), timeout]);
      if (first) return first;
      const hit = await cache.match(key);
      if (hit) { event.waitUntil(fresh.catch(() => null)); return hit; }
      try { return await fresh; } catch { /* offline, never cached */ }
      return (await cache.match(new URL('./', self.registration.scope).href)) || Response.error();
    })());
    return;
  }

  // other same-origin files: cached copy now, fresh copy for next time
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req);
    const update = refresh(cache, req).catch(() => null);
    if (hit) { event.waitUntil(update); return hit; }
    return (await update) || Response.error();
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
