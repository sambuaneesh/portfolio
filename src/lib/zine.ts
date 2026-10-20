// The site is one booklet, so every page has a real page number. This is the
// single place they're decided; the contents page and every spread read it.
import type { Module } from './db';

export interface Section { key: string; title: string; href: string; from: number }

/** Page numbers per section, in reading order. Projects take one spread each. */
export function pageMap(modules: Module[], posts: number) {
  let p = 1;
  const take = (n: number) => { const from = p; p += n; return from; };
  const cover = take(1);          // 1
  const contents = take(2);       // 2-3  contents | letter from the editor
  const issue = take(2);          // 4-5  this issue | research
  const offHours = take(2);       // 6-7  subsystems & off hours | classifieds
  const workbench = take(2);      // 8-9  project catalogue
  const main = modules.filter((m) => !m.vibe), vibe = modules.filter((m) => m.vibe);
  const projects: Record<string, number> = Object.fromEntries(main.map((m) => [m.slug, take(2)]));
  const supplement = vibe.length ? take(2) : 0;   // the vibe-coded supplement
  for (const m of vibe) projects[m.slug] = take(2);
  const log = take(4);            // cv: two spreads
  const writing = take(2 + posts * 2);
  const contact = take(2);
  return { cover, contents, issue, offHours, workbench, supplement, projects, log, writing, contact, total: p - 1 };
}

export const pad2 = (n: number) => String(n).padStart(2, '0');

/** Page numbers are printed in hex, like phile numbers: 12 -> "0x0C". */
export const pg = (n: number) => `0x${n.toString(16).toUpperCase().padStart(2, '0')}`;
