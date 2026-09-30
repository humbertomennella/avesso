
-- AVESSO: mural de recados entre amigos

create table if not exists public.guestbook_entries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '',
  image_path text,
  created_at timestamptz not null default now(),
  constraint guestbook_entries_content_check check (
    length(btrim(body)) > 0 or image_path is not null
  ),
  constraint guestbook_entries_body_len_check check (char_length(body) <= 1200)
);

create index if not exists guestbook_entries_profile_time_idx
  on public.guestbook_entries(profile_id, created_at desc);

create index if not exists guestbook_entries_author_idx
  on public.guestbook_entries(author_id);

alter table public.guestbook_entries enable row level security;

drop policy if exists guestbook_entries_read on public.guestbook_entries;
create policy guestbook_entries_read
on public.guestbook_entries
for select
to authenticated
using (true);

drop policy if exists guestbook_entries_insert_friends on public.guestbook_entries;
create policy guestbook_entries_insert_friends
on public.guestbook_entries
for insert
to authenticated
with check (
  author_id = (select auth.uid())
  and profile_id <> author_id
  and exists (
    select 1
    from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = author_id and f.addressee_id = profile_id)
        or
        (f.addressee_id = author_id and f.requester_id = profile_id)
      )
  )
);

drop policy if exists guestbook_entries_delete_author_or_owner on public.guestbook_entries;
create policy guestbook_entries_delete_author_or_owner
on public.guestbook_entries
for delete
to authenticated
using (
  author_id = (select auth.uid())
  or profile_id = (select auth.uid())
);

grant select, insert, delete on public.guestbook_entries to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values (
  'avesso-recados',
  'avesso-recados',
  true,
  8388608,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update set
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists avesso_recados_read on storage.objects;
create policy avesso_recados_read
on storage.objects
for select
to public
using (bucket_id='avesso-recados');

drop policy if exists avesso_recados_insert_self on storage.objects;
create policy avesso_recados_insert_self
on storage.objects
for insert
to authenticated
with check (
  bucket_id='avesso-recados'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);

drop policy if exists avesso_recados_delete_self on storage.objects;
create policy avesso_recados_delete_self
on storage.objects
for delete
to authenticated
using (
  bucket_id='avesso-recados'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='guestbook_entries'
  ) then
    alter publication supabase_realtime add table public.guestbook_entries;
  end if;
end $$;
