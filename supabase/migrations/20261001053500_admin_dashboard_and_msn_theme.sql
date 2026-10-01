-- Administração segura + troca do tema Web 98 Glass pelo MSN clássico.
update public.profiles
set chat_theme = 'msn_classic'
where chat_theme = 'web98_glass';

alter table public.profiles
  drop constraint if exists profiles_chat_theme_check;

alter table public.profiles
  add constraint profiles_chat_theme_check
  check (chat_theme = any (array[
    'bbs_cyan','acid_terminal','arcade_violet','error_coral',
    'midnight_modem','graphite_dos','phosphor_green','dos_amber',
    'janela_95','magenta_crt','win95_future','icq_neon',
    'winamp_2026','msn_classic','crt_void','arcade_os'
  ]::text[]));

create table if not exists public.admin_users (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default 'admin'
    check (role in ('admin','owner')),
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists admin_users_self_read on public.admin_users;
create policy admin_users_self_read
on public.admin_users
for select
to authenticated
using ((select auth.uid()) = user_id);

insert into public.admin_users (user_id, role)
select id, 'owner'
from public.profiles
where handle = 'beertofcoelho'
on conflict (user_id) do update set role = excluded.role;

create or replace function public.is_avesso_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users a
    where a.user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_avesso_admin() from public;
grant execute on function public.is_avesso_admin() to authenticated;

create or replace function public.admin_dashboard_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if not public.is_avesso_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'counts', jsonb_build_object(
      'users', (select count(*) from public.profiles),
      'users_7d', (select count(*) from public.profiles where created_at >= now() - interval '7 days'),
      'online_now', (select count(*) from public.profiles where presence_mode <> 'invisible' and online_until > now()),
      'posts', (select count(*) from public.posts),
      'responses', (select count(*) from public.responses),
      'stories_active', (select count(*) from public.stories where expires_at > now()),
      'direct_messages', (select count(*) from public.direct_messages where deleted_at is null),
      'friendships', (select count(*) from public.friendships where status = 'accepted'),
      'reports_open', (select count(*) from public.reports where status = 'aberto')
    ),
    'recent_users', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'display_name', p.display_name,
        'handle', p.handle,
        'avatar_url', p.avatar_url,
        'created_at', p.created_at,
        'presence_mode', p.presence_mode,
        'last_seen', p.last_seen,
        'online_until', p.online_until
      ) order by p.created_at desc)
      from (
        select *
        from public.profiles
        order by created_at desc
        limit 12
      ) p
    ), '[]'::jsonb),
    'reports', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', x.id,
        'reason', x.reason,
        'details', x.details,
        'status', x.status,
        'created_at', x.created_at,
        'post_id', x.post_id,
        'reported_profile_id', x.reported_profile_id,
        'reporter', jsonb_build_object(
          'display_name', x.reporter_name,
          'handle', x.reporter_handle
        ),
        'reported_profile', case
          when x.reported_profile_id is null then null
          else jsonb_build_object(
            'display_name', x.reported_name,
            'handle', x.reported_handle
          )
        end
      ) order by x.created_at desc)
      from (
        select r.*,
               rp.display_name as reporter_name,
               rp.handle as reporter_handle,
               tp.display_name as reported_name,
               tp.handle as reported_handle
        from public.reports r
        left join public.profiles rp on rp.id = r.reporter_id
        left join public.profiles tp on tp.id = r.reported_profile_id
        order by r.created_at desc
        limit 30
      ) x
    ), '[]'::jsonb),
    'world', coalesce((
      select to_jsonb(w)
      from public.world_settings w
      where w.id = 'global'
    ), '{}'::jsonb)
  ) into result;

  return result;
end;
$$;

revoke all on function public.admin_dashboard_snapshot() from public;
grant execute on function public.admin_dashboard_snapshot() to authenticated;

create or replace function public.admin_set_report_status(
  p_report_id uuid,
  p_status text
)
returns public.reports
language plpgsql
security definer
set search_path = public
as $$
declare
  row_out public.reports;
begin
  if not public.is_avesso_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_status not in ('aberto','em_analise','resolvido','descartado') then
    raise exception 'invalid_status';
  end if;

  update public.reports
  set status = p_status
  where id = p_report_id
  returning * into row_out;

  return row_out;
end;
$$;

revoke all on function public.admin_set_report_status(uuid,text) from public;
grant execute on function public.admin_set_report_status(uuid,text) to authenticated;

create or replace function public.admin_set_world_controls(
  p_events boolean,
  p_interventions boolean,
  p_message text
)
returns public.world_settings
language plpgsql
security definer
set search_path = public
as $$
declare
  row_out public.world_settings;
begin
  if not public.is_avesso_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.world_settings
  set world_events_enabled = p_events,
      world_interventions_enabled = p_interventions,
      message = left(coalesce(p_message,''), 240),
      updated_at = now()
  where id = 'global'
  returning * into row_out;

  return row_out;
end;
$$;

revoke all on function public.admin_set_world_controls(boolean,boolean,text) from public;
grant execute on function public.admin_set_world_controls(boolean,boolean,text) to authenticated;
