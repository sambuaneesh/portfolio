// Tiny browser-side PostgREST client for the few things visitors write:
// contact messages, task requests, likes and comments. No supabase-js.

const VISITOR_KEY = 'portfolio_visitor_id';

/** A random id per browser that scopes anonymous like/comment ownership
 *  (RLS compares it to the x-visitor-id request header). */
export function visitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export interface Rest {
  get<T>(path: string): Promise<T>;
  insert(table: string, row: Record<string, unknown>): Promise<void>;
  remove(path: string): Promise<void>;
}

export function rest(url: string, key: string): Rest {
  const headers = () => ({
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    'x-visitor-id': visitorId(),
  });

  async function check(res: Response) {
    if (!res.ok) {
      let msg = `${res.status}`;
      try { const b = await res.json(); msg = b.message || b.error || msg; } catch { /* not json */ }
      throw Object.assign(new Error(msg), { status: res.status });
    }
  }

  return {
    async get<T>(path: string) {
      const res = await fetch(`${url}/rest/v1/${path}`, { headers: headers() });
      await check(res);
      return res.json() as Promise<T>;
    },
    async insert(table, row) {
      const res = await fetch(`${url}/rest/v1/${table}`, {
        method: 'POST',
        headers: { ...headers(), Prefer: 'return=minimal' },
        body: JSON.stringify(row),
      });
      await check(res);
    },
    async remove(path) {
      const res = await fetch(`${url}/rest/v1/${path}`, { method: 'DELETE', headers: { ...headers(), Prefer: 'return=minimal' } });
      await check(res);
    },
  };
}
