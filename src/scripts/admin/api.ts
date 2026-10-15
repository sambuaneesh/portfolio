// Client for the `admin` Supabase Edge Function (supabase/functions/admin):
// login, every authenticated write, admin-only reads, uploads and the
// "publish" (rebuild) trigger. Same contract as the previous site.

const TOKEN_KEY = 'admin_token';

export interface Session { sub: string; username: string; role: string; iat: number; exp: number }

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function setToken(t: string) { localStorage.setItem(TOKEN_KEY, t); }
export function clearToken() { try { localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ } }

/** Decodes (does not verify) the token for UI state; the function verifies it on every call. */
export function session(): Session | null {
  const t = getToken();
  if (!t) return null;
  try {
    const p = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) as Session;
    return p.exp * 1000 > Date.now() ? p : null;
  } catch {
    return null;
  }
}

export class AuthError extends Error {}

export function createApi(supabaseUrl: string, anonKey: string) {
  const fn = `${supabaseUrl}/functions/v1/admin`;

  async function call(path: string, init: RequestInit = {}) {
    const token = getToken();
    const res = await fetch(`${fn}${path}`, {
      ...init,
      headers: { ...(init.headers || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (res.status === 401 && path !== '/login') {
      clearToken();
      throw new AuthError('Your session expired. Sign in again.');
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(body.error || `Request failed (${res.status})`), { status: res.status });
    return body;
  }

  const data = async (operation: string, table: string, extra: Record<string, unknown> = {}) =>
    (await call('/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ table, operation, ...extra }),
    })).data;

  return {
    async login(username: string, password: string) {
      const { token } = await call('/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      setToken(token);
    },
    /** Public rows through the anon key (what visitors see). */
    async publicSelect<T>(table: string, order: string): Promise<T[]> {
      const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=*&order=${order}`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      });
      if (!res.ok) throw new Error(`Could not read ${table} (${res.status})`);
      return res.json();
    },
    /** Admin-only rows (drafts, inbox) through the gateway. */
    adminSelect: <T>(table: string): Promise<T[]> => data('select', table),
    insert: (table: string, payload: unknown) => data('insert', table, { payload }),
    update: (table: string, id: string, payload: unknown, idColumn = 'id') => data('update', table, { id, payload, idColumn }),
    upsert: (table: string, payload: unknown, idColumn = 'id') => data('upsert', table, { payload, idColumn }),
    remove: (table: string, id: string, idColumn = 'id') => data('delete', table, { id, idColumn }),
    async upload(file: File): Promise<string> {
      const safe = file.name.replace(/[^\w.-]+/g, '-');
      const res = await call('/upload', {
        method: 'POST',
        headers: {
          'x-file-type': file.type.startsWith('image/') ? 'images' : 'documents',
          'x-file-name': `${crypto.randomUUID()}-${safe}`,
          'Content-Type': 'application/octet-stream',
        },
        body: await file.arrayBuffer(),
      });
      return res.url as string;
    },
    /** Ask GitHub Actions to rebuild + redeploy the static site. */
    rebuild: () => call('/rebuild', { method: 'POST' }),
  };
}

export type Api = ReturnType<typeof createApi>;
