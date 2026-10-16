// The whole site's runtime JS: the HYD clock, the `:` command line, arrow-key
// page turns and the admin theme-preview banner. Plain DOM, no framework -
// every page still works fully without it. (The theme is fixed at build.)

type Cmd = { l: string; h: string; u?: string; a?: string };

// --- statusline mode flash ----------------------------------------------

const modeEl = document.querySelector<HTMLElement>('[data-mode]');
let modeTimer: number | undefined;
function flash(text: string) {
  if (!modeEl) return;
  modeEl.textContent = text.toUpperCase();
  clearTimeout(modeTimer);
  modeTimer = window.setTimeout(() => (modeEl.textContent = 'NORMAL'), Math.max(1600, text.length * 70));
}

// --- clock (Hyderabad time) ---------------------------------------------

const clock = document.querySelector<HTMLElement>('[data-clock]');
if (clock) {
  const fmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' });
  const tick = () => (clock.textContent = `HYD ${fmt.format(new Date())}`);
  tick();
  setInterval(tick, 15_000);
}

// --- command line ---------------------------------------------------------

const dlg = document.getElementById('cmd') as HTMLDialogElement | null;
const input = document.getElementById('cmd-q') as HTMLInputElement | null;
const list = document.getElementById('cmd-list') as HTMLUListElement | null;
const cmds: Cmd[] = JSON.parse(document.getElementById('cmd-data')?.textContent || '[]');
let shown: Cmd[] = [];
let sel = 0;

/** Subsequence fuzzy score: lower is better, -1 = no match. */
function score(hay: string, needle: string): number {
  if (!needle) return 0;
  hay = hay.toLowerCase();
  let pos = -1, gaps = 0;
  for (const ch of needle.toLowerCase()) {
    if (ch === ' ') continue;
    const next = hay.indexOf(ch, pos + 1);
    if (next < 0) return -1;
    gaps += next - pos - 1;
    pos = next;
  }
  return gaps + (hay.startsWith(needle.toLowerCase()) ? -100 : 0);
}

function render() {
  if (!list || !input) return;
  const q = input.value.trim().replace(/^:/, '');
  shown = cmds
    .map((c) => ({ c, s: score(c.l, q) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => a.s - b.s)
    .slice(0, 40)
    .map((x) => x.c);
  sel = Math.min(sel, Math.max(0, shown.length - 1));
  list.replaceChildren(...shown.map((c, i) => {
    const li = document.createElement('li');
    li.id = `cmd-${i}`;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(i === sel));
    li.append(c.l);
    const small = document.createElement('small');
    small.textContent = c.h;
    li.append(small);
    li.addEventListener('click', () => run(c));
    li.addEventListener('mousemove', () => { if (sel !== i) { sel = i; mark(); } });
    return li;
  }));
  if (!shown.length) {
    const li = document.createElement('li');
    li.textContent = 'No matches';
    list.append(li);
  }
  input.setAttribute('aria-activedescendant', shown.length ? `cmd-${sel}` : '');
}

function mark() {
  list?.querySelectorAll('li').forEach((li, i) => li.setAttribute('aria-selected', String(i === sel)));
  list?.querySelector(`#cmd-${sel}`)?.scrollIntoView({ block: 'nearest' });
  input?.setAttribute('aria-activedescendant', `cmd-${sel}`);
}

// Things nobody will type. Unlisted on purpose.
const EGGS: [RegExp, string][] = [
  [/^xyzzy$/i, 'nothing happens.'],
  [/^sudo\b/i, 'you are not in the sudoers file. this incident will be reported.'],
  [/^(rm -rf|:\(\)\{)/i, 'nice try.'],
  [/^(vim|vi|nvim)$/i, 'you are already in it.'],
  [/^(exit|quit|:q!?)$/i, "there's no leaving. there's only esc."],
];

function run(c: Cmd) {
  dlg?.close();
  if (c.a === 'help') return openHelp();
  if (c.u) {
    if (/^(https?:|mailto:)/.test(c.u) && !c.u.startsWith(location.origin)) window.open(c.u, '_blank', 'noopener');
    else location.href = c.u;
  }
}

function openCmd() {
  if (!dlg || !input) return;
  input.value = '';
  sel = 0;
  render();
  dlg.showModal();
  input.focus();
}

input?.addEventListener('input', () => { sel = 0; render(); });
input?.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowDown' || (e.ctrlKey && e.key === 'n')) { e.preventDefault(); sel = (sel + 1) % Math.max(1, shown.length); mark(); }
  else if (e.key === 'ArrowUp' || (e.ctrlKey && e.key === 'p')) { e.preventDefault(); sel = (sel - 1 + shown.length) % Math.max(1, shown.length); mark(); }
  else if (e.key === 'Enter') {
    e.preventDefault();
    const q = input.value.trim().replace(/^:/, '');
    const egg = EGGS.find(([re]) => re.test(q));
    if (egg) { dlg?.close(); return flash(egg[1]); }
    if (shown[sel]) run(shown[sel]);
  }
});
dlg?.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
document.querySelectorAll('[data-cmd-open]').forEach((b) => b.addEventListener('click', openCmd));

const help = document.getElementById('help') as HTMLDialogElement | null;
function openHelp() { help?.showModal(); }
help?.addEventListener('click', (e) => { if (e.target === help) help.close(); });
document.querySelectorAll('[data-help-open]').forEach((b) => b.addEventListener('click', openHelp));

// --- global keys ------------------------------------------------------------

const WS: Record<string, string> = {};
document.querySelectorAll<HTMLAnchorElement>('.bar [data-ws]').forEach((a) => (WS[a.dataset.ws!] = a.href));

document.addEventListener('keydown', (e) => {
  if (e.defaultPrevented) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); return openCmd(); }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const el = e.target as HTMLElement;
  if (el.closest('input, textarea, select, [contenteditable], dialog')) return;

  if (e.key === ':' || e.key === '/') { e.preventDefault(); return openCmd(); }
  if (e.key === '?') { e.preventDefault(); return openHelp(); }
  if (WS[e.key]) { location.href = WS[e.key]; return; }
  // ← / → turn the page (the layout publishes rel=prev/next links)
  if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
    const rel = e.key === 'ArrowRight' ? 'next' : 'prev';
    const link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
    if (link && document.documentElement.scrollWidth <= innerWidth) { e.preventDefault(); location.href = link.href; }
  }
});

// `:print cv` lands on /cv/#print
if (location.hash === '#print') {
  history.replaceState(null, '', location.pathname);
  addEventListener('load', () => setTimeout(() => print(), 300), { once: true });
}

// For whoever opens devtools.
console.log('%cTHE BORING ZINE', 'font: 900 14px monospace; background:#e4605b; color:#141414; padding:2px 6px');
console.log('you opened devtools on a zine. source: https://github.com/sambuaneesh/portfolio');

// Admin preview (?preview=<theme>, ?punk=0|1; set up by the inline head
// script): keep the parameters on internal links and flag it clearly.
const preview = document.documentElement.dataset.preview;
const previewPunk = document.documentElement.dataset.previewPunk;
if (preview || previewPunk) {
  document.querySelectorAll<HTMLAnchorElement>('a[href^="/"]').forEach((a) => {
    const url = new URL(a.href);
    if (url.origin === location.origin && !url.pathname.includes('/admin/')) {
      if (preview) url.searchParams.set('preview', preview);
      if (previewPunk) url.searchParams.set('punk', previewPunk);
      a.href = url.href;
    }
  });
  const flag = document.createElement('div');
  flag.className = 'preview-flag';
  const what = [preview && `theme: ${preview}`, previewPunk && `punk: ${previewPunk === '1' ? 'on' : 'off'}`].filter(Boolean).join(' · ');
  flag.innerHTML = `<span>previewing ${what}</span><a href="${location.pathname}">exit</a>`;
  document.body.append(flag);
}
