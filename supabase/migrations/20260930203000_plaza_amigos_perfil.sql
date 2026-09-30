
-- AVESSO social: Praça Central, amizades e perfil ampliado

alter table public.profiles
  add column if not exists status_message text not null default '';

alter table public.profiles
  drop constraint if exists profiles_display_name_len;

alter table public.profiles
  add constraint profiles_display_name_len
  check (char_length(display_name) between 1 and 80);

alter table public.profiles
  drop constraint if exists profiles_status_message_len;

alter table public.profiles
  add constraint profiles_status_message_len
  check (char_length(status_message) <= 140);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);

create unique index if not exists friendships_pair_unique
on public.friendships (least(requester_id,addressee_id), greatest(requester_id,addressee_id));

create index if not exists friendships_requester_idx on public.friendships(requester_id,status);
create index if not exists friendships_addressee_idx on public.friendships(addressee_id,status);

alter table public.friendships enable row level security;

drop policy if exists friendships_participants_read on public.friendships;
create policy friendships_participants_read
on public.friendships for select
to authenticated
using ((select auth.uid()) in (requester_id,addressee_id));

drop policy if exists friendships_requester_insert on public.friendships;
create policy friendships_requester_insert
on public.friendships for insert
to authenticated
with check (
  (select auth.uid()) = requester_id
  and requester_id <> addressee_id
  and status = 'pending'
);

drop policy if exists friendships_participants_update on public.friendships;
create policy friendships_participants_update
on public.friendships for update
to authenticated
using ((select auth.uid()) in (requester_id,addressee_id))
with check ((select auth.uid()) in (requester_id,addressee_id));

drop policy if exists friendships_participants_delete on public.friendships;
create policy friendships_participants_delete
on public.friendships for delete
to authenticated
using ((select auth.uid()) in (requester_id,addressee_id));

grant select,insert,update,delete on public.friendships to authenticated;

create table if not exists public.plaza_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  character_id uuid references public.characters(id) on delete set null,
  body text not null check (char_length(body) between 1 and 280),
  reply_to uuid references public.plaza_messages(id) on delete set null,
  created_at timestamptz not null default now(),
  check (
    (user_id is not null and character_id is null)
    or
    (user_id is null and character_id is not null)
  )
);

create index if not exists plaza_messages_created_idx on public.plaza_messages(created_at desc);
create index if not exists plaza_messages_user_idx on public.plaza_messages(user_id,created_at desc);

alter table public.plaza_messages enable row level security;

drop policy if exists plaza_messages_authenticated_read on public.plaza_messages;
create policy plaza_messages_authenticated_read
on public.plaza_messages for select
to authenticated
using (true);

drop policy if exists plaza_messages_user_insert on public.plaza_messages;
create policy plaza_messages_user_insert
on public.plaza_messages for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and character_id is null
);

drop policy if exists plaza_messages_owner_delete on public.plaza_messages;
create policy plaza_messages_owner_delete
on public.plaza_messages for delete
to authenticated
using ((select auth.uid()) = user_id);

grant select,insert,delete on public.plaza_messages to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='plaza_messages'
  ) then
    alter publication supabase_realtime add table public.plaza_messages;
  end if;
end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare base_handle text; final_handle text;
begin
  base_handle := lower(regexp_replace(coalesce(new.raw_user_meta_data->>'handle', split_part(new.email, '@', 1), 'pessoa'), '[^a-zA-Z0-9_]', '', 'g'));
  if char_length(base_handle) < 3 then base_handle := 'pessoa'; end if;
  base_handle := left(base_handle, 24);
  if exists (select 1 from public.profiles where handle = base_handle) then
    final_handle := left(base_handle, 17) || '_' || substr(new.id::text, 1, 6);
  else
    final_handle := base_handle;
  end if;
  insert into public.profiles (id, handle, display_name)
  values (
    new.id,
    final_handle,
    left(coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(new.email, '@', 1), 'Pessoa'), 80)
  );
  return new;
end;
$function$;
