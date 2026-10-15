import { rest, visitorId } from './rest';

interface Comment {
  id: string;
  parent_comment_id: string | null;
  author_name: string;
  content: string;
  visitor_id: string | null;
  created_at: string;
}

const fmt = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export function mountEngagement(root: HTMLElement) {
  const postId = root.dataset.post!;
  const db = rest(root.dataset.url!, root.dataset.key!);
  const me = visitorId();

  // --- like ---------------------------------------------------------------
  // The database enforces one like per visitor. Counts show only once the
  // likes table is publicly readable (see the likes_public_count migration);
  // until then this browser just remembers its own like.
  const likeBtn = root.querySelector<HTMLButtonElement>('[data-like]')!;
  const likeLabel = root.querySelector<HTMLElement>('[data-like-label]')!;
  const likeKey = `as-liked:${postId}`;
  const setLiked = (v: boolean) => {
    likeBtn.setAttribute('aria-pressed', String(v));
    likeLabel.textContent = v ? 'Liked' : 'Like';
    try { v ? localStorage.setItem(likeKey, '1') : localStorage.removeItem(likeKey); } catch { /* ignore */ }
  };
  let liked = false;
  let likes = 0;
  const likeCount = document.createElement('span');
  likeCount.className = 'label';
  likeBtn.after(likeCount);
  const drawCount = () => (likeCount.textContent = likes > 0 ? `${likes} ${likes === 1 ? 'like' : 'likes'}` : '');
  try { liked = localStorage.getItem(likeKey) === '1'; } catch { /* ignore */ }
  setLiked(liked);
  db.get<{ visitor_id: string }[]>(`aneesh_blog_likes?select=visitor_id&blog_post_id=eq.${postId}`)
    .then((rows) => {
      likes = rows.length;
      if (rows.length) setLiked((liked = rows.some((r) => r.visitor_id === me)));
      drawCount();
    })
    .catch(() => {});

  likeBtn.addEventListener('click', async () => {
    likeBtn.disabled = true;
    try {
      if (liked) {
        await db.remove(`aneesh_blog_likes?blog_post_id=eq.${postId}&visitor_id=eq.${me}`);
        liked = false;
        likes = Math.max(0, likes - 1);
      } else {
        try {
          await db.insert('aneesh_blog_likes', { blog_post_id: postId, visitor_id: me });
        } catch (e) {
          if ((e as { status?: number }).status !== 409) throw e; // already liked
        }
        liked = true;
        likes += 1;
      }
      setLiked(liked);
      drawCount();
    } catch {
      likeLabel.textContent = 'Try again';
    } finally {
      likeBtn.disabled = false;
    }
  });

  // --- comments ---------------------------------------------------------
  const list = root.querySelector<HTMLOListElement>('[data-comments]')!;
  const count = root.querySelector<HTMLElement>('[data-count]')!;
  const form = root.querySelector<HTMLFormElement>('[data-cform]')!;
  const status = root.querySelector<HTMLElement>('[data-status]')!;
  const replying = root.querySelector<HTMLElement>('[data-replying]')!;
  const cancelReply = root.querySelector<HTMLButtonElement>('[data-cancel-reply]')!;
  let replyTo: Comment | null = null;

  function setReply(c: Comment | null) {
    replyTo = c;
    replying.hidden = cancelReply.hidden = !c;
    if (c) {
      replying.textContent = `replying to ${c.author_name}`;
      form.querySelector<HTMLTextAreaElement>('textarea')?.focus();
    }
  }
  cancelReply.addEventListener('click', () => setReply(null));

  function node(c: Comment, all: Comment[]): HTMLLIElement {
    const li = document.createElement('li');
    li.className = 'c';
    const head = document.createElement('div');
    head.className = 'c__head';
    const name = document.createElement('b');
    name.textContent = c.author_name;
    const when = document.createElement('time');
    when.dateTime = c.created_at;
    when.textContent = fmt.format(new Date(c.created_at));
    head.append(name, when);
    const body = document.createElement('p');
    body.className = 'c__body';
    body.textContent = c.content;
    const act = document.createElement('div');
    act.className = 'c__act';
    if (!c.parent_comment_id) {
      const r = document.createElement('button');
      r.type = 'button';
      r.textContent = 'reply';
      r.addEventListener('click', () => setReply(c));
      act.append(r);
    }
    if (c.visitor_id === me) {
      const d = document.createElement('button');
      d.type = 'button';
      d.textContent = 'delete';
      d.addEventListener('click', async () => {
        if (!confirm('Delete your comment?')) return;
        await db.remove(`aneesh_blog_comments?id=eq.${c.id}`).catch(() => alert('Could not delete.'));
        load();
      });
      act.append(d);
    }
    li.append(head, body, act);
    const kids = all.filter((k) => k.parent_comment_id === c.id);
    if (kids.length) {
      const ol = document.createElement('ol');
      ol.className = 'comments';
      ol.append(...kids.map((k) => node(k, all)));
      li.append(ol);
    }
    return li;
  }

  async function load() {
    try {
      const all = await db.get<Comment[]>(
        `aneesh_blog_comments?select=id,parent_comment_id,author_name,content,visitor_id,created_at&blog_post_id=eq.${postId}&is_approved=eq.true&order=created_at.asc`,
      );
      count.textContent = all.length ? `(${all.length})` : '';
      const top = all.filter((c) => !c.parent_comment_id);
      if (!top.length) {
        const li = document.createElement('li');
        li.className = 'muted';
        li.textContent = 'No comments yet. Be the first.';
        list.replaceChildren(li);
      } else {
        list.replaceChildren(...top.map((c) => node(c, all)));
      }
    } catch {
      list.innerHTML = '<li class="muted">Comments could not be loaded.</li>';
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    if (data.get('website')) return; // honeypot
    const btn = form.querySelector<HTMLButtonElement>('[type=submit]')!;
    btn.disabled = true;
    status.hidden = true;
    try {
      await db.insert('aneesh_blog_comments', {
        blog_post_id: postId,
        parent_comment_id: replyTo?.id ?? null,
        author_name: String(data.get('author_name')).trim(),
        author_email: String(data.get('author_email') || '').trim() || null,
        content: String(data.get('content')).trim(),
        visitor_id: me,
      });
      form.reset();
      setReply(null);
      status.dataset.kind = 'ok';
      status.textContent = 'Posted.';
      load();
    } catch {
      status.dataset.kind = 'err';
      status.textContent = 'Could not post the comment. Please try again.';
    } finally {
      status.hidden = false;
      btn.disabled = false;
    }
  });

  load();
}
