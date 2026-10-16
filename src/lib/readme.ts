// Fetches a project's README from GitHub at build time. Uses
// raw.githubusercontent.com (not the REST API) so it isn't subject to the
// 60/hour unauthenticated API limit. Never fails the build.

export interface Readme { markdown: string; baseHref: string; baseSrc: string; file: string }

const NAMES = ['README.md', 'readme.md', 'Readme.md', 'README.markdown', 'README'];

import { record, recall } from './snapshot';

export async function getReadme(owner: string, repo: string): Promise<Readme | null> {
  const key = `readme:${owner}/${repo}`;
  let reachable = false;
  for (const file of NAMES) {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${file}`, { signal: AbortSignal.timeout(6000) });
      reachable = true;
      if (!res.ok) continue;
      const markdown = await res.text();
      if (!markdown.trim()) return null;
      const readme = {
        markdown,
        file,
        baseHref: `https://github.com/${owner}/${repo}/blob/HEAD/`,
        baseSrc: `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/`,
      };
      record(key, readme);
      return readme;
    } catch {
      /* try the next name */
    }
  }
  // GitHub unreachable (not "no README"): use the last good copy
  if (!reachable) { try { return await recall<Readme>(key); } catch { /* none */ } }
  return null;
}
