import { execSync } from 'node:child_process';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Prefix an absolute site path with the deploy base (/portfolio). */
export function u(path: string): string {
  if (/^[a-z]+:/i.test(path)) return path;
  return `${BASE}${path.startsWith('/') ? path : `/${path}`}`;
}

export const WORKSPACES = [
  { n: 1, key: 'home', label: 'home', href: '/' },
  { n: 2, key: 'projects', label: 'projects', href: '/projects/' },
  { n: 3, key: 'cv', label: 'cv', href: '/cv/' },
  { n: 4, key: 'writing', label: 'writing', href: '/writing/' },
  { n: 5, key: 'contact', label: 'contact', href: '/contact/' },
] as const;

export type WorkspaceKey = (typeof WORKSPACES)[number]['key'];

function commit(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return 'local';
  }
}

export const BUILD = {
  commit: commit(),
  at: new Date(),
};

export function fmtDate(d: string | Date, opts: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: '2-digit' }) {
  return new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: 'Asia/Kolkata' }).format(new Date(d));
}

export function readingTime(text: string): number {
  return Math.max(1, Math.round(text.trim().split(/\s+/).length / 220));
}
