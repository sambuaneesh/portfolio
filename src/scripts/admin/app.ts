import { createApi, session, clearToken, AuthError, type Api } from './api';
import { TABLES, type TableCfg, type Field, type Row } from './schema';

// Tiny DOM helper: h('div', { class: 'x', onclick: fn }, child, 'text')
type Attrs = Record<string, unknown>;
function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Attrs = {}, ...kids: (Node | string | null | undefined | false)[]) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
    else if (k === 'class') el.className = String(v);
    else if (k in el && k !== 'list' && k !== 'form') (el as unknown as Record<string, unknown>)[k] = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  el.append(...kids.filter((k): k is Node | string => k != null && k !== false));
  return el;
}

const DIRTY = 'as-admin-dirty';

export function mountAdmin(root: HTMLElement) {
  const api = createApi(root.dataset.url!, root.dataset.key!);
  const actionsUrl = root.dataset.actions!;
  const view = root.querySelector<HTMLElement>('[data-view]')!;

  if (!session()) return renderLogin();
  renderConsole();

  // --- login --------------------------------------------------------------

  function renderLogin() {
    const status = h('p', { class: 'notice', hidden: true, role: 'status' });
    const form = h('form', { class: 'login' },
      h('h1', { class: 'h-page' }, root.dataset.title || 'Admin'),
      h('p', { class: 'muted' }, root.dataset.desc || ''),
      h('label', { class: 'field' }, h('span', {}, 'username'), h('input', { class: 'input', name: 'username', autocomplete: 'username', required: true })),
      h('label', { class: 'field' }, h('span', {}, 'password'), h('input', { class: 'input', name: 'password', type: 'password', autocomplete: 'current-password', required: true })),
      h('div', { class: 'btns' }, h('button', { class: 'btn btn--hot', type: 'submit' }, 'Sign in →')),
      status,
    );
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const btn = form.querySelector('button')!;
      btn.disabled = true;
      try {
        await api.login(String(fd.get('username')), String(fd.get('password')));
        renderConsole();
      } catch (err) {
        status.hidden = false;
        status.dataset.kind = 'err';
        status.textContent = (err as Error).message === 'Invalid credentials' ? 'Wrong username or password.' : (err as Error).message;
      } finally {
        btn.disabled = false;
      }
    });
    view.replaceChildren(h('div', { class: 'win login-win' }, h('div', { class: 'win__bar' }, h('span', { class: 'win__title' }, 'login'), ), h('div', { class: 'win__body' }, form)));
    form.querySelector('input')?.focus();
  }

  // --- console ----------------------------------------------------------------

  function renderConsole() {
    const s = session()!;
    const side = h('nav', { class: 'side', 'aria-label': 'Tables' });
    const main = h('div', { class: 'main' });
    const publishStatus = h('span', { class: 'label', 'data-pub': true });
    const publishBtn = h('button', { class: 'btn btn--hot', type: 'button', onclick: publish }, 'Publish site');

    const groups: Record<string, string> = { content: 'content', writing: 'writing', inbox: 'inbox', site: 'site' };
    for (const [g, label] of Object.entries(groups)) {
      side.append(h('p', { class: 'label side__g' }, label));
      for (const t of TABLES.filter((x) => x.group === g)) {
        side.append(h('a', { href: `#${t.key}`, class: 'side__link', 'data-key': t.key }, t.label));
      }
    }

    const top = h('div', { class: 'win topbar' },
      h('div', { class: 'win__bar' }, h('span', { class: 'win__title' }, 'admin'), h('span', { class: 'win__meta' }, `session: ${s.username} · expires ${new Date(s.exp * 1000).toLocaleDateString()}`)),
      h('div', { class: 'win__body topbar__body' },
        h('div', { class: 'pub' }, publishBtn, publishStatus),
        h('div', { class: 'btns' },
          h('a', { class: 'btn', href: actionsUrl, target: '_blank', rel: 'noopener' }, 'Deploys ↗'),
          h('button', { class: 'btn', type: 'button', onclick: () => { clearToken(); renderLogin(); } }, 'Sign out'),
        ),
      ),
    );

    view.replaceChildren(top, h('div', { class: 'console' }, h('div', { class: 'win' }, h('div', { class: 'win__bar' }, h('span', { class: 'win__title' }, 'tables')), h('div', { class: 'win__body' }, side)), main));
    refreshDirty();

    const route = () => {
      const key = location.hash.slice(1) || 'personal';
      const cfg = TABLES.find((t) => t.key === key) ?? TABLES[0];
      side.querySelectorAll<HTMLElement>('.side__link').forEach((a) => a.setAttribute('aria-current', String(a.dataset.key === cfg.key)));
      renderTable(cfg, main);
    };
    window.onhashchange = route;
    route();

    function refreshDirty() {
      let dirty = false;
      try { dirty = localStorage.getItem(DIRTY) === '1'; } catch { /* ignore */ }
      publishStatus.textContent = dirty ? '● unpublished changes' : 'site is up to date';
      publishBtn.toggleAttribute('data-dirty', dirty);
    }
    root.addEventListener('admin:dirty', refreshDirty);

    async function publish() {
      publishBtn.disabled = true;
      publishStatus.textContent = 'requesting rebuild…';
      try {
        await api.rebuild();
        try { localStorage.removeItem(DIRTY); } catch { /* ignore */ }
        publishStatus.textContent = 'rebuild started · live in ~1-2 min';
      } catch (err) {
        if (err instanceof AuthError) return renderLogin();
        const st = (err as { status?: number }).status;
        publishStatus.textContent = st === 404 || st === 501
          ? 'publish endpoint not set up yet: use "Deploys ↗" → Run workflow (or wait for the 6-hourly rebuild)'
          : `publish failed: ${(err as Error).message}`;
      } finally {
        publishBtn.disabled = false;
      }
    }
  }

  // --- table list ---------------------------------------------------------------

  async function load(cfg: TableCfg): Promise<Row[]> {
    if (cfg.adminRead) {
      try {
        return await api.adminSelect<Row>(cfg.table);
      } catch (err) {
        if (err instanceof AuthError) throw err;
        // older gateway without this table in its readable list: public view
        if ((err as { status?: number }).status !== 400) throw err;
      }
    }
    return api.publicSelect<Row>(cfg.table, cfg.order);
  }

  type Extras = Record<string, Record<string, unknown>>;
  async function loadExtras(key: string): Promise<Extras> {
    const rows = await api.publicSelect<Row>('aneesh_site_settings', 'key.asc');
    return ((rows.find((r) => r.key === key)?.value as Extras | undefined) ?? {});
  }

  async function renderTable(cfg: TableCfg, main: HTMLElement) {
    const body = h('div', { class: 'win__body' }, h('p', { class: 'muted' }, 'loading…'));
    const newBtn = cfg.single || cfg.noCreate ? null : h('button', { class: 'btn', type: 'button', onclick: () => renderForm(cfg, main, null) }, '+ new');
    main.replaceChildren(h('section', { class: 'win' },
      h('div', { class: 'win__bar' }, h('span', { class: 'win__title' }, cfg.label), h('span', { class: 'win__meta' }, cfg.table)),
      body,
    ));

    let rows: Row[];
    try {
      rows = await load(cfg);
    } catch (err) {
      if (err instanceof AuthError) return renderLogin();
      body.replaceChildren(h('p', { class: 'notice', 'data-kind': 'err' }, (err as Error).message));
      return;
    }

    if (cfg.settings) return renderSettings(cfg, main, rows);
    if (cfg.single) return renderForm(cfg, main, rows[0] ?? null);

    const filter = h('input', { class: 'input', type: 'search', placeholder: `filter ${rows.length} rows…`, 'aria-label': 'Filter rows' }) as HTMLInputElement;
    const list = h('ul', { class: 'rows' });
    const draw = () => {
      const q = filter.value.toLowerCase();
      list.replaceChildren(...rows
        .filter((r) => !q || JSON.stringify(r).toLowerCase().includes(q))
        .map((r) => h('li', {},
          h('button', { class: 'row', type: 'button', onclick: () => renderForm(cfg, main, r) },
            h('strong', {}, cfg.title(r) || '(untitled)'),
            cfg.sub ? h('span', { class: 'muted mono' }, cfg.sub(r)) : null,
          ),
        )));
      if (!list.children.length) list.append(h('li', { class: 'muted' }, 'nothing here'));
    };
    filter.addEventListener('input', draw);
    draw();
    body.replaceChildren(h('div', { class: 'toolbar' }, filter, newBtn), list);
  }

  // --- form -----------------------------------------------------------------

  async function renderForm(cfg: TableCfg, main: HTMLElement, row: Row | null) {
    const idCol = cfg.idColumn ?? 'id';
    const isNew = !row;
    const status = h('p', { class: 'notice', hidden: true, role: 'status' });
    const getters: Record<string, () => unknown> = {};

    const form = h('form', { class: 'edit', novalidate: true });
    const fields = cfg.fields;
    const extraKeys = [...new Set(fields.map((f) => f.extra).filter(Boolean) as string[])];
    const extras: Record<string, Extras> = {};
    try {
      for (const k of extraKeys) extras[k] = await loadExtras(k);
    } catch { /* fields fall back to defaults */ }
    for (const f of fields) {
      const stored = f.extra ? extras[f.extra]?.[String(row?.[idCol] ?? '')]?.[f.k] : row?.[f.k];
      const { node, get } = fieldInput(f, stored ?? f.def, api, cfg, isNew);
      getters[f.k] = get;
      form.append(node);
    }

    const save = h('button', { class: 'btn btn--hot', type: 'submit' }, isNew ? 'Create' : 'Save');
    const back = cfg.single ? null : h('button', { class: 'btn', type: 'button', onclick: () => renderTable(cfg, main) }, '← back');
    const del = isNew || cfg.single ? null : h('button', {
      class: 'btn danger', type: 'button', onclick: async () => {
        if (!confirm(`Delete "${cfg.title(row!)}"? This cannot be undone.`)) return;
        try {
          await api.remove(cfg.table, String(row![idCol]), idCol);
          markDirty(cfg);
          renderTable(cfg, main);
        } catch (err) { fail(err); }
      },
    }, 'Delete');
    form.append(h('div', { class: 'btns' }, save, back, del), status);

    function fail(err: unknown) {
      if (err instanceof AuthError) return renderLogin();
      status.hidden = false;
      status.dataset.kind = 'err';
      status.textContent = (err as Error).message;
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload: Row = {};
      const extraVals: Record<string, Row> = {};
      try {
        for (const f of fields) {
          const v = getters[f.k]();
          if (f.required && (v == null || v === '')) throw new Error(`"${f.label ?? f.k}" is required`);
          if (f.extra) (extraVals[f.extra] ??= {})[f.k] = v;
          else payload[f.k] = v;
        }
      } catch (err) {
        return fail(err);
      }
      save.disabled = true;
      try {
        let saved: Row | undefined;
        if (cfg.idColumn && cfg.idColumn !== 'id') saved = await api.upsert(cfg.table, payload, idCol);
        else if (isNew) saved = await api.insert(cfg.table, payload);
        else saved = await api.update(cfg.table, String(row![idCol]), payload, idCol);
        const id = String(saved?.[idCol] ?? row?.[idCol] ?? '');
        for (const [key, vals] of Object.entries(extraVals)) {
          if (!id) break;
          const map = await loadExtras(key); // re-read: never clobber other rows' extras
          map[id] = vals;
          await api.upsert('aneesh_site_settings', { key, value: map }, 'key');
        }
        markDirty(cfg);
        status.hidden = false;
        status.dataset.kind = 'ok';
        status.textContent = 'Saved. Press "Publish site" when you are done editing.';
        if (isNew) setTimeout(() => renderTable(cfg, main), 600);
      } catch (err) {
        fail(err);
      } finally {
        save.disabled = false;
      }
    });

    main.replaceChildren(h('section', { class: 'win' },
      h('div', { class: 'win__bar' }, h('span', { class: 'win__title' }, `${cfg.label} · ${isNew ? 'new' : 'edit'}`), h('span', { class: 'win__meta' }, row ? String(row[idCol] ?? '') : cfg.table)),
      h('div', { class: 'win__body' }, form),
    ));
    form.querySelector<HTMLElement>('input, textarea, select')?.focus();
  }

  /** A form whose fields are individual site_settings keys. */
  function renderSettings(cfg: TableCfg, main: HTMLElement, rows: Row[]) {
    const current = new Map(rows.map((r) => [String(r.key), r.value]));
    const status = h('p', { class: 'notice', hidden: true, role: 'status' });
    const getters: Record<string, () => unknown> = {};
    const form = h('form', { class: 'edit', novalidate: true });
    for (const f of cfg.fields) {
      const { node, get } = fieldInput(f, current.get(f.k) ?? f.def, api, cfg, false);
      getters[f.k] = get;
      form.append(node);
    }
    const save = h('button', { class: 'btn btn--hot', type: 'submit' }, 'Save');
    // Preview: open the site with this theme without saving or publishing.
    const preview = getters.theme
      ? h('button', {
        class: 'btn', type: 'button',
        onclick: () => window.open(`${location.pathname.replace(/admin\/?$/, '')}?preview=${encodeURIComponent(String(getters.theme()))}`, '_blank', 'noopener'),
      }, 'Preview theme ↗')
      : null;
    form.append(h('div', { class: 'btns' }, save, preview), status);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      save.disabled = true;
      try {
        for (const f of cfg.fields) {
          const v = getters[f.k]();
          if (JSON.stringify(v) === JSON.stringify(current.get(f.k))) continue;
          await api.upsert('aneesh_site_settings', { key: f.k, value: v ?? f.def }, 'key');
          current.set(f.k, v);
        }
        markDirty(cfg);
        status.hidden = false;
        status.dataset.kind = 'ok';
        status.textContent = 'Saved. Press "Publish site" to apply it to the live site.';
      } catch (err) {
        if (err instanceof AuthError) return renderLogin();
        status.hidden = false;
        status.dataset.kind = 'err';
        status.textContent = (err as Error).message;
      } finally {
        save.disabled = false;
      }
    });
    main.replaceChildren(h('section', { class: 'win' },
      h('div', { class: 'win__bar' }, h('span', { class: 'win__title' }, cfg.label)),
      h('div', { class: 'win__body' }, form),
    ));
  }

  function markDirty(cfg: TableCfg) {
    // Inbox changes don't affect the public site.
    if (cfg.group === 'inbox') return;
    try { localStorage.setItem(DIRTY, '1'); } catch { /* ignore */ }
    root.dispatchEvent(new Event('admin:dirty'));
  }
}

// --- field widgets ------------------------------------------------------------

function fieldInput(f: Field, value: unknown, api: Api, cfg: TableCfg, isNew: boolean): { node: HTMLElement; get: () => unknown } {
  const label = f.label ?? f.k.replace(/_/g, ' ');
  const wrap = (input: HTMLElement, extra?: HTMLElement | null) =>
    h('label', { class: `field field--${f.type}` },
      h('span', {}, `${label}${f.required ? ' *' : ''}`),
      input,
      extra ?? null,
      f.help ? h('small', { class: 'muted help' }, f.help) : null,
    );

  const str = (v: unknown) => (v == null ? '' : String(v));
  const nullable = (v: string) => (v.trim() === '' ? null : v.trim());

  switch (f.type) {
    case 'textarea':
    case 'markdown': {
      const ta = h('textarea', { class: `input${f.type === 'markdown' ? ' mono md' : ''}`, value: str(value), rows: f.type === 'markdown' ? 22 : 4 }) as HTMLTextAreaElement;
      return { node: wrap(ta), get: () => (f.type === 'markdown' ? ta.value : nullable(ta.value)) };
    }
    case 'number': {
      const inp = h('input', { class: 'input', type: 'number', value: str(value), min: f.min, max: f.max, step: 1 }) as HTMLInputElement;
      return { node: wrap(inp), get: () => (inp.value === '' ? null : Number(inp.value)) };
    }
    case 'bool': {
      const cb = h('input', { type: 'checkbox', checked: !!value }) as HTMLInputElement;
      return {
        node: h('label', { class: 'field field--bool' }, cb, h('span', {}, label), f.help ? h('small', { class: 'muted help' }, f.help) : null),
        get: () => cb.checked,
      };
    }
    case 'list': {
      const ta = h('textarea', { class: 'input', rows: 4, value: Array.isArray(value) ? value.join('\n') : '' }) as HTMLTextAreaElement;
      return {
        node: wrap(ta),
        get: () => {
          const items = ta.value.split('\n').map((s) => s.trim()).filter(Boolean);
          return items.length ? items : null;
        },
      };
    }
    case 'json': {
      const ta = h('textarea', { class: 'input mono', rows: 10, value: value === undefined ? '' : JSON.stringify(value, null, 2) }) as HTMLTextAreaElement;
      return {
        node: wrap(ta),
        get: () => {
          if (ta.value.trim() === '') return null;
          try { return JSON.parse(ta.value); } catch { throw new Error(`"${label}" is not valid JSON`); }
        },
      };
    }
    case 'select': {
      const sel = h('select', { class: 'input' }, ...(f.options ?? []).map((o) => h('option', { value: o, selected: o === value }, o))) as HTMLSelectElement;
      return { node: wrap(sel), get: () => sel.value };
    }
    case 'color': {
      const txt = h('input', { class: 'input mono', value: str(value), placeholder: '#3572A5' }) as HTMLInputElement;
      const pick = h('input', { type: 'color', value: /^#[0-9a-f]{6}$/i.test(str(value)) ? str(value) : '#888888', 'aria-label': `${label} picker` }) as HTMLInputElement;
      pick.addEventListener('input', () => (txt.value = pick.value));
      return { node: wrap(h('div', { class: 'pair' }, txt, pick)), get: () => nullable(txt.value) };
    }
    case 'image':
    case 'images': {
      const multi = f.type === 'images';
      const ta = h(multi ? 'textarea' : 'input', { class: 'input mono', rows: 3, value: multi ? (Array.isArray(value) ? value.join('\n') : '') : str(value), placeholder: 'https://…' }) as HTMLInputElement;
      const preview = h('div', { class: 'thumbs' });
      const drawPreview = () => preview.replaceChildren(...ta.value.split('\n').map((s) => s.trim()).filter(Boolean).map((src) => h('img', { src, alt: '', loading: 'lazy' })));
      const file = h('input', { type: 'file', accept: 'image/*', class: 'sr-only' }) as HTMLInputElement;
      const up = h('button', { class: 'btn', type: 'button', onclick: () => file.click() }, multi ? '+ upload' : 'upload');
      file.addEventListener('change', async () => {
        const f0 = file.files?.[0];
        if (!f0) return;
        up.textContent = 'uploading…';
        up.toggleAttribute('disabled', true);
        try {
          const url = await api.upload(f0);
          ta.value = multi ? [ta.value.trim(), url].filter(Boolean).join('\n') : url;
          drawPreview();
        } catch (err) {
          alert(`Upload failed: ${(err as Error).message}`);
        } finally {
          up.textContent = multi ? '+ upload' : 'upload';
          up.toggleAttribute('disabled', false);
          file.value = '';
        }
      });
      ta.addEventListener('change', drawPreview);
      drawPreview();
      return {
        node: wrap(h('div', { class: 'imgfield' }, ta, h('div', { class: 'btns' }, up, file), preview)),
        get: () => {
          const items = ta.value.split('\n').map((s) => s.trim()).filter(Boolean);
          return multi ? (items.length ? items : null) : (items[0] ?? null);
        },
      };
    }
    default: {
      const typeAttr = f.type === 'url' ? 'url' : f.type === 'email' ? 'email' : f.type === 'date' ? 'date' : 'text';
      const readonly = cfg.idColumn === f.k && !isNew;
      const inp = h('input', { class: 'input', type: typeAttr, value: str(value), readOnly: readonly }) as HTMLInputElement;
      return { node: wrap(inp), get: () => nullable(inp.value) };
    }
  }
}
