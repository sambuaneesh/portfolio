// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Served from GitHub Pages as a project site: https://sambuaneesh.github.io/portfolio/
export default defineConfig({
  site: 'https://sambuaneesh.github.io',
  base: '/portfolio',
  trailingSlash: 'always',
  output: 'static',
  integrations: [sitemap({ filter: (page) => !page.includes('/admin/') })],
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
