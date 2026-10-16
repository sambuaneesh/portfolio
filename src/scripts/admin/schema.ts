// Describes every editable table once; the console renders lists and forms
// from this. Adding a column to the admin = adding one line here.

export type FieldType =
  | 'text' | 'textarea' | 'markdown' | 'url' | 'email' | 'number' | 'bool'
  | 'list' | 'json' | 'image' | 'images' | 'color' | 'select' | 'date';

export interface Field {
  k: string;
  label?: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  help?: string;
  /** Stored in this site_settings key as { [row id]: { [field]: value } }
   *  instead of a table column (per-row extras that need no migration). */
  extra?: string;
  /** Value to show when nothing is stored yet. */
  def?: unknown;
  min?: number;
  max?: number;
}

export interface TableCfg {
  key: string;
  table: string;
  label: string;
  group: 'content' | 'writing' | 'inbox' | 'site';
  /** single-row table (personal info) */
  single?: boolean;
  /** rows are only visible through the admin gateway (drafts, inbox) */
  adminRead?: boolean;
  /** inbox tables: no "new" button */
  noCreate?: boolean;
  /** a form over individual site_settings keys (field k = setting key) */
  settings?: boolean;
  idColumn?: string;
  order: string;
  title: (r: Row) => string;
  sub?: (r: Row) => string;
  fields: Field[];
}

export type Row = Record<string, unknown> & { id?: string };

const order = { k: 'order_index', type: 'number', label: 'order', help: 'lower comes first' } as const;

export const THEMES = ['trash', 'riso', 'riso-blue', 'hotline', 'toner', 'blueprint', 'acid'];

export const TABLES: TableCfg[] = [
  {
    key: 'personal', table: 'aneesh_personal_info', label: 'Profile', group: 'content', single: true,
    order: 'created_at.asc', title: (r) => String(r.name ?? ''), sub: (r) => String(r.title ?? ''),
    fields: [
      { k: 'name', type: 'text', required: true },
      { k: 'title', type: 'text', required: true },
      { k: 'bio', type: 'textarea', required: true },
      { k: 'avatar_url', label: 'avatar', type: 'image' },
      { k: 'location', type: 'text' },
      { k: 'email', type: 'email' },
      { k: 'phone', type: 'text' },
      { k: 'website', type: 'url', help: 'blog / personal site' },
      { k: 'github', type: 'url' },
      { k: 'linkedin', type: 'url' },
      { k: 'twitter', type: 'url' },
      { k: 'medium', type: 'url' },
      { k: 'codeforces', type: 'url' },
      { k: 'instagram', type: 'url' },
      { k: 'youtube', type: 'url' },
      { k: 'highlights', type: 'json', help: 'list of { "icon": "Cpu", "title": "...", "description": "..." }. Icons: Cpu, GitBranch, Code2, Network, Server, Database, Terminal, Layers, Brain, BookOpen, Award, Rocket, Shield, Globe, Zap' },
    ],
  },
  {
    key: 'projects', table: 'aneesh_projects', label: 'Projects', group: 'content', order: 'order_index.asc',
    title: (r) => String(r.title ?? ''), sub: (r) => [r.language, r.featured ? '★ featured' : ''].filter(Boolean).join(' · '),
    fields: [
      { k: 'title', type: 'text', required: true },
      { k: 'description', type: 'textarea', required: true },
      { k: 'github_url', label: 'repo url', type: 'url', help: 'stars, forks and last push are read live from GitHub at build' },
      { k: 'live_url', type: 'url' },
      { k: 'image_url', label: 'main screenshot', type: 'image' },
      { k: 'images', label: 'more screenshots', type: 'images' },
      { k: 'language', type: 'text' },
      { k: 'language_color', type: 'color' },
      { k: 'category', type: 'text' },
      { k: 'tags', type: 'list' },
      { k: 'featured', type: 'bool', help: 'shown on the home page (first 4)' },
      { k: 'is_contributed', label: 'team project', type: 'bool' },
      { k: 'show_readme', label: 'show github readme on the project page', type: 'bool', extra: 'project_extras', def: true },
      { k: 'readme_override', label: 'write-up (replaces the readme)', type: 'markdown', extra: 'project_extras', help: 'Markdown. If filled, shown instead of the GitHub README.' },
      { k: 'stars', type: 'number', help: 'fallback if GitHub is unreachable' },
      { k: 'forks', type: 'number' },
      { ...order },
    ],
  },
  {
    key: 'experience', table: 'aneesh_experience', label: 'Experience', group: 'content', order: 'order_index.asc',
    title: (r) => String(r.title ?? ''), sub: (r) => `${r.company ?? ''} · ${r.duration ?? ''}`,
    fields: [
      { k: 'title', type: 'text', required: true },
      { k: 'company', type: 'text', required: true },
      { k: 'duration', type: 'text', required: true, help: 'e.g. "March 2024 - Present" ("Present" marks it as running)' },
      { k: 'location', type: 'text' },
      { k: 'description', label: 'bullets', type: 'list', help: 'one bullet per line' },
      { k: 'technologies', type: 'list' },
      { ...order },
    ],
  },
  {
    key: 'education', table: 'aneesh_education', label: 'Education', group: 'content', order: 'order_index.asc',
    title: (r) => String(r.institution ?? ''), sub: (r) => String(r.degree ?? ''),
    fields: [
      { k: 'institution', type: 'text', required: true },
      { k: 'degree', type: 'text', required: true },
      { k: 'duration', type: 'text', required: true },
      { k: 'gpa', type: 'text' },
      { k: 'location', type: 'text' },
      { k: 'description', type: 'textarea' },
      { k: 'coursework', type: 'list' },
      { ...order },
    ],
  },
  {
    key: 'achievements', table: 'aneesh_achievements', label: 'Research & record', group: 'content', order: 'order_index.asc',
    title: (r) => String(r.title ?? ''), sub: (r) => String(r.date_achieved ?? ''),
    fields: [
      { k: 'title', type: 'text', required: true },
      { k: 'description', type: 'textarea' },
      { k: 'date_achieved', label: 'date', type: 'text' },
      { k: 'certificate_url', label: 'link', type: 'url' },
      { ...order },
    ],
  },
  {
    key: 'skills', table: 'aneesh_skills', label: 'Skills', group: 'content', order: 'order_index.asc',
    title: (r) => String(r.skill_name ?? ''), sub: (r) => `${r.category ?? ''} · ${r.proficiency ?? '?'}`,
    fields: [
      { k: 'skill_name', label: 'skill', type: 'text', required: true },
      { k: 'category', type: 'text', required: true, help: 'e.g. Languages, Frameworks & Libraries, Databases, Technologies & Tools' },
      { k: 'proficiency', type: 'number', min: 0, max: 100 },
      { ...order },
    ],
  },
  {
    key: 'courses', table: 'aneesh_courses', label: 'Coursework', group: 'content', order: 'order_index.asc',
    title: (r) => String(r.name ?? ''), sub: (r) => `${r.completion_date ?? ''} · ${r.description ?? ''}`,
    fields: [
      { k: 'name', type: 'text', required: true },
      { k: 'description', type: 'text', help: 'private note (not shown on the site)' },
      { k: 'institution', type: 'text' },
      { k: 'completion_date', label: 'term', type: 'text' },
      { k: 'certificate_url', label: 'link', type: 'url' },
      { k: 'is_favorite', label: 'favourite', type: 'bool' },
      { ...order },
    ],
  },
  {
    key: 'languages', table: 'aneesh_languages', label: 'Languages', group: 'content', order: 'order_index.asc',
    title: (r) => String(r.name ?? ''), sub: (r) => String(r.level ?? ''),
    fields: [
      { k: 'name', type: 'text', required: true },
      { k: 'level', type: 'text', required: true },
      { k: 'proficiency', type: 'number', min: 0, max: 100, required: true },
      { ...order },
    ],
  },
  {
    key: 'posts', table: 'aneesh_blog_posts', label: 'Posts', group: 'writing', adminRead: true, order: 'created_at.desc',
    title: (r) => String(r.title ?? ''), sub: (r) => `${r.published ? 'published' : 'draft'} · /${r.slug ?? ''}`,
    fields: [
      { k: 'title', type: 'text', required: true },
      { k: 'slug', type: 'text', required: true, help: 'url: /writing/<slug>/ (lowercase, dashes)' },
      { k: 'excerpt', type: 'textarea' },
      { k: 'content', type: 'markdown', help: 'Markdown + GFM. Code blocks are highlighted at build.' },
      { k: 'image_url', label: 'cover image', type: 'image' },
      { k: 'external_link', type: 'url', help: 'if set with no content, the post links out' },
      { k: 'tags', type: 'list' },
      { k: 'published', type: 'bool' },
      { ...order },
    ],
  },
  {
    key: 'comments', table: 'aneesh_blog_comments', label: 'Comments', group: 'writing', adminRead: true, noCreate: true, order: 'created_at.desc',
    title: (r) => `${r.author_name ?? ''}: ${String(r.content ?? '').slice(0, 60)}`, sub: (r) => `${r.created_at ?? ''}`.slice(0, 10),
    fields: [
      { k: 'author_name', type: 'text' },
      { k: 'author_email', type: 'email' },
      { k: 'content', type: 'textarea' },
      { k: 'is_approved', label: 'approved (visible)', type: 'bool' },
    ],
  },
  {
    key: 'messages', table: 'aneesh_contact_messages', label: 'Messages', group: 'inbox', adminRead: true, noCreate: true, order: 'created_at.desc',
    title: (r) => `${r.name ?? ''}: ${r.subject ?? ''}`, sub: (r) => `${r.status ?? 'new'} · ${String(r.created_at ?? '').slice(0, 10)} · ${r.email ?? ''}`,
    fields: [
      { k: 'status', type: 'select', options: ['new', 'read', 'replied'] },
      { k: 'name', type: 'text' },
      { k: 'email', type: 'email' },
      { k: 'subject', type: 'text' },
      { k: 'message', type: 'textarea' },
    ],
  },
  {
    key: 'tasks', table: 'aneesh_task_requests', label: 'Task requests', group: 'inbox', adminRead: true, noCreate: true, order: 'created_at.desc',
    title: (r) => `${r.requester_name ?? ''}: ${r.title ?? ''}`, sub: (r) => `${r.status ?? ''} · ${r.priority ?? ''} · ${r.category ?? ''}`,
    fields: [
      { k: 'status', type: 'select', options: ['pending', 'accepted', 'declined'] },
      { k: 'requester_name', label: 'name', type: 'text' },
      { k: 'requester_email', label: 'email', type: 'email' },
      { k: 'title', type: 'text' },
      { k: 'description', type: 'textarea' },
      { k: 'category', type: 'select', options: ['academic', 'project', 'personal', 'work'] },
      { k: 'priority', type: 'select', options: ['low', 'medium', 'high'] },
      { k: 'due_date', type: 'date' },
      { k: 'due_time', type: 'text' },
      { k: 'estimated_duration', type: 'text' },
      { k: 'budget', type: 'text' },
      { k: 'additional_notes', type: 'textarea' },
    ],
  },
  {
    key: 'appearance', table: 'aneesh_site_settings', label: 'Appearance', group: 'site', settings: true, order: 'key.asc',
    title: () => 'Appearance',
    fields: [
      { k: 'theme', label: 'cover colour', type: 'select', options: THEMES, def: 'trash', help: 'Every visitor sees this. The inside pages stay photocopy grey. Use Preview to look before saving.' },
      { k: 'zine_title', label: 'masthead', type: 'text', def: 'The Boring Zine', help: 'Last word prints huge, the rest goes in the box above it.' },
      { k: 'zine_tagline', label: 'masthead tagline', type: 'text', def: 'about things that did not need building' },
      { k: 'zine_issue_theme', label: 'cover line', type: 'text', def: 'the side-quest issue', help: '"the X issue": the middle word(s) print big on the cover.' },
      { k: 'zine_issue', label: 'issue number', type: 'text', def: '01' },
      { k: 'mobile_layout', label: 'on phones', type: 'select', options: ['desktop', 'reflow'], def: 'desktop', help: 'desktop = the full two-page zine, zoomed out (pinch to zoom; Google ranks non-mobile layouts lower). reflow = one page at a time at phone width.' },
      { k: 'zine_punk', label: 'punk layer (ransom letters, tape, stamps, staples, misprints)', type: 'bool', def: true, help: 'Off = the clean zine.' },
      { k: 'greetz', type: 'list', def: [], help: 'Optional thank-you list printed in the credits box (real people/labs only). Leave empty to hide.' },
    ],
  },
  {
    key: 'settings', table: 'aneesh_site_settings', label: 'Site settings', group: 'site', idColumn: 'key', order: 'key.asc',
    title: (r) => String(r.key ?? ''), sub: (r) => JSON.stringify(r.value ?? '').slice(0, 60),
    fields: [
      { k: 'key', type: 'text', required: true, help: 'footer_text, footer_github_url, auth_title, auth_description, admin_quick_links, badge_lab ({ "label": "SA4S@SERC", "url": "https://…" }), extra_links ([{ "label": "steam", "url": "https://…" }]; a Steam link also feeds the games tile)' },
      { k: 'value', type: 'json', required: true, help: 'JSON: strings need quotes, e.g. "Aneesh Sambu"' },
    ],
  },
];
