// Reading order of the workbench: catalogue -> main projects -> the
// vibe-coded supplement -> vibe projects -> field log. Page turns and
// prev/next links all follow this one list.
import type { Module } from './db';
import { u } from './site';

export interface Stop { href: string; label: string }

export function workbenchOrder(modules: Module[]): Stop[] {
  const main = modules.filter((m) => !m.vibe), vibe = modules.filter((m) => m.vibe);
  return [
    { href: u('/projects/'), label: 'catalogue' },
    ...main.map((m) => ({ href: u(`/projects/${m.slug}/`), label: m.title })),
    ...(vibe.length ? [{ href: u('/projects/vibe/'), label: 'vibe coded' }] : []),
    ...vibe.map((m) => ({ href: u(`/projects/${m.slug}/`), label: m.title })),
    { href: u('/cv/'), label: 'field log' },
  ];
}

/** The stops before and after `href` in reading order. */
export function around(modules: Module[], href: string) {
  const order = workbenchOrder(modules);
  const i = order.findIndex((s) => s.href === href);
  return { prev: order[i - 1] ?? null, next: order[i + 1] ?? null };
}
