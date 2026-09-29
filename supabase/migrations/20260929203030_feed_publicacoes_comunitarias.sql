-- Permitir publicações para a comunidade sem exigir @.
-- Mensagens privadas continuam exigindo destinatário; RLS permanece habilitada.
alter table public.posts
  alter column recipient_id drop not null;

alter table public.posts
  add constraint posts_target_visibility_check
  check (
    (recipient_id is null and visibility = 'publico'::public.post_visibility)
    or (recipient_id is not null and author_id <> recipient_id)
  );

alter policy posts_author_insert on public.posts
  with check (
    (select auth.uid()) = author_id
    and (recipient_id is null or author_id <> recipient_id)
    and (visibility = 'publico'::public.post_visibility or recipient_id is not null)
  );

alter policy posts_author_update on public.posts
  with check (
    (select auth.uid()) = author_id
    and (recipient_id is null or author_id <> recipient_id)
    and (visibility = 'publico'::public.post_visibility or recipient_id is not null)
  );

create or replace view public.feed_attention
with (security_invoker = true) as
select
  p.id,p.author_id,p.recipient_id,p.body,p.visibility,p.created_at,p.edited_at,
  a.handle as author_handle,a.display_name as author_name,a.avatar_url as author_avatar,
  r.handle as recipient_handle,r.display_name as recipient_name,r.avatar_url as recipient_avatar,
  count(distinct rs.id)::int as response_count,
  count(distinct ss.supporter_id)::int as private_support_count,
  (extract(epoch from(now()-p.created_at))/3600.0) /
    greatest(1,count(distinct rs.id)+1) as attention_need
from public.posts p
join public.profiles a on a.id=p.author_id
left join public.profiles r on r.id=p.recipient_id
left join public.responses rs on rs.post_id=p.id
left join public.support_signals ss on ss.post_id=p.id
where p.visibility='publico'::public.post_visibility
group by p.id,a.id,r.id;
