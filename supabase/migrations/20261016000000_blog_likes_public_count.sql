-- Lets visitors read like rows (only blog_post_id/visitor_id exist, no PII)
-- so posts can show a like count. Without this the likes table is
-- write-only for the anon key.
drop policy if exists "Aneesh blog likes are countable" on public.aneesh_blog_likes;
create policy "Aneesh blog likes are countable"
  on public.aneesh_blog_likes for select using (true);
