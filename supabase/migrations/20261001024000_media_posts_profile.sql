-- AVESSO: mídia em feed/perfil e bucket público de áudio/vídeo.

alter table public.posts
  add column if not exists media_url text,
  add column if not exists media_kind text;

alter table public.posts
  drop constraint if exists posts_media_kind_check;

alter table public.posts
  add constraint posts_media_kind_check
  check (media_kind is null or media_kind in ('audio','video'));

create table if not exists public.profile_media (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_url text not null,
  storage_path text not null,
  media_kind text not null check (media_kind in ('audio','video')),
  caption text not null default '' check (char_length(caption) <= 420),
  created_at timestamptz not null default now()
);

create index if not exists profile_media_user_time_idx
  on public.profile_media(user_id,created_at desc);

alter table public.profile_media enable row level security;

drop policy if exists profile_media_read on public.profile_media;
create policy profile_media_read on public.profile_media
for select to authenticated
using (not public.is_blocked_pair(user_id,(select auth.uid())));

drop policy if exists profile_media_insert_self on public.profile_media;
create policy profile_media_insert_self on public.profile_media
for insert to authenticated
with check (user_id=(select auth.uid()));

drop policy if exists profile_media_delete_self on public.profile_media;
create policy profile_media_delete_self on public.profile_media
for delete to authenticated
using (user_id=(select auth.uid()));

grant select,insert,delete on public.profile_media to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values (
  'avesso-media','avesso-media',true,52428800,
  array[
    'audio/mpeg','audio/mp4','audio/x-m4a','audio/aac','audio/ogg','audio/wav','audio/x-wav','audio/webm',
    'video/mp4','video/webm','video/quicktime'
  ]
)
on conflict (id) do update
set public=true,
    file_size_limit=excluded.file_size_limit,
    allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists avesso_media_upload_self on storage.objects;
create policy avesso_media_upload_self on storage.objects
for insert to authenticated
with check (
  bucket_id='avesso-media'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);

drop policy if exists avesso_media_delete_self on storage.objects;
create policy avesso_media_delete_self on storage.objects
for delete to authenticated
using (
  bucket_id='avesso-media'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);

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
  extract(epoch from now()-p.created_at)/3600.0/
    greatest(1::bigint,count(distinct rs.id)+1)::numeric as attention_need,
  p.media_url,
  p.media_kind
from public.posts p
join public.profiles a on a.id=p.author_id
left join public.profiles r on r.id=p.recipient_id
left join public.responses rs
  on rs.post_id=p.id
 and not public.is_blocked_pair(rs.author_id,(select auth.uid()))
left join public.support_signals ss
  on ss.post_id=p.id
 and not public.is_blocked_pair(ss.supporter_id,(select auth.uid()))
where p.visibility='publico'::public.post_visibility
  and not public.is_blocked_pair(p.author_id,(select auth.uid()))
  and (
    p.recipient_id is null
    or not public.is_blocked_pair(p.recipient_id,(select auth.uid()))
  )
group by p.id,a.id,r.id;

alter view public.feed_attention set (security_invoker=true);
