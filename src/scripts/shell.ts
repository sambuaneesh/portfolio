// The whole site's runtime JS: rice switching, the HYD clock, the `:`
// command line, tile focus with hjkl, and the cartridge tilt. Plain DOM, no
// framework - every page still works fully without it.

type Cmd = { l: string; h: string; u?: string; a?: string };

const root = document.documentElement;
const RICES = ['auto', 'putty', 'nostromo', 'phosphor', 'paper'] as const;
const ALL_RICES = [...RICES, 'aero'];

// --- rice -------------------------------------------------------------

function storedRice(): string {
  try { return localStorage.getItem('as-rice') || 'auto'; } catch { return 'auto'; }
}

function applyRice(name: string) {
  if (!ALL_RICES.includes(name)) return;
  try { localStorage.setItem('as-rice', name); } catch { /* private mode */ }
  root.dataset.theme = resolve(name);
  document.querySelectorAll<HTMLElement>('[data-rice-name]').forEach((el) => (el.textContent = name));
  flash(`theme: ${name}`);
}

const resolve = (name: string) =>
  name === 'auto' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'nostromo' : 'putty') : name;

/** Next rice that actually looks different (auto may equal putty/nostromo). */
function cycleRice() {
  let i = RICES.indexOf(storedRice() as (typeof RICES)[number]);
  const shown = root.dataset.theme;
  do i = (i + 1) % RICES.length;
  while (resolve(RICES[i]) === shown);
  applyRice(RICES[i]);
}

document.querySelectorAll<HTMLElement>('[data-rice-name]').forEach((el) => (el.textContent = storedRice()));
document.querySelectorAll('[data-rice]').forEach((b) => b.addEventListener('click', cycleRice));
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (storedRice() === 'auto') applyRice('auto');
});

// --- statusline mode flash ----------------------------------------------

const modeEl = document.querySelector<HTMLElement>('[data-mode]');
let modeTimer: number | undefined;
function flash(text: string) {
  if (!modeEl) return;
  modeEl.textContent = text.toUpperCase();
  clearTimeout(modeTimer);
  modeTimer = window.setTimeout(() => (modeEl.textContent = 'NORMAL'), 1600);
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

function run(c: Cmd) {
  dlg?.close();
  if (c.a === 'help') return openHelp();
  if (c.a?.startsWith('theme:')) return applyRice(c.a.slice(6));
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
    // secret rice
    if (/^theme\s+aero$/i.test(q)) { dlg?.close(); return applyRice('aero'); }
    if (shown[sel]) run(shown[sel]);
  }
});
dlg?.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
document.querySelectorAll('[data-cmd-open]').forEach((b) => b.addEventListener('click', openCmd));

const help = document.getElementById('help') as HTMLDialogElement | null;
function openHelp() { help?.showModal(); }
help?.addEventListener('click', (e) => { if (e.target === help) help.close(); });
document.querySelectorAll('[data-help-open]').forEach((b) => b.addEventListener('click', openHelp));

// --- tiles: hjkl spatial focus -------------------------------------------

function tiles(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-tile]')].filter((t) => t.offsetParent !== null);
}

let active: HTMLElement | null = null;
function activate(t: HTMLElement) {
  active?.classList.remove('is-active');
  active = t;
  t.classList.add('is-active');
  if (!t.hasAttribute('tabindex')) t.tabIndex = -1;
  t.focus({ preventScroll: true });
  t.scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

function move(dir: 'h' | 'j' | 'k' | 'l') {
  const all = tiles();
  if (!all.length) return;
  const cur = active && all.includes(active) ? active : null;
  if (!cur) return activate(all[0]);
  const a = cur.getBoundingClientRect();
  const ax = a.left + a.width / 2, ay = a.top + a.height / 2;
  let best: HTMLElement | null = null, bestD = Infinity;
  for (const t of all) {
    if (t === cur) continue;
    const b = t.getBoundingClientRect();
    const bx = b.left + b.width / 2, by = b.top + b.height / 2;
    const dx = bx - ax, dy = by - ay;
    const ok = dir === 'l' ? b.left >= a.right - 4
      : dir === 'h' ? b.right <= a.left + 4
      : dir === 'j' ? b.top >= a.bottom - 4
      : b.bottom <= a.top + 4;
    if (!ok) continue;
    // primary axis distance, heavily penalise drift on the other axis
    const d = dir === 'h' || dir === 'l' ? Math.abs(dx) + Math.abs(dy) * 2 : Math.abs(dy) + Math.abs(dx) * 2;
    if (d < bestD) { bestD = d; best = t; }
  }
  if (best) activate(best);
}

document.addEventListener('focusin', (e) => {
  const t = (e.target as HTMLElement).closest<HTMLElement>('[data-tile]');
  if (t && t !== active) { active?.classList.remove('is-active'); active = null; }
});

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
  if (e.key === 't') return cycleRice();
  if (WS[e.key]) { location.href = WS[e.key]; return; }
  if ('hjkl'.includes(e.key) && e.key.length === 1) { e.preventDefault(); return move(e.key as 'h'); }
  if (e.key === 'Enter' && active && el === active) {
    active.querySelector<HTMLAnchorElement>('[data-primary]')?.click();
  }
  if (e.key === 'Escape' && active) { active.classList.remove('is-active'); active.blur(); active = null; }
});

// --- cartridge tilt (fine pointer + motion allowed only) --------------------

if (matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)').matches) {
  document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((stage) => {
    const cart = stage.querySelector<HTMLElement>('.cart');
    if (!cart) return;
    let raf = 0;
    stage.parentElement?.addEventListener('pointermove', (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = stage.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        cart.style.setProperty('--ry', `${24 + x * 30}deg`);
        cart.style.setProperty('--rx', `${-16 - y * 22}deg`);
      });
    });
    stage.parentElement?.addEventListener('pointerleave', () => {
      cart.style.removeProperty('--ry');
      cart.style.removeProperty('--rx');
    });
  });
}

// `:print cv` lands on /cv/#print
if (location.hash === '#print') {
  history.replaceState(null, '', location.pathname);
  addEventListener('load', () => setTimeout(() => print(), 300), { once: true });
}
