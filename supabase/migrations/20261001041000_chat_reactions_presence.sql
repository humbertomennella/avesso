-- AVESSO // chat reactions + presence timeout

alter table public.profiles
  add column if not exists away_after_minutes smallint not null default 10;

alter table public.profiles
  drop constraint if exists profiles_away_after_minutes_check;

alter table public.profiles
  add constraint profiles_away_after_minutes_check
  check (away_after_minutes in (0,5,10,15,20,30));

alter table public.direct_messages
  add column if not exists edited_at timestamptz;

create table if not exists public.direct_message_reactions (
  message_id uuid not null references public.direct_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reaction text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (message_id,user_id)
);

alter table public.direct_message_reactions enable row level security;

drop policy if exists direct_message_reactions_read_participants on public.direct_message_reactions;
create policy direct_message_reactions_read_participants
on public.direct_message_reactions for select
to authenticated
using (
  exists (
    select 1
    from public.direct_messages m
    where m.id = direct_message_reactions.message_id
      and (m.sender_id = (select auth.uid()) or m.recipient_id = (select auth.uid()))
  )
);

drop policy if exists direct_message_reactions_insert_self on public.direct_message_reactions;
create policy direct_message_reactions_insert_self
on public.direct_message_reactions for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and char_length(reaction) between 1 and 32
  and exists (
    select 1
    from public.direct_messages m
    where m.id = direct_message_reactions.message_id
      and (m.sender_id = (select auth.uid()) or m.recipient_id = (select auth.uid()))
  )
);

drop policy if exists direct_message_reactions_update_self on public.direct_message_reactions;
create policy direct_message_reactions_update_self
on public.direct_message_reactions for update
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and char_length(reaction) between 1 and 32
  and exists (
    select 1
    from public.direct_messages m
    where m.id = direct_message_reactions.message_id
      and (m.sender_id = (select auth.uid()) or m.recipient_id = (select auth.uid()))
  )
);

drop policy if exists direct_message_reactions_delete_self on public.direct_message_reactions;
create policy direct_message_reactions_delete_self
on public.direct_message_reactions for delete
to authenticated
using (user_id = (select auth.uid()));

create or replace function public.edit_direct_message(p_message_id uuid, p_body text)
returns public.direct_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.direct_messages;
  v_body text := btrim(coalesce(p_body,''));
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 1000 then
    raise exception 'invalid message length';
  end if;

  select * into v_row
  from public.direct_messages
  where id = p_message_id;

  if not found or v_row.sender_id <> v_uid then
    raise exception 'message not editable';
  end if;
  if v_row.message_kind <> 'text' or v_row.attachment_path is not null then
    raise exception 'only plain text messages are editable';
  end if;

  update public.direct_messages
  set body = v_body,
      edited_at = now()
  where id = p_message_id
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.edit_direct_message(uuid,text) from public;
grant execute on function public.edit_direct_message(uuid,text) to authenticated;

create index if not exists direct_message_reactions_message_idx
  on public.direct_message_reactions(message_id);

create index if not exists world_events_active_created_idx
  on public.world_events(status,created_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname='supabase_realtime'
      and schemaname='public'
      and tablename='direct_message_reactions'
  ) then
    alter publication supabase_realtime add table public.direct_message_reactions;
  end if;
end $$;
