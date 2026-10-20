// Build-time data layer. Every public page is rendered from these rows once,
// at `astro build`, so visitors download finished HTML and never wait on a
// database round trip. Reads use the public (RLS-protected) publishable key -
// the same view of the data any anonymous visitor would get.

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY as string | undefined;

export interface Highlight { icon: string; title: string; description: string }

export interface PersonalInfo {
  id: string;
  name: string;
  title: string;
  bio: string;
  location: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  linkedin: string | null;
  github: string | null;
  medium: string | null;
  codeforces: string | null;
  instagram: string | null;
  youtube: string | null;
  twitter: string | null;
  avatar_url: string | null;
  highlights: Highlight[];
}

export interface Education {
  id: string; institution: string; degree: string; duration: string;
  gpa: string | null; location: string | null; description: string | null;
  coursework: string[] | null; order_index: number | null;
}

export interface Experience {
  id: string; title: string; company: string; duration: string; location: string | null;
  description: string[] | null; technologies: string[] | null; order_index: number | null;
}

export interface Project {
  id: string; title: string; description: string;
  github_url: string | null; live_url: string | null; image_url: string | null; images: string[] | null;
  featured: boolean | null; is_contributed: boolean | null;
  stars: number | null; forks: number | null; language: string | null; language_color: string | null;
  tags: string[] | null; category: string | null; order_index: number;
  created_at: string; updated_at: string;
}

export interface Skill { id: string; category: string; skill_name: string; proficiency: number | null; order_index: number | null }

export interface Achievement {
  id: string; title: string; description: string | null; date_achieved: string | null;
  certificate_url: string | null; order_index: number | null;
}

export interface Course {
  id: string; name: string; description: string | null; institution: string | null;
  completion_date: string | null; certificate_url: string | null; is_favorite: boolean | null; order_index: number | null;
}

export interface Language { id: string; name: string; level: string; proficiency: number; order_index: number }

export interface BlogPost {
  id: string; title: string; slug: string; content: string; excerpt: string | null;
  external_link: string | null; image_url: string | null; images: string[] | null; tags: string[] | null;
  published: boolean | null; order_index: number | null; created_at: string; updated_at: string;
}

export interface SiteSettings {
  footer_text: string;
  footer_github_url: string;
  auth_title: string;
  auth_description: string;
  admin_quick_links: { label: string; url: string }[];
  /** Where I currently work/research, shown on the home ID badge. */
  badge_lab: { label: string; url: string | null } | null;
  /** Links with no column of their own (Steam, etc.): [{ label, url }]. */
  extra_links: { label: string; url: string }[];
  /** Cover colour every visitor gets (set in /admin -> Appearance). */
  theme: string;
  /** Zine masthead, e.g. "The Boring Zine". */
  zine_title: string;
  /** Small line under the masthead. */
  zine_tagline: string;
  /** Big "THE ___ ISSUE" line on the cover. */
  zine_issue_theme: string;
  zine_issue: string;
  /** Punk layer over the zine: ransom letters, tape, stamps, staples, misprints. */
  zine_punk: boolean;
  /** Phones: 'desktop' = the full spread, zoomed out (pinch to zoom);
   *  'reflow' = one page at a time at phone width. */
  mobile_layout: 'desktop' | 'reflow';
  /** What the cover barcode encodes (real Code 128). Tokens: {commit},
   *  {epoch}, {issue}; anything else is printed as-is. */
  barcode: string;
  /** Thank-you list printed in the colophon; hidden when empty. */
  greetz: string[];
  /** Per-project page options, keyed by project id (edited in /admin). */
  project_extras: Record<string, { show_readme?: boolean; readme_override?: string | null }>;
}

import { record, recall } from './snapshot';

const cache = new Map<string, Promise<unknown>>();
const stamps = new Map<string, number>();

async function rest<T>(path: string): Promise<T> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_PUBLISHABLE_KEY are not set. Copy .env.example to .env.');
  }
  // Pages share rows (every page needs personal_info, the nav needs projects),
  // so memoise per build instead of refetching for each of them. The dev
  // server is one long-lived process, so there entries expire after a few
  // seconds; otherwise admin edits would never show up locally.
  const hit = cache.get(path);
  if (hit && import.meta.env.DEV && Date.now() - (stamps.get(path) ?? 0) > 3000) cache.delete(path);
  if (!cache.has(path)) {
    stamps.set(path, Date.now());
    cache.set(path, (async () => {
      // two quick tries, then the snapshot of the last good build
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
            headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
            signal: AbortSignal.timeout(10000),
          });
          if (!res.ok) throw new Error(`Supabase ${path} -> ${res.status}`);
          const json = await res.json();
          record(`db:${path}`, json);
          return json;
        } catch (err) {
          if (attempt === 1) {
            console.warn(`[db] ${(err as Error).message}; falling back to snapshot`);
            return recall(`db:${path}`);
          }
        }
      }
    })());
  }
  return cache.get(path) as Promise<T>;
}

const ordered = <T>(table: string) => rest<T[]>(`aneesh_${table}?select=*&order=order_index.asc.nullslast`);

export async function getPersonalInfo(): Promise<PersonalInfo> {
  const rows = await rest<PersonalInfo[]>('aneesh_personal_info?select=*&limit=1');
  if (!rows[0]) throw new Error('aneesh_personal_info is empty');
  return { ...rows[0], highlights: rows[0].highlights ?? [] };
}

export const getEducation = () => ordered<Education>('education');
export const getExperience = () => ordered<Experience>('experience');
export const getSkills = () => ordered<Skill>('skills');
export const getAchievements = () => ordered<Achievement>('achievements');
export const getCourses = () => ordered<Course>('courses');
export const getLanguages = () => ordered<Language>('languages');

export const getBlogPosts = () =>
  rest<BlogPost[]>('aneesh_blog_posts?select=*&published=eq.true&order=created_at.desc');

const SETTINGS_DEFAULTS: SiteSettings = {
  footer_text: 'Aneesh Sambu',
  footer_github_url: 'https://github.com/sambuaneesh/portfolio',
  auth_title: 'Admin Sign In',
  auth_description: 'Only authorized users can access admin features.',
  admin_quick_links: [],
  badge_lab: { label: 'SA4S@SERC', url: 'https://sa4s-serc.github.io/' },
  extra_links: [{ label: 'steam', url: 'https://steamcommunity.com/id/phant0mble3d/' }],
  project_extras: {},
  theme: 'random',
  zine_title: 'The Boring Zine',
  zine_tagline: 'about things that did not need building',
  zine_issue_theme: 'the side-quest issue',
  zine_issue: '01',
  zine_punk: true,
  mobile_layout: 'desktop',
  greetz: [],
  barcode: 'src@{commit}',
};

/** Cover colours. The interior is always the same photocopied grey. */
export const THEMES = ['trash', 'blueprint', 'riso', 'toner', 'hotline', 'acid'] as const;

export async function getSiteSettings(): Promise<SiteSettings> {
  const rows = await rest<{ key: string; value: unknown }[]>('aneesh_site_settings?select=key,value');
  const merged: Record<string, unknown> = { ...SETTINGS_DEFAULTS };
  for (const row of rows) merged[row.key] = row.value;
  return merged as unknown as SiteSettings;
}

// --- Projects, enriched -------------------------------------------------

export interface Module extends Project {
  slug: string;
  /** Hardware-style part number, e.g. AS-03 (VC-02 for vibe-coded ones). */
  part: string;
  /** In the "vibe coded" supplement (category contains "vibe"). */
  vibe: boolean;
  repo: { owner: string; name: string } | null;
  pushedAt: string | null;
  license: string | null;
}

export function slugify(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-');
}

function parseRepo(url: string | null) {
  const m = url?.match(/github\.com\/([^/]+)\/([^/#?]+)/i);
  return m ? { owner: m[1], name: m[2].replace(/\.git$/, '') } : null;
}

interface GhRepo { stargazers_count: number; forks_count: number; pushed_at: string; license: { spdx_id: string } | null }

// Live stars/forks/last-push from GitHub, so the numbers never go stale
// between edits. Falls back to whatever is stored in the table if GitHub is
// unreachable or rate-limited - a build must never fail because of this.
async function fetchRepo(repo: { owner: string; name: string }): Promise<GhRepo | null> {
  try {
    const token = import.meta.env.GITHUB_TOKEN ?? process.env.GITHUB_TOKEN;
    const res = await fetch(`https://api.github.com/repos/${repo.owner}/${repo.name}`, {
      headers: { Accept: 'application/vnd.github+json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      signal: AbortSignal.timeout(5000),
    });
    return res.ok ? ((await res.json()) as GhRepo) : null;
  } catch {
    return null;
  }
}

let modulesPromise: Promise<Module[]> | null = null;

let modulesAt = 0;

export function getModules(): Promise<Module[]> {
  if (import.meta.env.DEV && Date.now() - modulesAt > 3000) modulesPromise = null;
  modulesAt = modulesPromise ? modulesAt : Date.now();
  modulesPromise ??= (async () => {
    const all = await ordered<Project>('projects');
    // main workbench first, then the vibe-coded supplement (each keeps its order)
    const isVibe = (p: Project) => /vibe/i.test(p.category ?? '');
    const projects = [...all.filter((p) => !isVibe(p)), ...all.filter(isVibe)];
    const seen = new Set<string>();
    const counters = { AS: 0, VC: 0 };
    return Promise.all(projects.map(async (p, i) => {
      const vibe = isVibe(p);
      const prefix = vibe ? 'VC' : 'AS';
      const n = ++counters[prefix];
      let slug = slugify(p.title) || `module-${i + 1}`;
      while (seen.has(slug)) slug += '-x';
      seen.add(slug);
      const repo = parseRepo(p.github_url);
      const gh = repo ? await fetchRepo(repo) : null;
      return {
        ...p,
        slug,
        part: `${prefix}-${String(n).padStart(2, '0')}`,
        vibe,
        repo,
        stars: gh?.stargazers_count ?? p.stars,
        forks: gh?.forks_count ?? p.forks,
        pushedAt: gh?.pushed_at ?? null,
        license: gh?.license?.spdx_id && gh.license.spdx_id !== 'NOASSERTION' ? gh.license.spdx_id : null,
      };
    }));
  })();
  return modulesPromise;
}
