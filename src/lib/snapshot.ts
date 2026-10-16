// Backup of the backup. Every successful read at build time (database rows,
// READMEs, Steam) is recorded into src/data/snapshot.json, which is also
// published with the site at /data/snapshot.json. If a source is down at
// build time, the build reads the last published snapshot instead (falling
// back to the copy committed in the repo), so a deploy never depends on the
// database being up. Pages built that way get a tiny mark in the footer.

import fs from 'node:fs';
import path from 'node:path';

const FILE = path.resolve('src/data/snapshot.json');
const LIVE = 'https://sambuaneesh.github.io/portfolio/data/snapshot.json';

type Snap = Record<string, unknown>;
const fresh: Snap = {};
let old: Promise<Snap> | null = null;
let fallbackUsed = false;

function readLocal(): Snap {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return {}; }
}

async function loadOld(): Promise<Snap> {
  const local = readLocal();
  try {
    const res = await fetch(LIVE, { signal: AbortSignal.timeout(8000) });
    if (res.ok) return { ...local, ...(await res.json()) };
  } catch { /* the live site is unreachable too: the repo copy will do */ }
  return local;
}

/** Remember a successful read (only during a production build). */
export function record(key: string, value: unknown) {
  fresh[key] = value;
  if (!import.meta.env.PROD) return;
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify({ ...readLocal(), ...fresh, _savedAt: new Date().toISOString() }));
  } catch { /* read-only checkout: the live snapshot still exists */ }
}

/** The last known value for a key; throws if there is none anywhere. */
export async function recall<T>(key: string): Promise<T> {
  const snap = await (old ??= loadOld());
  if (!(key in snap)) throw new Error(`no snapshot for ${key}`);
  fallbackUsed = true;
  console.warn(`[snapshot] using archived copy of ${key}`);
  return snap[key] as T;
}

/** True if anything on this build came from the snapshot. */
export const isFallback = () => fallbackUsed;
