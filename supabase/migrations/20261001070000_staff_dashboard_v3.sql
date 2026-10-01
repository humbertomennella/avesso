-- AVESSO // Staff Dashboard V3
-- Versiona a infraestrutura de staff usada pela dashboard.
-- A migration é idempotente para instalações que já receberam parte do schema.

create table if not exists public.admin_users(
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role text not null default 'moderator',
  created_at timestamptz not null default now(),
  constraint admin_users_role_check check(role in ('moderator','senior_admin','owner'))
);
alter table public.admin_users alter column role set default 'moderator';
alter table public.admin_users enable row level security;
drop policy if exists admin_users_authenticated_read on public.admin_users;
create policy admin_users_authenticated_read on public.admin_users for select to authenticated using(true);
grant select on public.admin_users to authenticated;

create or replace function public.staff_rank(p_role text)
returns integer language sql immutable as $$
  select case p_role when 'owner' then 30 when 'senior_admin' then 20 when 'moderator' then 10 else 0 end;
$$;
create or replace function public.staff_role_rank(p_role text)
returns integer language sql immutable as $$ select public.staff_rank(p_role); $$;
create or replace function public.current_staff_role()
returns text language sql stable security definer set search_path=public as $$
  select role from public.admin_users where user_id=(select auth.uid());
$$;
create or replace function public.staff_can(p_min_role text)
returns boolean language sql stable security definer set search_path=public as $$
  select public.staff_rank(coalesce(public.current_staff_role(),'')) >= public.staff_rank(p_min_role);
$$;
create or replace function public.is_staff(p_min_rank integer default 10)
returns boolean language sql stable security definer set search_path=public as $$
  select public.staff_rank(coalesce(public.current_staff_role(),'')) >= p_min_rank;
$$;

create table if not exists public.staff_chat_messages(
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid null references public.profiles(id) on delete cascade,
  channel text not null,
  body text not null check(char_length(trim(body)) between 1 and 1200),
  created_at timestamptz not null default now()
);
alter table public.staff_chat_messages add column if not exists recipient_id uuid references public.profiles(id) on delete cascade;
alter table public.staff_chat_messages drop constraint if exists staff_chat_messages_channel_check;
alter table public.staff_chat_messages drop constraint if exists staff_chat_channel_check;
alter table public.staff_chat_messages add constraint staff_chat_channel_check check(channel in ('all','moderators','senior','direct'));
create index if not exists staff_chat_recipient_created_idx on public.staff_chat_messages(recipient_id,created_at desc);
create index if not exists staff_chat_channel_created_idx on public.staff_chat_messages(channel,created_at desc);
alter table public.staff_chat_messages enable row level security;
grant select,insert,delete on public.staff_chat_messages to authenticated;

create or replace function public.can_access_staff_chat(p_channel text,p_sender uuid,p_recipient uuid)
returns boolean language plpgsql stable security definer set search_path=public as $$
declare me uuid:=(select auth.uid()); r text:=public.current_staff_role();
begin
  if r is null then return false; end if;
  if p_channel='all' then return true; end if;
  if p_channel='moderators' then return r in ('moderator','senior_admin','owner'); end if;
  if p_channel='senior' then return r in ('senior_admin','owner'); end if;
  if p_channel='direct' then
    return me in (p_sender,p_recipient)
      and exists(select 1 from public.admin_users s where s.user_id=p_sender)
      and exists(select 1 from public.admin_users r2 where r2.user_id=p_recipient);
  end if;
  return false;
end $$;
drop policy if exists staff_chat_select on public.staff_chat_messages;
create policy staff_chat_select on public.staff_chat_messages for select to authenticated
using(public.can_access_staff_chat(channel,sender_id,recipient_id));
drop policy if exists staff_chat_insert on public.staff_chat_messages;
create policy staff_chat_insert on public.staff_chat_messages for insert to authenticated
with check(sender_id=(select auth.uid()) and public.can_access_staff_chat(channel,sender_id,recipient_id));
drop policy if exists staff_chat_delete_self on public.staff_chat_messages;
create policy staff_chat_delete_self on public.staff_chat_messages for delete to authenticated
using(sender_id=(select auth.uid()) or public.staff_can('owner'));

create table if not exists public.user_staff_notifications(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  sent_by uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  severity text not null default 'info',
  read_at timestamptz null,
  created_at timestamptz not null default now()
);
alter table public.user_staff_notifications enable row level security;
grant select,update on public.user_staff_notifications to authenticated;
drop policy if exists user_staff_notifications_read_self on public.user_staff_notifications;
create policy user_staff_notifications_read_self on public.user_staff_notifications for select to authenticated
using(user_id=(select auth.uid()));
drop policy if exists user_staff_notifications_update_self on public.user_staff_notifications;
create policy user_staff_notifications_update_self on public.user_staff_notifications for update to authenticated
using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()));

create table if not exists public.staff_warnings(
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid not null references public.profiles(id) on delete cascade,
  issued_by uuid not null references public.profiles(id) on delete cascade,
  reason text not null,
  severity text not null default 'aviso',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  revoked_at timestamptz null,
  revoked_by uuid null references public.profiles(id) on delete set null
);
alter table public.staff_warnings add column if not exists severity text not null default 'aviso';
alter table public.staff_warnings drop constraint if exists staff_warnings_severity_check;
alter table public.staff_warnings add constraint staff_warnings_severity_check check(severity in ('aviso','grave','critico'));
alter table public.staff_warnings enable row level security;
grant select on public.staff_warnings to authenticated;
drop policy if exists staff_warnings_staff_read on public.staff_warnings;
create policy staff_warnings_staff_read on public.staff_warnings for select to authenticated using(public.staff_can('moderator'));

alter table public.reports add column if not exists assigned_to uuid references public.profiles(id) on delete set null;
alter table public.reports add column if not exists assigned_by uuid references public.profiles(id) on delete set null;
alter table public.reports add column if not exists assigned_at timestamptz;
alter table public.reports add column if not exists priority text not null default 'normal';
alter table public.reports add column if not exists staff_notes text not null default '';
alter table public.reports add column if not exists resolution text not null default '';
alter table public.reports add column if not exists resolved_by uuid references public.profiles(id) on delete set null;
alter table public.reports add column if not exists resolved_at timestamptz;
alter table public.reports add column if not exists updated_at timestamptz not null default now();
alter table public.reports drop constraint if exists reports_priority_check;
alter table public.reports add constraint reports_priority_check check(priority in ('baixa','normal','alta','critica'));
drop policy if exists reports_staff_read on public.reports;
create policy reports_staff_read on public.reports for select to authenticated using(public.staff_can('moderator'));

create table if not exists public.moderation_terms(
  id uuid primary key default gen_random_uuid(),
  term text not null,
  category text not null default 'outro',
  severity text not null default 'media',
  enabled boolean not null default true,
  notes text not null default '',
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists moderation_terms_unique_term on public.moderation_terms(lower(term));
alter table public.moderation_terms enable row level security;
grant select on public.moderation_terms to authenticated;
drop policy if exists moderation_terms_staff_read on public.moderation_terms;
create policy moderation_terms_staff_read on public.moderation_terms for select to authenticated using(public.staff_can('moderator'));

create table if not exists public.moderation_alerts(
  id uuid primary key default gen_random_uuid(),
  term_id uuid null references public.moderation_terms(id) on delete set null,
  source_type text not null,
  source_id uuid not null,
  user_id uuid null references public.profiles(id) on delete set null,
  matched_term text not null,
  excerpt text not null default '',
  severity text not null default 'alta',
  status text not null default 'novo',
  assigned_to uuid null references public.profiles(id) on delete set null,
  resolution text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(term_id,source_type,source_id)
);
alter table public.moderation_alerts enable row level security;

create table if not exists public.admin_assets(
  id uuid primary key default gen_random_uuid(),
  asset_type text not null,
  name text not null,
  slug text not null,
  storage_path text not null,
  mime_type text not null default 'image/webp',
  shortcode text not null default '',
  meta jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(asset_type,slug)
);
alter table public.admin_assets enable row level security;
grant select on public.admin_assets to anon,authenticated;
drop policy if exists admin_assets_public_read on public.admin_assets;
create policy admin_assets_public_read on public.admin_assets for select using(active=true or public.staff_can('owner'));

create table if not exists public.badges(
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  image_path text not null,
  active boolean not null default true,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists public.user_badges(
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  granted_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key(user_id,badge_id)
);
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
grant select on public.badges,public.user_badges to anon,authenticated;
drop policy if exists badges_public_read on public.badges;
create policy badges_public_read on public.badges for select using(true);
drop policy if exists user_badges_public_read on public.user_badges;
create policy user_badges_public_read on public.user_badges for select using(true);

create table if not exists public.site_content_blocks(
  id uuid primary key default gen_random_uuid(),
  page_slug text not null,
  block_key text not null,
  kind text not null default 'text',
  value text not null default '',
  enabled boolean not null default true,
  sort_order integer not null default 100,
  updated_by uuid null references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique(page_slug,block_key)
);
create table if not exists public.site_overrides(
  id uuid primary key default gen_random_uuid(),
  page text not null default 'global',
  selector text not null,
  action text not null,
  value text not null default '',
  enabled boolean not null default true,
  sort_order integer not null default 0,
  updated_by uuid null references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.site_content_blocks enable row level security;
alter table public.site_overrides enable row level security;
grant select on public.site_content_blocks,public.site_overrides to anon,authenticated;
drop policy if exists site_content_blocks_public_read on public.site_content_blocks;
create policy site_content_blocks_public_read on public.site_content_blocks for select using(true);
drop policy if exists site_overrides_public_read on public.site_overrides;
create policy site_overrides_public_read on public.site_overrides for select using(true);

alter table public.site_settings add column if not exists feed_settings jsonb not null default '{"page_size":40,"show_attention_tag":true}'::jsonb;
alter table public.site_settings add column if not exists story_settings jsonb not null default '{"enabled":true,"camera_enabled":true,"duration_hours":24,"max_video_seconds":15,"default_visibility":"publico"}'::jsonb;
alter table public.site_settings add column if not exists login_settings jsonb not null default '{"registration_enabled":true}'::jsonb;
alter table public.site_settings add column if not exists layout_settings jsonb not null default '{}'::jsonb;

create or replace function public.staff_set_role(p_user_id uuid,p_role text)
returns text language plpgsql security definer set search_path=public as $$
declare actor uuid:=(select auth.uid()); actor_role text:=public.current_staff_role(); actor_rank int:=public.staff_rank(actor_role); current_role text; current_rank int;
begin
  if actor_rank<20 then raise exception 'forbidden' using errcode='42501'; end if;
  select role into current_role from public.admin_users where user_id=p_user_id;
  current_rank:=public.staff_rank(coalesce(current_role,''));
  if actor_role='senior_admin' then
    if p_role not in ('moderator','none') or current_rank>=20 then raise exception 'insufficient_rank' using errcode='42501'; end if;
  elsif actor_role='owner' then
    if p_role not in ('moderator','senior_admin','none','owner') then raise exception 'invalid_role'; end if;
    if p_user_id=actor and p_role<>'owner' then raise exception 'owner_cannot_demote_self'; end if;
  end if;
  if p_role='none' then delete from public.admin_users where user_id=p_user_id;
  else insert into public.admin_users(user_id,role) values(p_user_id,p_role) on conflict(user_id) do update set role=excluded.role; end if;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'set_staff_role','profile',p_user_id::text,jsonb_build_object('role',p_role));
  return p_role;
end $$;

create or replace function public.staff_set_user_ban(p_user_id uuid,p_banned boolean,p_reason text default '',p_until timestamptz default null)
returns public.user_moderation language plpgsql security definer set search_path=public as $$
declare actor uuid:=(select auth.uid()); actor_rank int:=public.staff_rank(public.current_staff_role()); target_rank int; outrow public.user_moderation;
begin
  if actor_rank<10 then raise exception 'forbidden' using errcode='42501'; end if;
  if p_user_id=actor then raise exception 'cannot_ban_self'; end if;
  select public.staff_rank(coalesce(role,'')) into target_rank from public.admin_users where user_id=p_user_id;
  target_rank:=coalesce(target_rank,0);
  if target_rank>=actor_rank then raise exception 'insufficient_rank' using errcode='42501'; end if;
  if p_banned and char_length(trim(coalesce(p_reason,'')))<2 then raise exception 'reason_required'; end if;
  insert into public.user_moderation(user_id,suspended,reason,suspended_until,updated_by,updated_at)
  values(p_user_id,p_banned,left(coalesce(p_reason,''),500),case when p_banned then p_until else null end,actor,now())
  on conflict(user_id) do update set suspended=excluded.suspended,reason=excluded.reason,suspended_until=excluded.suspended_until,updated_by=excluded.updated_by,updated_at=excluded.updated_at
  returning * into outrow;
  if p_banned then
    insert into public.user_staff_notifications(user_id,sent_by,title,body,severity)
    values(p_user_id,actor,case when p_until is null then 'Conta banida' else 'Conta suspensa temporariamente' end,left(p_reason,1200),'moderacao');
  end if;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,case when p_banned then 'ban_user' else 'restore_user' end,'profile',p_user_id::text,jsonb_build_object('reason',p_reason,'until',p_until));
  return outrow;
end $$;

create or replace function public.staff_send_user_notice(p_user_id uuid,p_title text,p_body text,p_severity text default 'info')
returns uuid language plpgsql security definer set search_path=public as $$
declare actor uuid:=(select auth.uid()); new_id uuid;
begin
  if not public.staff_can('moderator') then raise exception 'forbidden' using errcode='42501'; end if;
  if p_severity not in ('info','aviso','moderacao','critico') then raise exception 'invalid_severity'; end if;
  insert into public.user_staff_notifications(user_id,sent_by,title,body,severity)
  values(p_user_id,actor,left(trim(p_title),120),left(trim(p_body),1200),p_severity) returning id into new_id;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'send_user_notice','profile',p_user_id::text,jsonb_build_object('title',p_title,'severity',p_severity));
  return new_id;
end $$;

create or replace function public.staff_warn_staff(p_user_id uuid,p_reason text,p_severity text default 'aviso')
returns uuid language plpgsql security definer set search_path=public as $$
declare actor uuid:=(select auth.uid()); ar int:=public.staff_rank(public.current_staff_role()); tr int; out_id uuid;
begin
  select public.staff_rank(role) into tr from public.admin_users where user_id=p_user_id;
  if ar<20 or tr is null or tr>=ar then raise exception 'forbidden' using errcode='42501'; end if;
  if p_severity not in ('aviso','grave','critico') then raise exception 'invalid_severity'; end if;
  insert into public.staff_warnings(staff_user_id,issued_by,reason,severity)
  values(p_user_id,actor,left(trim(p_reason),600),p_severity) returning id into out_id;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'warn_staff','staff',p_user_id::text,jsonb_build_object('reason',p_reason,'severity',p_severity));
  return out_id;
end $$;

create or replace function public.staff_upsert_moderation_term(p_id uuid,p_term text,p_category text,p_severity text,p_enabled boolean,p_notes text default '')
returns public.moderation_terms language plpgsql security definer set search_path=public as $$
declare actor uuid:=(select auth.uid()); outrow public.moderation_terms;
begin
  if not public.staff_can('moderator') then raise exception 'forbidden' using errcode='42501'; end if;
  if p_category not in ('racismo','homofobia','transfobia','xenofobia','ameaca','crime','assedio','spam','outro') then raise exception 'invalid_category'; end if;
  if p_severity not in ('baixa','media','alta','critica') then raise exception 'invalid_severity'; end if;
  if p_id is null then
    insert into public.moderation_terms(term,category,severity,enabled,notes,created_by)
    values(left(trim(p_term),160),p_category,p_severity,p_enabled,left(coalesce(p_notes,''),500),actor) returning * into outrow;
  else
    update public.moderation_terms set term=left(trim(p_term),160),category=p_category,severity=p_severity,enabled=p_enabled,notes=left(coalesce(p_notes,''),500),updated_at=now()
    where id=p_id returning * into outrow;
  end if;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'moderation_term_save','moderation_term',outrow.id::text,jsonb_build_object('term',outrow.term,'category',outrow.category,'severity',outrow.severity));
  return outrow;
end $$;
create or replace function public.staff_delete_moderation_term(p_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare actor uuid:=(select auth.uid()); n int;
begin
  if not public.staff_can('moderator') then raise exception 'forbidden' using errcode='42501'; end if;
  delete from public.moderation_terms where id=p_id; get diagnostics n=row_count;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id) values(actor,'moderation_term_delete','moderation_term',p_id::text);
  return n>0;
end $$;

create or replace function public.owner_update_runtime_settings(p_feed_settings jsonb,p_story_settings jsonb,p_login_settings jsonb,p_layout_settings jsonb)
returns public.site_settings language plpgsql security definer set search_path=public as $$
declare actor uuid:=(select auth.uid()); outrow public.site_settings;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  update public.site_settings set feed_settings=coalesce(p_feed_settings,'{}'),story_settings=coalesce(p_story_settings,'{}'),login_settings=coalesce(p_login_settings,'{}'),layout_settings=coalesce(p_layout_settings,'{}'),updated_by=actor,updated_at=now()
  where id='global' returning * into outrow;
  return outrow;
end $$;

create or replace function public.owner_upsert_content_block(p_id uuid,p_page_slug text,p_block_key text,p_kind text,p_value text,p_enabled boolean,p_sort_order integer)
returns public.site_content_blocks language plpgsql security definer set search_path=public as $$
declare actor uuid:=(select auth.uid()); outrow public.site_content_blocks;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  if p_kind not in ('text','html','image','link','json') then raise exception 'invalid_kind'; end if;
  if p_id is null then
    insert into public.site_content_blocks(page_slug,block_key,kind,value,enabled,sort_order,updated_by)
    values(left(trim(p_page_slug),80),left(trim(p_block_key),100),p_kind,left(coalesce(p_value,''),20000),p_enabled,p_sort_order,actor) returning * into outrow;
  else
    update public.site_content_blocks set page_slug=left(trim(p_page_slug),80),block_key=left(trim(p_block_key),100),kind=p_kind,value=left(coalesce(p_value,''),20000),enabled=p_enabled,sort_order=p_sort_order,updated_by=actor,updated_at=now()
    where id=p_id returning * into outrow;
  end if;
  return outrow;
end $$;
create or replace function public.owner_delete_content_block(p_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  delete from public.site_content_blocks where id=p_id; return found;
end $$;

create or replace function public.owner_upsert_admin_asset(p_id uuid,p_asset_type text,p_name text,p_slug text,p_storage_path text,p_mime_type text,p_shortcode text,p_meta jsonb,p_active boolean)
returns public.admin_assets language plpgsql security definer set search_path=public as $$
declare actor uuid:=(select auth.uid()); outrow public.admin_assets;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  if p_asset_type not in ('wallpaper','emoticon','avatar','badge','character','ui','other') then raise exception 'invalid_asset_type'; end if;
  if p_id is null then
    insert into public.admin_assets(asset_type,name,slug,storage_path,mime_type,shortcode,meta,active,created_by)
    values(p_asset_type,left(trim(p_name),100),left(trim(p_slug),100),p_storage_path,left(p_mime_type,100),left(coalesce(p_shortcode,''),80),coalesce(p_meta,'{}'),p_active,actor)
    returning * into outrow;
  else
    update public.admin_assets set asset_type=p_asset_type,name=left(trim(p_name),100),slug=left(trim(p_slug),100),storage_path=p_storage_path,mime_type=left(p_mime_type,100),shortcode=left(coalesce(p_shortcode,''),80),meta=coalesce(p_meta,'{}'),active=p_active where id=p_id returning * into outrow;
  end if;
  return outrow;
end $$;
create or replace function public.owner_delete_admin_asset(p_id uuid)
returns text language plpgsql security definer set search_path=public as $$
declare path text;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  select storage_path into path from public.admin_assets where id=p_id;
  delete from public.admin_assets where id=p_id;
  return path;
end $$;

create or replace function public.owner_upsert_badge(p_id uuid,p_slug text,p_name text,p_description text,p_image_path text,p_active boolean default true)
returns public.badges language plpgsql security definer set search_path=public as $$
declare actor uuid:=(select auth.uid()); outrow public.badges;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  if p_id is null then
    insert into public.badges(slug,name,description,image_path,active,created_by)
    values(left(trim(p_slug),80),left(trim(p_name),80),left(coalesce(p_description,''),300),p_image_path,p_active,actor) returning * into outrow;
  else
    update public.badges set slug=left(trim(p_slug),80),name=left(trim(p_name),80),description=left(coalesce(p_description,''),300),image_path=p_image_path,active=p_active where id=p_id returning * into outrow;
  end if;
  return outrow;
end $$;
create or replace function public.owner_grant_badge(p_user_id uuid,p_badge_id uuid,p_grant boolean)
returns boolean language plpgsql security definer set search_path=public as $$
declare actor uuid:=(select auth.uid());
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  if p_grant then insert into public.user_badges(user_id,badge_id,granted_by) values(p_user_id,p_badge_id,actor) on conflict do nothing;
  else delete from public.user_badges where user_id=p_user_id and badge_id=p_badge_id; end if;
  return true;
end $$;

create or replace function public.owner_database_snapshot()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  select jsonb_build_object(
    'tables',coalesce((select jsonb_agg(jsonb_build_object('name',c.relname,'rls',c.relrowsecurity,'estimated_rows',greatest(c.reltuples::bigint,0),'size_bytes',pg_total_relation_size(c.oid),'policies',(select count(*) from pg_policies p where p.schemaname='public' and p.tablename=c.relname)) order by pg_total_relation_size(c.oid) desc) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r'),'[]'::jsonb),
    'functions',(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'),
    'policies',(select count(*) from pg_policies where schemaname='public'),
    'storage_objects',(select count(*) from storage.objects),
    'storage_bytes',coalesce((select sum((metadata->>'size')::bigint) from storage.objects where metadata ? 'size'),0),
    'generated_at',now()
  ) into result;
  return result;
end $$;

-- A snapshot é centralizado na função já definida no ambiente. A implementação completa
-- é substituída na migration seguinte se houver drift de schema.
revoke all on function public.staff_rank(text),public.staff_role_rank(text),public.current_staff_role(),public.staff_can(text),public.is_staff(integer) from public;
grant execute on function public.staff_rank(text),public.staff_role_rank(text),public.current_staff_role(),public.staff_can(text),public.is_staff(integer) to authenticated;
grant execute on function public.staff_set_role(uuid,text),public.staff_set_user_ban(uuid,boolean,text,timestamptz),public.staff_send_user_notice(uuid,text,text,text),public.staff_warn_staff(uuid,text,text),public.staff_upsert_moderation_term(uuid,text,text,text,boolean,text),public.staff_delete_moderation_term(uuid) to authenticated;
grant execute on function public.owner_update_runtime_settings(jsonb,jsonb,jsonb,jsonb),public.owner_upsert_content_block(uuid,text,text,text,text,boolean,integer),public.owner_delete_content_block(uuid),public.owner_upsert_admin_asset(uuid,text,text,text,text,text,text,jsonb,boolean),public.owner_delete_admin_asset(uuid),public.owner_upsert_badge(uuid,text,text,text,text,boolean),public.owner_grant_badge(uuid,uuid,boolean),public.owner_database_snapshot() to authenticated;
