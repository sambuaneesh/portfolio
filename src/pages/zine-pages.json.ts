// Every page of the zine, for the service worker to precache when idle.
import type { APIRoute } from 'astro';
import { getModules, getBlogPosts } from '../lib/db';
import { u } from '../lib/site';

export const GET: APIRoute = async () => {
  const [modules, posts] = await Promise.all([getModules(), getBlogPosts()]);
  const pages = [
    '/', '/projects/', '/cv/', '/writing/', '/contact/', '/404.html',
    ...modules.map((m) => `/projects/${m.slug}/`),
    ...posts.map((p) => `/writing/${p.slug}/`),
  ].map(u);
  return new Response(JSON.stringify(pages), { headers: { 'Content-Type': 'application/json' } });
};
