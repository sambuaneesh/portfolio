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
    remotePatterns: ['com', 'co', 'app', 'io', 'dev', 'net', 'org', 'in', 'me'].map((tld) => ({
      protocol: 'https',
      hostname: `**.${tld}`,
    })),
  },
  devToolbar: { enabled: false },
});
