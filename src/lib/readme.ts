// Fetches a project's README from GitHub at build time. Uses
// raw.githubusercontent.com (not the REST API) so it isn't subject to the
// 60/hour unauthenticated API limit. Never fails the build.

export interface Readme { markdown: string; baseHref: string; baseSrc: string; file: string }

const NAMES = ['README.md', 'readme.md', 'Readme.md', 'README.markdown', 'README'];

export async function getReadme(owner: string, repo: string): Promise<Readme | null> {
  for (const file of NAMES) {
    try {
      const res = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${file}`, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) continue;
      const markdown = await res.text();
      if (!markdown.trim()) return null;
      return {
        markdown,
        file,
        baseHref: `https://github.com/${owner}/${repo}/blob/HEAD/`,
        baseSrc: `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/`,
      };
    } catch {
      /* try the next name */
    }
  }
  return null;
}
