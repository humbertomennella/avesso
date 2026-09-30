
-- AVESSO: presença, MSN social, anexos e álbum

alter table public.profiles
  add column if not exists presence_mode text not null default 'online',
  add column if not exists last_seen timestamptz not null default now();

alter table public.profiles drop constraint if exists profiles_presence_mode_check;
alter table public.profiles add constraint profiles_presence_mode_check
check (presence_mode in ('online','away','invisible'));

alter table public.direct_messages
  add column if not exists message_kind text not null default 'text',
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text,
  add column if not exists attachment_size bigint;

alter table public.direct_messages drop constraint if exists direct_messages_message_kind_check;
alter table public.direct_messages add constraint direct_messages_message_kind_check
check (message_kind in ('text','image','file','attention'));

create table if not exists public.profile_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  caption text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists profile_photos_user_time_idx on public.profile_photos(user_id,created_at desc);
alter table public.profile_photos enable row level security;

drop policy if exists profile_photos_read on public.profile_photos;
create policy profile_photos_read on public.profile_photos
for select to authenticated using (true);

drop policy if exists profile_photos_insert_self on public.profile_photos;
create policy profile_photos_insert_self on public.profile_photos
for insert to authenticated with check (user_id=(select auth.uid()));

drop policy if exists profile_photos_update_self on public.profile_photos;
create policy profile_photos_update_self on public.profile_photos
for update to authenticated using (user_id=(select auth.uid()))
with check (user_id=(select auth.uid()));

drop policy if exists profile_photos_delete_self on public.profile_photos;
create policy profile_photos_delete_self on public.profile_photos
for delete to authenticated using (user_id=(select auth.uid()));

grant select,insert,update,delete on public.profile_photos to authenticated;

create table if not exists public.photo_reactions (
  photo_id uuid not null references public.profile_photos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in ('nao_foi_horrivel','eu_vi','pixel_aprovado','quase_arte')),
  created_at timestamptz not null default now(),
  primary key (photo_id,user_id)
);
create index if not exists photo_reactions_photo_idx on public.photo_reactions(photo_id,reaction);
alter table public.photo_reactions enable row level security;

drop policy if exists photo_reactions_read on public.photo_reactions;
create policy photo_reactions_read on public.photo_reactions for select to authenticated using (true);
drop policy if exists photo_reactions_insert_self on public.photo_reactions;
create policy photo_reactions_insert_self on public.photo_reactions
for insert to authenticated with check (user_id=(select auth.uid()));
drop policy if exists photo_reactions_update_self on public.photo_reactions;
create policy photo_reactions_update_self on public.photo_reactions
for update to authenticated using (user_id=(select auth.uid()))
with check (user_id=(select auth.uid()));
drop policy if exists photo_reactions_delete_self on public.photo_reactions;
create policy photo_reactions_delete_self on public.photo_reactions
for delete to authenticated using (user_id=(select auth.uid()));
grant select,insert,update,delete on public.photo_reactions to authenticated;

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values
  ('avesso-chat','avesso-chat',false,10485760,array[
    'image/jpeg','image/png','image/webp','image/gif',
    'application/pdf','text/plain',
    'application/zip','application/x-zip-compressed',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]),
  ('avesso-albums','avesso-albums',true,8388608,array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists avesso_chat_select_participants on storage.objects;
create policy avesso_chat_select_participants on storage.objects
for select to authenticated using (
  bucket_id='avesso-chat'
  and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or (storage.foldername(name))[2]=(select auth.uid())::text
  )
);
drop policy if exists avesso_chat_insert_sender on storage.objects;
create policy avesso_chat_insert_sender on storage.objects
for insert to authenticated with check (
  bucket_id='avesso-chat'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);
drop policy if exists avesso_chat_delete_sender on storage.objects;
create policy avesso_chat_delete_sender on storage.objects
for delete to authenticated using (
  bucket_id='avesso-chat'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);

drop policy if exists avesso_album_read on storage.objects;
create policy avesso_album_read on storage.objects
for select to public using (bucket_id='avesso-albums');
drop policy if exists avesso_album_insert_self on storage.objects;
create policy avesso_album_insert_self on storage.objects
for insert to authenticated with check (
  bucket_id='avesso-albums'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);
drop policy if exists avesso_album_delete_self on storage.objects;
create policy avesso_album_delete_self on storage.objects
for delete to authenticated using (
  bucket_id='avesso-albums'
  and (storage.foldername(name))[1]=(select auth.uid())::text
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='profile_photos'
  ) then alter publication supabase_realtime add table public.profile_photos; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='photo_reactions'
  ) then alter publication supabase_realtime add table public.photo_reactions; end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='profiles'
  ) then alter publication supabase_realtime add table public.profiles; end if;
end $$;
