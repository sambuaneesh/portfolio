// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';

// Publish the content snapshot with the site, so the next build can fall
// back to it if the database is down (see src/lib/snapshot.ts).
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
  integrations: [sitemap({ filter: (page) => !page.includes('/admin/') }), snapshot],
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
