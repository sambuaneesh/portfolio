#!/usr/bin/env node
// Fails the build if any public page goes over its performance budget.
// Measures what a first visit actually downloads before interaction:
// the HTML (CSS is inlined into it), the JS it references, and the fonts.
// Sizes are gzip, which is what GitHub Pages serves.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const DIST = new URL('../dist/', import.meta.url).pathname;
const BASE = '/portfolio';

const BUDGET = {
  html: 40 * 1024,  // HTML + inlined CSS
  js: 30 * 1024,    // JS before interaction
  fonts: 120 * 1024, // the heaviest edition's faces + shared mono/pen faces (woff2)
  total: 250 * 1024,
};
// The admin console is never on a visitor's path.
const SKIP = [/^admin\//];

const gz = (buf) => gzipSync(buf, { level: 9 }).length;
const kb = (n) => `${(n / 1024).toFixed(1)} KB`;

function pages(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return pages(p);
    return name.endsWith('.html') ? [p] : [];
  });
}

// A visit downloads only the current edition's faces (fonts are fetched on
// first use), plus the shared mono and pen-note faces.
const woff = readdirSync(join(DIST, '_astro')).filter((f) => f.endsWith('.woff2'));
const size = (names) => woff.filter((f) => names.some((n) => f.startsWith(`${n}.`) || f.startsWith(`${n}-subset.`))).reduce((n, f) => n + statSync(join(DIST, '_astro', f)).size, 0);
const SHARED = ['jetbrains-mono', 'hand'];
const EDITIONS = {
  trash: ['archivo'],
  blueprint: ['b612-400', 'b612-700', 'b612-mono-400'],
  riso: ['bricolage', 'newsreader-400', 'newsreader-400i'],
  toner: ['anton-400', 'courier-prime-400', 'courier-prime-700'],
  hotline: ['bungee-400', 'chakra-petch-400', 'chakra-petch-700'],
  acid: ['unbounded', 'space-grotesk-400', 'space-grotesk-700'],
};
const perEdition = Object.fromEntries(Object.entries(EDITIONS).map(([k, v]) => [k, size([...v, ...SHARED])]));
const fontBytes = Math.max(...Object.values(perEdition));
console.log('fonts per edition:', Object.entries(perEdition).map(([k, v]) => `${k} ${kb(v)}`).join(' · '));

const jsCache = new Map();
function jsSize(src, seen = new Set()) {
  // follow static imports between chunks
  const path = join(DIST, src.replace(BASE, ''));
  if (seen.has(path)) return 0;
  seen.add(path);
  const code = readFileSync(path);
  let total = gz(code);
  for (const m of code.toString().matchAll(/(?:^|[;\s])import\s*(?:[^'"]*from\s*)?["']\.\/([^"']+\.js)["']/g)) {
    total += jsSize(`${BASE}/_astro/${m[1]}`, seen);
  }
  return total;
}

let failed = false;
const rows = [];
for (const file of pages(DIST)) {
  const rel = relative(DIST, file);
  if (SKIP.some((r) => r.test(rel))) continue;
  const html = readFileSync(file);
  const htmlGz = gz(html);
  const scripts = [...html.toString().matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((m) => m[1]);
  const js = scripts.reduce((n, s) => {
    if (!jsCache.has(s)) jsCache.set(s, jsSize(s));
    return n + jsCache.get(s);
  }, 0);
  const total = htmlGz + js + fontBytes;
  const over = [
    htmlGz > BUDGET.html && 'html',
    js > BUDGET.js && 'js',
    fontBytes > BUDGET.fonts && 'fonts',
    total > BUDGET.total && 'total',
  ].filter(Boolean);
  if (over.length) failed = true;
  rows.push([rel, kb(htmlGz), kb(js), kb(fontBytes), kb(total), over.length ? `OVER: ${over.join(',')}` : 'ok']);
}

const head = ['page', 'html+css', 'js', 'fonts', 'total', ''];
const widths = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
const line = (r) => r.map((c, i) => c.padEnd(widths[i])).join('  ');
console.log(line(head));
for (const r of rows.sort((a, b) => a[0].localeCompare(b[0]))) console.log(line(r));
console.log(`\nbudget: html ${kb(BUDGET.html)} · js ${kb(BUDGET.js)} · fonts ${kb(BUDGET.fonts)} · total ${kb(BUDGET.total)}`);

if (failed) {
  console.error('\nPerformance budget exceeded.');
  process.exit(1);
}
