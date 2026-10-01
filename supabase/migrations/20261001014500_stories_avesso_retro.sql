
-- AVESSO: Stories de 24h, reações novas e temas estruturais do chat.

-- 1) Reações do feed: preserva apenas "li e me arrependi" do conjunto antigo.
delete from public.post_reactions
where reaction <> 'li_me_arrependi';

alter table public.post_reactions
  drop constraint if exists post_reactions_reaction_check;

alter table public.post_reactions
  add constraint post_reactions_reaction_check
  check (reaction in (
    'li_me_arrependi',
    'infelizmente_concordo',
    'modem_julgou',
    'melhor_offline',
    'fingir_nao_vi',
    'argumento_carregando',
    'virou_reuniao'
  ));

-- 2) Temas do AVESSO.MSG.
alter table public.profiles
  drop constraint if exists profiles_chat_theme_check;

alter table public.profiles
  add constraint profiles_chat_theme_check
  check (chat_theme in (
    'bbs_cyan','acid_terminal','arcade_violet','error_coral','midnight_modem',
    'graphite_dos','phosphor_green','dos_amber','janela_95','magenta_crt',
    'win95_future','icq_neon','winamp_2026','web98_glass','crt_void','arcade_os'
  ));

-- 3) Stories.
create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null default '' check (char_length(body) <= 420),
  image_path text,
  visibility text not null default 'publico' check (visibility in ('publico','amigos')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  check (expires_at > created_at)
);

create index if not exists stories_active_time_idx
  on public.stories(expires_at, created_at desc);
create index if not exists stories_author_active_idx
  on public.stories(author_id, expires_at desc);

alter table public.stories enable row level security;

drop policy if exists stories_visible on public.stories;
create policy stories_visible on public.stories
for select to authenticated
using (
  expires_at > now()
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

drop policy if exists stories_insert_self on public.stories;
create policy stories_insert_self on public.stories
for insert to authenticated
with check (
  author_id = (select auth.uid())
  and visibility in ('publico','amigos')
  and expires_at <= now() + interval '24 hours 5 minutes'
);

drop policy if exists stories_update_self on public.stories;
create policy stories_update_self on public.stories
for update to authenticated
using (author_id = (select auth.uid()))
with check (
  author_id = (select auth.uid())
  and visibility in ('publico','amigos')
);

drop policy if exists stories_delete_self on public.stories;
create policy stories_delete_self on public.stories
for delete to authenticated
using (author_id = (select auth.uid()));

grant select,insert,update,delete on public.stories to authenticated;

-- 4) Reações dos stories.
create table if not exists public.story_reactions (
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in ('curti','vi','modem','pane','quatro_zero_quatro')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (story_id,user_id)
);

create index if not exists story_reactions_story_idx
  on public.story_reactions(story_id,reaction);

alter table public.story_reactions enable row level security;

drop policy if exists story_reactions_visible on public.story_reactions;
create policy story_reactions_visible on public.story_reactions
for select to authenticated
using (
  exists (
    select 1 from public.stories s
    where s.id = story_reactions.story_id
  )
);

drop policy if exists story_reactions_insert_self on public.story_reactions;
create policy story_reactions_insert_self on public.story_reactions
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.stories s where s.id = story_reactions.story_id)
);

drop policy if exists story_reactions_update_self on public.story_reactions;
create policy story_reactions_update_self on public.story_reactions
for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

drop policy if exists story_reactions_delete_self on public.story_reactions;
create policy story_reactions_delete_self on public.story_reactions
for delete to authenticated
using (user_id = (select auth.uid()));

grant select,insert,update,delete on public.story_reactions to authenticated;

-- 5) Respostas/comentários dos stories.
create table if not exists public.story_comments (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 420),
  created_at timestamptz not null default now()
);

create index if not exists story_comments_story_time_idx
  on public.story_comments(story_id,created_at);

alter table public.story_comments enable row level security;

drop policy if exists story_comments_visible on public.story_comments;
create policy story_comments_visible on public.story_comments
for select to authenticated
using (
  exists (select 1 from public.stories s where s.id = story_comments.story_id)
);

drop policy if exists story_comments_insert_self on public.story_comments;
create policy story_comments_insert_self on public.story_comments
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.stories s where s.id = story_comments.story_id)
);

drop policy if exists story_comments_delete_parties on public.story_comments;
create policy story_comments_delete_parties on public.story_comments
for delete to authenticated
using (
  user_id = (select auth.uid())
  or exists (
    select 1 from public.stories s
    where s.id = story_comments.story_id
      and s.author_id = (select auth.uid())
  )
);

grant select,insert,delete on public.story_comments to authenticated;

-- 6) Notificações: apenas reação/resposta. Publicar story NÃO gera notificação.
create table if not exists public.story_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  story_id uuid not null references public.stories(id) on delete cascade,
  kind text not null check (kind in ('reaction','comment')),
  reaction text,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (
    (kind='reaction' and reaction in ('curti','vi','modem','pane','quatro_zero_quatro'))
    or
    (kind='comment' and reaction is null)
  )
);

create index if not exists story_notifications_recipient_unread_idx
  on public.story_notifications(recipient_id,created_at desc)
  where read_at is null;

alter table public.story_notifications enable row level security;

drop policy if exists story_notifications_read_recipient on public.story_notifications;
create policy story_notifications_read_recipient on public.story_notifications
for select to authenticated
using (recipient_id = (select auth.uid()));

drop policy if exists story_notifications_update_recipient on public.story_notifications;
create policy story_notifications_update_recipient on public.story_notifications
for update to authenticated
using (recipient_id = (select auth.uid()))
with check (recipient_id = (select auth.uid()));

drop policy if exists story_notifications_delete_recipient on public.story_notifications;
create policy story_notifications_delete_recipient on public.story_notifications
for delete to authenticated
using (recipient_id = (select auth.uid()));

revoke all on public.story_notifications from anon, authenticated;
grant select,update,delete on public.story_notifications to authenticated;

create or replace function public.notify_story_reaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  story_author uuid;
begin
  select author_id into story_author
  from public.stories
  where id = new.story_id and expires_at > now();

  if story_author is not null and story_author <> new.user_id then
    insert into public.story_notifications(recipient_id,actor_id,story_id,kind,reaction)
    values (story_author,new.user_id,new.story_id,'reaction',new.reaction);
  end if;
  return new;
end;
$$;

create or replace function public.notify_story_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  story_author uuid;
begin
  select author_id into story_author
  from public.stories
  where id = new.story_id and expires_at > now();

  if story_author is not null and story_author <> new.user_id then
    insert into public.story_notifications(recipient_id,actor_id,story_id,kind,reaction)
    values (story_author,new.user_id,new.story_id,'comment',null);
  end if;
  return new;
end;
$$;

revoke all on function public.notify_story_reaction() from public,anon,authenticated;
revoke all on function public.notify_story_comment() from public,anon,authenticated;

drop trigger if exists story_reaction_notify on public.story_reactions;
create trigger story_reaction_notify
after insert or update of reaction on public.story_reactions
for each row execute function public.notify_story_reaction();

drop trigger if exists story_comment_notify on public.story_comments;
create trigger story_comment_notify
after insert on public.story_comments
for each row execute function public.notify_story_comment();

-- 7) Bucket privado para imagens temporárias.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values (
  'avesso-stories','avesso-stories',false,8388608,
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do update
set public=false,
    file_size_limit=excluded.file_size_limit,
    allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists avesso_stories_upload_self on storage.objects;
create policy avesso_stories_upload_self on storage.objects
for insert to authenticated
with check (
  bucket_id='avesso-stories'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists avesso_stories_read_visible on storage.objects;
create policy avesso_stories_read_visible on storage.objects
for select to authenticated
using (
  bucket_id='avesso-stories'
  and (
    (storage.foldername(name))[1] = (select auth.uid())::text
    or exists (
      select 1
      from public.stories s
      where s.image_path = name
    )
  )
);

drop policy if exists avesso_stories_delete_self on storage.objects;
create policy avesso_stories_delete_self on storage.objects
for delete to authenticated
using (
  bucket_id='avesso-stories'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- 8) Realtime.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='stories'
  ) then alter publication supabase_realtime add table public.stories; end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='story_reactions'
  ) then alter publication supabase_realtime add table public.story_reactions; end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='story_comments'
  ) then alter publication supabase_realtime add table public.story_comments; end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='story_notifications'
  ) then alter publication supabase_realtime add table public.story_notifications; end if;
end $$;

-- 9) Remoção automática do registro após expirar.
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

select cron.schedule(
  'avesso_story_expiry',
  '*/30 * * * *',
  $$delete from public.stories where expires_at <= now();$$
);
