import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeShiki from '@shikijs/rehype';
import rehypeStringify from 'rehype-stringify';

// Markdown -> HTML at build time (posts and project READMEs). Highlighting
// happens here too, so none of it costs the visitor any JS.

interface HNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HNode[];
}

export interface RenderOptions {
  /** Resolve relative links/images against these (README files). */
  baseHref?: string;
  baseSrc?: string;
  /** Shift headings down (h1 -> h2...) when embedded under a page h1. */
  demote?: number;
}

const DROP = new Set(['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button', 'link', 'meta']);
const absolute = (url: string) => /^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(url);

const textOf = (n: HNode): string =>
  n.type === 'text' ? String((n as unknown as { value: string }).value) : (n.children ?? []).map(textOf).join('');

/** GitHub-style heading slug, so in-README "#section" links keep working. */
const slug = (t: string) => t.toLowerCase().trim().replace(/[^\p{L}\p{N}\s_-]/gu, '').replace(/\s/g, '-');

/** Make embedded (partly untrusted) HTML safe and self-contained. */
function tidy(opts: RenderOptions) {
  return () => (tree: HNode) => {
    const seen = new Map<string, number>();
    const walk = (node: HNode) => {
      if (!node.children) return;
      node.children = node.children.filter((c) => !(c.type === 'element' && DROP.has(c.tagName!)));
      for (const c of node.children) {
        if (c.type !== 'element') continue;
        const p = (c.properties ??= {});
        for (const k of Object.keys(p)) if (/^on/i.test(k)) delete p[k];
        if (typeof p.href === 'string') {
          if (/^\s*javascript:/i.test(p.href)) delete p.href;
          else if (opts.baseHref && !absolute(p.href)) p.href = new URL(p.href.replace(/^\.\//, ''), opts.baseHref).href;
        }
        if (c.tagName === 'img' || c.tagName === 'source') {
          for (const key of ['src', 'srcSet'] as const) {
            const v = p[key];
            if (typeof v === 'string' && opts.baseSrc && !absolute(v) && !v.startsWith('data:')) {
              p[key] = new URL(v.replace(/^\.\//, ''), opts.baseSrc).href;
            }
          }
          if (c.tagName === 'img') { p.loading = 'lazy'; p.decoding = 'async'; }
        }
        if (/^h[1-6]$/.test(c.tagName!) && !p.id) {
          const base = slug(textOf(c));
          const n = seen.get(base) ?? 0;
          seen.set(base, n + 1);
          if (base) p.id = n ? `${base}-${n}` : base;
        }
        if (opts.demote && /^h[1-6]$/.test(c.tagName!)) {
          c.tagName = `h${Math.min(6, Number(c.tagName![1]) + opts.demote)}`;
        }
        walk(c);
      }
    };
    walk(tree);
  };
}

export async function renderMarkdown(md: string, opts: RenderOptions = {}): Promise<string> {
  const file = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(tidy(opts))
    .use(rehypeShiki, { theme: 'vitesse-dark', fallbackLanguage: 'text' })
    .use(rehypeStringify)
    .process(md);
  return String(file);
}
