// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';

// Publish the content snapshot with the site, so the next build can fall
// back to it if the database is down (see src/lib/snapshot.ts).
// Every link that leaves the site opens in a new tab (rel=noopener keeps
// the new page from touching this one). Done on the built HTML, so it works
// without JS and covers templates and rendered READMEs alike.
const SITE_ORIGIN = 'https://sambuaneesh.github.io';
/** @type {import('astro').AstroIntegration} */
const externalLinks = {
  name: 'external-links',
  hooks: {
    'astro:build:done': ({ dir }) => {
      /** @param {URL} u @returns {URL[]} */
      const walk = (u) => fs.readdirSync(u, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(new URL(`${e.name}/`, u)) : e.name.endsWith('.html') ? [new URL(e.name, u)] : []);
      for (const file of walk(dir)) {
        const html = fs.readFileSync(file, 'utf8');
        const out = html.replace(/<a\b[^>]*>/gi, (tag) => {
          const href = tag.match(/\shref="([^"]*)"/i)?.[1] ?? '';
          if (!/^https?:\/\//i.test(href) || href.startsWith(SITE_ORIGIN) || /\starget=/i.test(tag)) return tag;
          let t = tag.replace(/^<a\b/i, '<a target="_blank"');
          const rel = t.match(/\srel="([^"]*)"/i);
          if (!rel) t = t.replace(/^<a\b/i, '<a rel="noopener"');
          else if (!/noopener/.test(rel[1])) t = t.replace(rel[0], ` rel="${rel[1]} noopener"`);
          return t;
        });
        if (out !== html) fs.writeFileSync(file, out);
      }
    },
  },
};

/** @type {import('astro').AstroIntegration} */
const snapshot = {
  name: 'zine-snapshot',
  hooks: {
    'astro:build:done': ({ dir }) => {
      const src = new URL('./src/data/snapshot.json', import.meta.url);
      if (!fs.existsSync(src)) return;
      fs.mkdirSync(new URL('data/', dir), { recursive: true });
      fs.copyFileSync(src, new URL('data/snapshot.json', dir));
    },
  },
};

// Served from GitHub Pages as a project site: https://sambuaneesh.github.io/portfolio/
export default defineConfig({
  site: 'https://sambuaneesh.github.io',
  base: '/portfolio',
  trailingSlash: 'always',
  output: 'static',
  integrations: [sitemap({ filter: (page) => !page.includes('/admin/') }), snapshot, externalLinks],
  build: {
    // Every page's CSS is small enough to inline: zero render-blocking requests.
    inlineStylesheets: 'always',
    format: 'directory',
  },
  image: {
    // Content images are admin-uploaded and can live anywhere (Supabase
    // storage, GitHub, Vercel). They're fetched once at build and re-encoded.
    // '**.com' only matches subdomains, so bare hosts are listed too.
    remotePatterns: ['com', 'co', 'app', 'io', 'dev', 'net', 'org', 'in', 'me'].flatMap((tld) => [
      { protocol: 'https', hostname: `**.${tld}` },
      { protocol: 'https', hostname: `*.${tld}` },
    ]).concat(['github.com', 'gitlab.com', 'vercel.app', 'netlify.app'].map((hostname) => ({ protocol: 'https', hostname }))),
  },
  devToolbar: { enabled: false },
});
