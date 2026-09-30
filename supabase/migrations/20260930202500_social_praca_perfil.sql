
-- AVESSO social + praça viva + nicknames livres
alter table public.profiles drop constraint if exists profiles_display_name_check;
alter table public.profiles drop constraint if exists profiles_display_name_len;
alter table public.profiles add constraint profiles_display_name_len check (char_length(display_name) between 1 and 80);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id),
  unique (requester_id, addressee_id)
);
create index if not exists friendships_requester_idx on public.friendships(requester_id,status);
create index if not exists friendships_addressee_idx on public.friendships(addressee_id,status);
alter table public.friendships enable row level security;
drop policy if exists friendships_read_parties on public.friendships;
create policy friendships_read_parties on public.friendships
for select to authenticated using ((select auth.uid()) in (requester_id,addressee_id));
drop policy if exists friendships_insert_self on public.friendships;
create policy friendships_insert_self on public.friendships
for insert to authenticated with check ((select auth.uid())=requester_id and requester_id<>addressee_id);
drop policy if exists friendships_update_parties on public.friendships;
create policy friendships_update_parties on public.friendships
for update to authenticated using ((select auth.uid()) in (requester_id,addressee_id))
with check ((select auth.uid()) in (requester_id,addressee_id));
drop policy if exists friendships_delete_parties on public.friendships;
create policy friendships_delete_parties on public.friendships
for delete to authenticated using ((select auth.uid()) in (requester_id,addressee_id));
grant select,insert,update,delete on public.friendships to authenticated;

create table if not exists public.plaza_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  character_id uuid references public.characters(id) on delete set null,
  body text not null check (char_length(body) between 1 and 500),
  reply_to uuid references public.plaza_messages(id) on delete set null,
  message_kind text not null default 'chat' check (message_kind in ('chat','npc','system')),
  created_at timestamptz not null default now(),
  check (user_id is not null or character_id is not null)
);
create index if not exists plaza_messages_created_idx on public.plaza_messages(created_at desc);
alter table public.plaza_messages enable row level security;
drop policy if exists plaza_read_authenticated on public.plaza_messages;
create policy plaza_read_authenticated on public.plaza_messages for select to authenticated using (true);
drop policy if exists plaza_insert_self on public.plaza_messages;
create policy plaza_insert_self on public.plaza_messages for insert to authenticated
with check ((select auth.uid())=user_id and character_id is null and message_kind='chat');
grant select,insert on public.plaza_messages to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables where pubname='supabase_realtime'
      and schemaname='public' and tablename='plaza_messages'
  ) then
    alter publication supabase_realtime add table public.plaza_messages;
  end if;
end $$;
