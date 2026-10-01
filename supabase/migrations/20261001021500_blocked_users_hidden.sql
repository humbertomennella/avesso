-- Bloqueio deve remover o usuário do feed e dos stories, não só encerrar amizade/chat.

create or replace view public.feed_attention as
select
  p.id,
  p.author_id,
  p.recipient_id,
  p.body,
  p.image_url,
  p.visibility,
  p.created_at,
  p.edited_at,
  a.handle as author_handle,
  a.display_name as author_name,
  a.avatar_url as author_avatar,
  r.handle as recipient_handle,
  r.display_name as recipient_name,
  r.avatar_url as recipient_avatar,
  count(distinct rs.id)::integer as response_count,
  count(distinct ss.supporter_id)::integer as private_support_count,
  extract(epoch from now() - p.created_at) / 3600.0 /
    greatest(1::bigint, count(distinct rs.id) + 1)::numeric as attention_need
from public.posts p
join public.profiles a on a.id = p.author_id
left join public.profiles r on r.id = p.recipient_id
left join public.responses rs
  on rs.post_id = p.id
 and not public.is_blocked_pair(rs.author_id, (select auth.uid()))
left join public.support_signals ss
  on ss.post_id = p.id
 and not public.is_blocked_pair(ss.supporter_id, (select auth.uid()))
where p.visibility = 'publico'::public.post_visibility
  and not public.is_blocked_pair(p.author_id, (select auth.uid()))
  and (
    p.recipient_id is null
    or not public.is_blocked_pair(p.recipient_id, (select auth.uid()))
  )
group by p.id, a.id, r.id;

drop policy if exists stories_visible on public.stories;
create policy stories_visible on public.stories
for select to authenticated
using (
  expires_at > now()
  and not public.is_blocked_pair(author_id, (select auth.uid()))
  and (
    author_id = (select auth.uid())
    or visibility = 'publico'
    or (
      visibility = 'amigos'
      and exists (
        select 1
        from public.friendships f
        where f.status = 'accepted'
          and (
            (f.requester_id = author_id and f.addressee_id = (select auth.uid()))
            or
            (f.addressee_id = author_id and f.requester_id = (select auth.uid()))
          )
      )
    )
  )
);