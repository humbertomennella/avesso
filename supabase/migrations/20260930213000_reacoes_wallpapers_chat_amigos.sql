
-- AVESSO: reações ácidas, wallpapers e chat entre amigos

alter table public.profiles
  add column if not exists profile_wallpaper text not null default 'cidade-56k',
  add column if not exists app_wallpaper text not null default 'cidade-56k';

alter table public.profiles drop constraint if exists profiles_profile_wallpaper_check;
alter table public.profiles add constraint profiles_profile_wallpaper_check
check (profile_wallpaper in (
  'cidade-56k','praça-3am','torre-kpi','arquivo-morto','jardim-glitch',
  'servidor-submerso','terapia-do-algoritmo','erro-bonito','lua-de-cache','humano-nao-encontrado'
));

alter table public.profiles drop constraint if exists profiles_app_wallpaper_check;
alter table public.profiles add constraint profiles_app_wallpaper_check
check (app_wallpaper in (
  'cidade-56k','praça-3am','torre-kpi','arquivo-morto','jardim-glitch',
  'servidor-submerso','terapia-do-algoritmo','erro-bonito','lua-de-cache','humano-nao-encontrado'
));

create table if not exists public.post_reactions (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in (
    'suspeito','merece_cafe','caos_aprovado','li_me_arrependi','isso_escalou','humano_detectado'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (post_id,user_id)
);
create index if not exists post_reactions_post_idx on public.post_reactions(post_id,reaction);
alter table public.post_reactions enable row level security;

drop policy if exists post_reactions_visible on public.post_reactions;
create policy post_reactions_visible on public.post_reactions
for select to authenticated using (
  exists (
    select 1 from public.posts p
    where p.id=post_reactions.post_id
      and (
        p.visibility='publico'
        or p.author_id=(select auth.uid())
        or p.recipient_id=(select auth.uid())
      )
  )
);

drop policy if exists post_reactions_insert_self on public.post_reactions;
create policy post_reactions_insert_self on public.post_reactions
for insert to authenticated with check (
  user_id=(select auth.uid())
  and exists (
    select 1 from public.posts p
    where p.id=post_reactions.post_id
      and (
        p.visibility='publico'
        or p.author_id=(select auth.uid())
        or p.recipient_id=(select auth.uid())
      )
  )
);

drop policy if exists post_reactions_update_self on public.post_reactions;
create policy post_reactions_update_self on public.post_reactions
for update to authenticated
using (user_id=(select auth.uid()))
with check (user_id=(select auth.uid()));

drop policy if exists post_reactions_delete_self on public.post_reactions;
create policy post_reactions_delete_self on public.post_reactions
for delete to authenticated using (user_id=(select auth.uid()));

grant select,insert,update,delete on public.post_reactions to authenticated;

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);
create index if not exists direct_messages_pair_time_idx
  on public.direct_messages(sender_id,recipient_id,created_at desc);
create index if not exists direct_messages_recipient_unread_idx
  on public.direct_messages(recipient_id,created_at desc) where read_at is null;
alter table public.direct_messages enable row level security;

drop policy if exists direct_messages_read_friends on public.direct_messages;
create policy direct_messages_read_friends on public.direct_messages
for select to authenticated using (
  (select auth.uid()) in (sender_id,recipient_id)
  and exists (
    select 1 from public.friendships f
    where f.status='accepted'
      and (
        (f.requester_id=sender_id and f.addressee_id=recipient_id)
        or (f.requester_id=recipient_id and f.addressee_id=sender_id)
      )
  )
);

drop policy if exists direct_messages_send_friends on public.direct_messages;
create policy direct_messages_send_friends on public.direct_messages
for insert to authenticated with check (
  sender_id=(select auth.uid())
  and exists (
    select 1 from public.friendships f
    where f.status='accepted'
      and (
        (f.requester_id=sender_id and f.addressee_id=recipient_id)
        or (f.requester_id=recipient_id and f.addressee_id=sender_id)
      )
  )
);

drop policy if exists direct_messages_mark_read on public.direct_messages;
create policy direct_messages_mark_read on public.direct_messages
for update to authenticated
using (recipient_id=(select auth.uid()))
with check (recipient_id=(select auth.uid()));

drop policy if exists direct_messages_delete_sender on public.direct_messages;
create policy direct_messages_delete_sender on public.direct_messages
for delete to authenticated using (sender_id=(select auth.uid()));

grant select,insert,update,delete on public.direct_messages to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='post_reactions'
  ) then
    alter publication supabase_realtime add table public.post_reactions;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='direct_messages'
  ) then
    alter publication supabase_realtime add table public.direct_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='friendships'
  ) then
    alter publication supabase_realtime add table public.friendships;
  end if;
end $$;
