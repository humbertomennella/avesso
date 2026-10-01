-- AVESSO STAFF DASHBOARD // consolidated schema checkpoint
-- Reproduces the staff/admin schema currently applied in production.
-- Kept after the 20261001062200 base migrations so a fresh setup gets the
-- same final role, moderation, assets, CMS, character, chat and DB controls.

-- =============================================================
-- 20261001054838 staff_dashboard_v2_core
-- =============================================================
-- AVESSO STAFF V2 // roles, moderation, reports, staff chat, badges, assets, CMS
-- 2026-10-01

-- Roles
alter table public.admin_users drop constraint if exists admin_users_role_check;
update public.admin_users set role='senior_admin' where role='admin';
alter table public.admin_users
  add constraint admin_users_role_check
  check (role in ('moderator','senior_admin','owner'));

create or replace function public.staff_rank(p_role text)
returns integer
language sql immutable
as $$
  select case p_role
    when 'owner' then 30
    when 'senior_admin' then 20
    when 'moderator' then 10
    else 0
  end;
$$;

create or replace function public.current_staff_role()
returns text
language sql stable security definer
set search_path=public
as $$
  select a.role from public.admin_users a where a.user_id=(select auth.uid());
$$;

create or replace function public.is_staff(p_min_rank integer default 10)
returns boolean
language sql stable security definer
set search_path=public
as $$
  select public.staff_rank(coalesce(public.current_staff_role(),'')) >= p_min_rank;
$$;

create or replace function public.is_avesso_admin()
returns boolean
language sql stable security definer
set search_path=public
as $$
  select public.is_staff(10);
$$;

revoke all on function public.staff_rank(text) from public;
revoke all on function public.current_staff_role() from public;
revoke all on function public.is_staff(integer) from public;
grant execute on function public.staff_rank(text) to authenticated;
grant execute on function public.current_staff_role() to authenticated;
grant execute on function public.is_staff(integer) to authenticated;

drop policy if exists admin_users_self_read on public.admin_users;
drop policy if exists admin_users_authenticated_read on public.admin_users;
create policy admin_users_authenticated_read
on public.admin_users for select to authenticated
using (true);

-- Reports become a routed staff workflow.
alter table public.reports
  add column if not exists assigned_to uuid references public.profiles(id) on delete set null,
  add column if not exists assigned_by uuid references public.profiles(id) on delete set null,
  add column if not exists assigned_at timestamptz,
  add column if not exists priority text not null default 'normal',
  add column if not exists staff_notes text not null default '',
  add column if not exists resolution text not null default '',
  add column if not exists resolved_by uuid references public.profiles(id) on delete set null,
  add column if not exists resolved_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table public.reports drop constraint if exists reports_status_check;
alter table public.reports
  add constraint reports_status_check
  check (status in ('aberto','em_analise','encaminhado','resolvido','descartado','arquivado'));

alter table public.reports drop constraint if exists reports_priority_check;
alter table public.reports
  add constraint reports_priority_check
  check (priority in ('baixa','normal','alta','critica'));

drop policy if exists reports_staff_read on public.reports;
create policy reports_staff_read
on public.reports for select to authenticated
using (public.is_staff(10));

-- Staff warnings
create table if not exists public.staff_warnings(
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid not null references public.profiles(id) on delete cascade,
  issued_by uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 2 and 600),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id) on delete set null
);
alter table public.staff_warnings enable row level security;
drop policy if exists staff_warnings_staff_read on public.staff_warnings;
create policy staff_warnings_staff_read on public.staff_warnings for select to authenticated
using (public.is_staff(10));

-- Direct notices sent by staff to users.
create table if not exists public.staff_notifications(
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 100),
  body text not null check (char_length(body) between 2 and 600),
  severity text not null default 'info' check (severity in ('info','warning','critical')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists staff_notifications_recipient_idx on public.staff_notifications(recipient_id,created_at desc);
alter table public.staff_notifications enable row level security;
drop policy if exists staff_notifications_recipient_read on public.staff_notifications;
create policy staff_notifications_recipient_read on public.staff_notifications for select to authenticated
using (recipient_id=(select auth.uid()));
drop policy if exists staff_notifications_recipient_update on public.staff_notifications;
create policy staff_notifications_recipient_update on public.staff_notifications for update to authenticated
using (recipient_id=(select auth.uid()))
with check (recipient_id=(select auth.uid()));

-- 24/7 term monitoring.
create table if not exists public.moderation_terms(
  id uuid primary key default gen_random_uuid(),
  term text not null,
  category text not null default 'outro',
  severity text not null default 'media' check (severity in ('baixa','media','alta','critica')),
  enabled boolean not null default true,
  notes text not null default '',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists moderation_terms_unique_lower on public.moderation_terms(lower(term));
alter table public.moderation_terms enable row level security;
drop policy if exists moderation_terms_staff_read on public.moderation_terms;
create policy moderation_terms_staff_read on public.moderation_terms for select to authenticated
using (public.is_staff(10));

create table if not exists public.moderation_hits(
  id bigint generated by default as identity primary key,
  term_id uuid references public.moderation_terms(id) on delete set null,
  matched_term text not null,
  category text not null,
  severity text not null,
  source_type text not null,
  source_id text not null,
  user_id uuid references public.profiles(id) on delete set null,
  excerpt text not null default '',
  status text not null default 'novo' check (status in ('novo','revisando','encaminhado','ignorado','acao_tomada')),
  assigned_to uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists moderation_hits_status_idx on public.moderation_hits(status,created_at desc);
create index if not exists moderation_hits_user_idx on public.moderation_hits(user_id,created_at desc);
create unique index if not exists moderation_hits_source_term_uq on public.moderation_hits(source_type,source_id,term_id);
alter table public.moderation_hits enable row level security;
drop policy if exists moderation_hits_staff_read on public.moderation_hits;
create policy moderation_hits_staff_read on public.moderation_hits for select to authenticated
using (public.is_staff(10));

create or replace function public.scan_moderated_text(
  p_source_type text,
  p_source_id text,
  p_user_id uuid,
  p_content text
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  row_term public.moderation_terms;
  clean_content text := left(coalesce(p_content,''),2000);
begin
  if trim(clean_content)='' then return; end if;
  for row_term in
    select * from public.moderation_terms
    where enabled and char_length(trim(term))>=2
  loop
    if lower(clean_content) like '%'||lower(trim(row_term.term))||'%' then
      insert into public.moderation_hits(
        term_id,matched_term,category,severity,source_type,source_id,user_id,excerpt
      )
      values(
        row_term.id,row_term.term,row_term.category,row_term.severity,
        left(p_source_type,40),left(p_source_id,100),p_user_id,left(clean_content,500)
      )
      on conflict(source_type,source_id,term_id)
      do update set
        excerpt=excluded.excerpt,
        severity=excluded.severity,
        category=excluded.category,
        updated_at=now();
    end if;
  end loop;
end;
$$;
revoke all on function public.scan_moderated_text(text,text,uuid,text) from public;

create or replace function public.trg_scan_post_text()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.scan_moderated_text('post',new.id::text,new.author_id,new.body);
  return new;
end; $$;
create or replace function public.trg_scan_response_text()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.scan_moderated_text('response',new.id::text,new.author_id,new.body);
  return new;
end; $$;
create or replace function public.trg_scan_plaza_text()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.user_id is not null then perform public.scan_moderated_text('plaza',new.id::text,new.user_id,new.body); end if;
  return new;
end; $$;
create or replace function public.trg_scan_story_text()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.scan_moderated_text('story',new.id::text,new.author_id,new.body);
  return new;
end; $$;
create or replace function public.trg_scan_story_comment_text()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.scan_moderated_text('story_comment',new.id::text,new.user_id,new.body);
  return new;
end; $$;
create or replace function public.trg_scan_photo_comment_text()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.scan_moderated_text('photo_comment',new.id::text,new.user_id,new.body);
  return new;
end; $$;
create or replace function public.trg_scan_profile_text()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  perform public.scan_moderated_text('profile',new.id::text,new.id,coalesce(new.display_name,'')||' '||coalesce(new.bio,'')||' '||coalesce(new.status_message,''));
  return new;
end; $$;

drop trigger if exists posts_moderation_scan on public.posts;
create trigger posts_moderation_scan after insert or update of body on public.posts
for each row execute function public.trg_scan_post_text();
drop trigger if exists responses_moderation_scan on public.responses;
create trigger responses_moderation_scan after insert or update of body on public.responses
for each row execute function public.trg_scan_response_text();
drop trigger if exists plaza_moderation_scan on public.plaza_messages;
create trigger plaza_moderation_scan after insert or update of body on public.plaza_messages
for each row execute function public.trg_scan_plaza_text();
drop trigger if exists stories_moderation_scan on public.stories;
create trigger stories_moderation_scan after insert or update of body on public.stories
for each row execute function public.trg_scan_story_text();
drop trigger if exists story_comments_moderation_scan on public.story_comments;
create trigger story_comments_moderation_scan after insert or update of body on public.story_comments
for each row execute function public.trg_scan_story_comment_text();
drop trigger if exists photo_comments_moderation_scan on public.photo_comments;
create trigger photo_comments_moderation_scan after insert or update of body on public.photo_comments
for each row execute function public.trg_scan_photo_comment_text();
drop trigger if exists profiles_moderation_scan on public.profiles;
create trigger profiles_moderation_scan after insert or update of display_name,bio,status_message on public.profiles
for each row execute function public.trg_scan_profile_text();

-- Staff internal chat.
create table if not exists public.staff_messages(
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  scope text not null default 'all' check (scope in ('all','moderators','senior')),
  body text not null check (char_length(trim(body)) between 1 and 1600),
  created_at timestamptz not null default now()
);
create index if not exists staff_messages_scope_created_idx on public.staff_messages(scope,created_at desc);
alter table public.staff_messages enable row level security;
drop policy if exists staff_messages_read on public.staff_messages;
create policy staff_messages_read on public.staff_messages for select to authenticated
using (
  public.is_staff(10)
  and (
    scope='all'
    or (scope='moderators' and public.current_staff_role() in ('moderator','owner'))
    or (scope='senior' and public.current_staff_role() in ('senior_admin','owner'))
  )
);
drop policy if exists staff_messages_insert on public.staff_messages;
create policy staff_messages_insert on public.staff_messages for insert to authenticated
with check (
  sender_id=(select auth.uid())
  and public.is_staff(10)
  and (
    scope='all'
    or (scope='moderators' and public.current_staff_role() in ('moderator','owner'))
    or (scope='senior' and public.current_staff_role() in ('senior_admin','owner'))
  )
);

-- User badges.
create table if not exists public.badges(
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9_-]{2,50}$'),
  name text not null check (char_length(name) between 2 and 60),
  description text not null default '',
  image_path text not null,
  active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.badges enable row level security;
drop policy if exists badges_public_read on public.badges;
create policy badges_public_read on public.badges for select using (active or public.staff_rank(public.current_staff_role())>=30);

create table if not exists public.user_badges(
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  granted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key(user_id,badge_id)
);
alter table public.user_badges enable row level security;
drop policy if exists user_badges_public_read on public.user_badges;
create policy user_badges_public_read on public.user_badges for select using (true);

-- Owner asset catalog.
create table if not exists public.asset_catalog(
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('wallpaper','avatar','emoticon','character','landing','other')),
  slug text not null check (slug ~ '^[a-z0-9_-]{2,60}$'),
  name text not null check (char_length(name) between 1 and 80),
  storage_path text not null,
  token text,
  metadata jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 100,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(kind,slug)
);
alter table public.asset_catalog enable row level security;
drop policy if exists asset_catalog_public_read on public.asset_catalog;
create policy asset_catalog_public_read on public.asset_catalog for select using (active or public.staff_rank(public.current_staff_role())>=30);

-- CMS blocks, initially focused on landing/auth but generic by page/key.
create table if not exists public.site_content_blocks(
  id uuid primary key default gen_random_uuid(),
  page_slug text not null check (page_slug ~ '^[a-z0-9_-]{2,60}$'),
  block_key text not null check (block_key ~ '^[a-z0-9_.-]{2,100}$'),
  kind text not null default 'text' check (kind in ('text','image','toggle','json')),
  value text not null default '',
  enabled boolean not null default true,
  sort_order integer not null default 100,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  unique(page_slug,block_key)
);
alter table public.site_content_blocks enable row level security;
drop policy if exists site_content_blocks_public_read on public.site_content_blocks;
create policy site_content_blocks_public_read on public.site_content_blocks for select using (true);

insert into public.site_content_blocks(page_slug,block_key,kind,value,sort_order)
values
('home','hero.kicker','text','CONEXÃO RESTABELECIDA // 56K DE HUMANIDADE',10),
('home','hero.title','text','A internet ficou do Avesso. A gente só admitiu.',20),
('home','hero.body','text','Uma rede social onde você não publica sobre si mesmo, não coleciona seguidores e não ganha medalha por ter opinião em horário comercial.',30),
('auth','title','text','Vire do Avesso',10),
('auth','subtitle','text','Leva menos tempo que escolher uma bio “autêntica”.',20)
on conflict(page_slug,block_key) do nothing;

-- Public bucket used only for owner-managed visual assets.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'avesso-assets','avesso-assets',true,10485760,
  array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml']
)
on conflict(id) do update set public=true,file_size_limit=10485760;

drop policy if exists avesso_assets_owner_insert on storage.objects;
create policy avesso_assets_owner_insert on storage.objects for insert to authenticated
with check (
  bucket_id='avesso-assets'
  and public.staff_rank(public.current_staff_role())>=30
  and (storage.foldername(name))[1]=(select auth.uid())::text
);
drop policy if exists avesso_assets_owner_update on storage.objects;
create policy avesso_assets_owner_update on storage.objects for update to authenticated
using (bucket_id='avesso-assets' and public.staff_rank(public.current_staff_role())>=30)
with check (bucket_id='avesso-assets' and public.staff_rank(public.current_staff_role())>=30);
drop policy if exists avesso_assets_owner_delete on storage.objects;
create policy avesso_assets_owner_delete on storage.objects for delete to authenticated
using (bucket_id='avesso-assets' and public.staff_rank(public.current_staff_role())>=30);

-- Staff audit read.
drop policy if exists admin_audit_staff_read on public.admin_audit_log;
create policy admin_audit_staff_read on public.admin_audit_log for select to authenticated
using (public.is_staff(10));

-- Report routing and status.
create or replace function public.staff_update_report(
  p_report_id uuid,
  p_status text,
  p_assigned_to uuid default null,
  p_priority text default null,
  p_staff_notes text default null,
  p_resolution text default null
)
returns public.reports
language plpgsql security definer set search_path=public
as $$
declare
  actor uuid := (select auth.uid());
  role_name text := public.current_staff_role();
  row_out public.reports;
begin
  if public.staff_rank(role_name)<10 then raise exception 'forbidden' using errcode='42501'; end if;
  if p_status not in ('aberto','em_analise','encaminhado','resolvido','descartado','arquivado') then raise exception 'invalid_status'; end if;
  if p_priority is not null and p_priority not in ('baixa','normal','alta','critica') then raise exception 'invalid_priority'; end if;
  if p_assigned_to is not null and not exists(select 1 from public.admin_users where user_id=p_assigned_to) then raise exception 'invalid_assignee'; end if;

  update public.reports
  set status=p_status,
      assigned_to=coalesce(p_assigned_to,assigned_to),
      assigned_by=case when p_assigned_to is not null then actor else assigned_by end,
      assigned_at=case when p_assigned_to is not null then now() else assigned_at end,
      priority=coalesce(p_priority,priority),
      staff_notes=case when p_staff_notes is null then staff_notes else left(p_staff_notes,3000) end,
      resolution=case when p_resolution is null then resolution else left(p_resolution,2000) end,
      resolved_by=case when p_status in ('resolvido','descartado','arquivado') then actor else resolved_by end,
      resolved_at=case when p_status in ('resolvido','descartado','arquivado') then now() else resolved_at end,
      updated_at=now()
  where id=p_report_id
  returning * into row_out;

  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'report_update','report',p_report_id::text,jsonb_build_object('status',p_status,'assigned_to',p_assigned_to,'priority',p_priority));
  return row_out;
end;
$$;

-- Ban/suspension: moderators can act on regular users; seniors can act on moderators; owner can act on all but self.
create or replace function public.staff_set_user_ban(
  p_user_id uuid,
  p_banned boolean,
  p_reason text default '',
  p_until timestamptz default null
)
returns public.user_moderation
language plpgsql security definer set search_path=public
as $$
declare
  actor uuid := (select auth.uid());
  actor_role text := public.current_staff_role();
  actor_rank integer := public.staff_rank(actor_role);
  target_role text;
  target_rank integer;
  row_out public.user_moderation;
begin
  if actor_rank<10 then raise exception 'forbidden' using errcode='42501'; end if;
  if p_user_id=actor then raise exception 'cannot_ban_self'; end if;
  select role into target_role from public.admin_users where user_id=p_user_id;
  target_rank:=public.staff_rank(coalesce(target_role,''));
  if target_rank>=actor_rank then raise exception 'insufficient_rank' using errcode='42501'; end if;
  if p_banned and char_length(trim(coalesce(p_reason,'')))<2 then raise exception 'reason_required'; end if;

  insert into public.user_moderation(user_id,suspended,reason,suspended_until,updated_by,updated_at)
  values(p_user_id,p_banned,left(coalesce(p_reason,''),500),case when p_banned then p_until else null end,actor,now())
  on conflict(user_id) do update set
    suspended=excluded.suspended,
    reason=excluded.reason,
    suspended_until=excluded.suspended_until,
    updated_by=excluded.updated_by,
    updated_at=excluded.updated_at
  returning * into row_out;

  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,case when p_banned then 'ban_user' else 'restore_user' end,'profile',p_user_id::text,
         jsonb_build_object('reason',left(coalesce(p_reason,''),500),'until',p_until,'permanent',p_until is null));
  return row_out;
end;
$$;

-- Direct staff notification to a user.
create or replace function public.staff_notify_user(
  p_user_id uuid,p_title text,p_body text,p_severity text default 'info'
)
returns uuid
language plpgsql security definer set search_path=public
as $$
declare actor uuid := (select auth.uid()); out_id uuid;
begin
  if not public.is_staff(10) then raise exception 'forbidden' using errcode='42501'; end if;
  if p_severity not in ('info','warning','critical') then raise exception 'invalid_severity'; end if;
  insert into public.staff_notifications(recipient_id,sender_id,title,body,severity)
  values(p_user_id,actor,left(trim(p_title),100),left(trim(p_body),600),p_severity)
  returning id into out_id;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'notify_user','profile',p_user_id::text,jsonb_build_object('severity',p_severity,'title',left(trim(p_title),100)));
  return out_id;
end;
$$;

-- Staff warnings: senior can warn/remove moderator; owner can manage all lower roles.
create or replace function public.staff_warn_staff(p_user_id uuid,p_reason text)
returns uuid
language plpgsql security definer set search_path=public
as $$
declare actor uuid := (select auth.uid()); actor_rank int:=public.staff_rank(public.current_staff_role()); target_rank int; out_id uuid;
begin
  select public.staff_rank(role) into target_rank from public.admin_users where user_id=p_user_id;
  if actor_rank<20 or target_rank is null or target_rank>=actor_rank then raise exception 'forbidden' using errcode='42501'; end if;
  insert into public.staff_warnings(staff_user_id,issued_by,reason)
  values(p_user_id,actor,left(trim(p_reason),600))
  returning id into out_id;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'warn_staff','staff',p_user_id::text,jsonb_build_object('reason',left(trim(p_reason),600)));
  return out_id;
end;
$$;

-- Role management. Senior can add/remove moderators only. Owner controls moderator/senior.
create or replace function public.staff_set_role(p_user_id uuid,p_role text)
returns text
language plpgsql security definer set search_path=public
as $$
declare
  actor uuid := (select auth.uid());
  actor_role text := public.current_staff_role();
  actor_rank int := public.staff_rank(actor_role);
  current_role text;
  current_rank int;
begin
  if actor_rank<20 then raise exception 'forbidden' using errcode='42501'; end if;
  select role into current_role from public.admin_users where user_id=p_user_id;
  current_rank:=public.staff_rank(coalesce(current_role,''));

  if actor_role='senior_admin' then
    if p_role not in ('moderator','none') then raise exception 'senior_can_manage_moderators_only'; end if;
    if current_rank>=20 then raise exception 'insufficient_rank'; end if;
  elsif actor_role='owner' then
    if p_role not in ('moderator','senior_admin','none','owner') then raise exception 'invalid_role'; end if;
    if p_user_id=actor and p_role<>'owner' then raise exception 'owner_cannot_demote_self'; end if;
  else
    raise exception 'forbidden';
  end if;

  if p_role='none' then
    delete from public.admin_users where user_id=p_user_id;
  else
    insert into public.admin_users(user_id,role)
    values(p_user_id,p_role)
    on conflict(user_id) do update set role=excluded.role;
  end if;

  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'set_staff_role','profile',p_user_id::text,jsonb_build_object('role',p_role));
  return p_role;
end;
$$;

-- Staff moderation of public content.
create or replace function public.staff_delete_public_content(p_kind text,p_id uuid)
returns boolean
language plpgsql security definer set search_path=public
as $$
declare actor uuid := (select auth.uid()); affected int:=0;
begin
  if not public.is_staff(10) then raise exception 'forbidden' using errcode='42501'; end if;
  case p_kind
    when 'post' then delete from public.posts where id=p_id; get diagnostics affected=row_count;
    when 'response' then delete from public.responses where id=p_id; get diagnostics affected=row_count;
    when 'photo' then delete from public.profile_photos where id=p_id; get diagnostics affected=row_count;
    when 'story' then delete from public.stories where id=p_id; get diagnostics affected=row_count;
    when 'plaza' then delete from public.plaza_messages where id=p_id and user_id is not null; get diagnostics affected=row_count;
    else raise exception 'invalid_kind';
  end case;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'staff_delete_content',p_kind,p_id::text,'{}'::jsonb);
  return affected>0;
end;
$$;

-- Moderation watchlist management.
create or replace function public.staff_upsert_moderation_term(
  p_id uuid,p_term text,p_category text,p_severity text,p_enabled boolean,p_notes text default ''
)
returns public.moderation_terms
language plpgsql security definer set search_path=public
as $$
declare actor uuid := (select auth.uid()); row_out public.moderation_terms;
begin
  if not public.is_staff(10) then raise exception 'forbidden' using errcode='42501'; end if;
  if p_severity not in ('baixa','media','alta','critica') then raise exception 'invalid_severity'; end if;
  if char_length(trim(p_term))<2 then raise exception 'term_too_short'; end if;
  if p_id is null then
    insert into public.moderation_terms(term,category,severity,enabled,notes,created_by)
    values(left(trim(p_term),160),left(trim(p_category),60),p_severity,p_enabled,left(coalesce(p_notes,''),500),actor)
    returning * into row_out;
  else
    update public.moderation_terms set
      term=left(trim(p_term),160),category=left(trim(p_category),60),severity=p_severity,enabled=p_enabled,
      notes=left(coalesce(p_notes,''),500),updated_at=now()
    where id=p_id returning * into row_out;
  end if;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'moderation_term_save','moderation_term',coalesce(row_out.id,p_id)::text,jsonb_build_object('term',left(trim(p_term),80),'severity',p_severity));
  return row_out;
end;
$$;

create or replace function public.staff_update_moderation_hit(
  p_hit_id bigint,p_status text,p_assigned_to uuid default null
)
returns public.moderation_hits
language plpgsql security definer set search_path=public
as $$
declare actor uuid := (select auth.uid()); row_out public.moderation_hits;
begin
  if not public.is_staff(10) then raise exception 'forbidden' using errcode='42501'; end if;
  if p_status not in ('novo','revisando','encaminhado','ignorado','acao_tomada') then raise exception 'invalid_status'; end if;
  update public.moderation_hits
  set status=p_status,assigned_to=coalesce(p_assigned_to,assigned_to),updated_at=now()
  where id=p_hit_id
  returning * into row_out;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'moderation_hit_update','moderation_hit',p_hit_id::text,jsonb_build_object('status',p_status,'assigned_to',p_assigned_to));
  return row_out;
end;
$$;

-- Owner: assets / badges / CMS.
create or replace function public.owner_upsert_asset(
  p_id uuid,p_kind text,p_slug text,p_name text,p_storage_path text,p_token text default null,p_metadata jsonb default '{}'::jsonb,p_active boolean default true
)
returns public.asset_catalog
language plpgsql security definer set search_path=public
as $$
declare actor uuid := (select auth.uid()); row_out public.asset_catalog;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  if p_kind not in ('wallpaper','avatar','emoticon','character','landing','other') then raise exception 'invalid_kind'; end if;
  if p_id is null then
    insert into public.asset_catalog(kind,slug,name,storage_path,token,metadata,active,created_by)
    values(p_kind,p_slug,left(p_name,80),p_storage_path,p_token,coalesce(p_metadata,'{}'::jsonb),p_active,actor)
    returning * into row_out;
  else
    update public.asset_catalog set kind=p_kind,slug=p_slug,name=left(p_name,80),storage_path=p_storage_path,
      token=p_token,metadata=coalesce(p_metadata,'{}'::jsonb),active=p_active
    where id=p_id returning * into row_out;
  end if;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'asset_save','asset',row_out.id::text,jsonb_build_object('kind',p_kind,'slug',p_slug));
  return row_out;
end;
$$;

create or replace function public.owner_upsert_badge(
  p_id uuid,p_slug text,p_name text,p_description text,p_image_path text,p_active boolean default true
)
returns public.badges
language plpgsql security definer set search_path=public
as $$
declare actor uuid := (select auth.uid()); row_out public.badges;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  if p_id is null then
    insert into public.badges(slug,name,description,image_path,active,created_by)
    values(p_slug,left(p_name,60),left(coalesce(p_description,''),300),p_image_path,p_active,actor)
    returning * into row_out;
  else
    update public.badges set slug=p_slug,name=left(p_name,60),description=left(coalesce(p_description,''),300),image_path=p_image_path,active=p_active
    where id=p_id returning * into row_out;
  end if;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'badge_save','badge',row_out.id::text,jsonb_build_object('slug',p_slug,'name',p_name));
  return row_out;
end;
$$;

create or replace function public.owner_grant_badge(p_user_id uuid,p_badge_id uuid,p_grant boolean)
returns boolean
language plpgsql security definer set search_path=public
as $$
declare actor uuid := (select auth.uid());
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  if p_grant then
    insert into public.user_badges(user_id,badge_id,granted_by)
    values(p_user_id,p_badge_id,actor) on conflict do nothing;
  else
    delete from public.user_badges where user_id=p_user_id and badge_id=p_badge_id;
  end if;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,case when p_grant then 'badge_grant' else 'badge_revoke' end,'profile',p_user_id::text,jsonb_build_object('badge_id',p_badge_id));
  return true;
end;
$$;

create or replace function public.owner_save_cms_block(
  p_page_slug text,p_block_key text,p_kind text,p_value text,p_enabled boolean default true,p_sort_order integer default 100
)
returns public.site_content_blocks
language plpgsql security definer set search_path=public
as $$
declare actor uuid := (select auth.uid()); row_out public.site_content_blocks;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  if p_kind not in ('text','image','toggle','json') then raise exception 'invalid_kind'; end if;
  insert into public.site_content_blocks(page_slug,block_key,kind,value,enabled,sort_order,updated_by,updated_at)
  values(p_page_slug,p_block_key,p_kind,left(coalesce(p_value,''),20000),p_enabled,p_sort_order,actor,now())
  on conflict(page_slug,block_key) do update set
    kind=excluded.kind,value=excluded.value,enabled=excluded.enabled,sort_order=excluded.sort_order,
    updated_by=excluded.updated_by,updated_at=excluded.updated_at
  returning * into row_out;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'cms_save','cms',p_page_slug||':'||p_block_key,'{}'::jsonb);
  return row_out;
end;
$$;

-- Owner character editing.
create or replace function public.owner_update_character(
  p_character_id uuid,p_patch jsonb
)
returns public.characters
language plpgsql security definer set search_path=public
as $$
declare actor uuid := (select auth.uid()); row_out public.characters;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  update public.characters set
    name=left(coalesce(p_patch->>'name',name),60),
    role=left(coalesce(p_patch->>'role',role),80),
    bio=left(coalesce(p_patch->>'bio',bio),1200),
    personality=left(coalesce(p_patch->>'personality',personality),2000),
    system_prompt=left(coalesce(p_patch->>'system_prompt',system_prompt),6000),
    accent_color=case when coalesce(p_patch->>'accent_color',accent_color) ~ '^#[0-9A-Fa-f]{6}$' then coalesce(p_patch->>'accent_color',accent_color) else accent_color end,
    avatar_url=coalesce(nullif(p_patch->>'avatar_url',''),avatar_url),
    image_path=coalesce(nullif(p_patch->>'image_path',''),image_path),
    home_location=left(coalesce(p_patch->>'home_location',home_location),100),
    rarity=least(1000,greatest(1,coalesce((p_patch->>'rarity')::int,rarity))),
    ai_enabled=coalesce((p_patch->>'ai_enabled')::boolean,ai_enabled),
    is_active=coalesce((p_patch->>'is_active')::boolean,is_active)
  where id=p_character_id
  returning * into row_out;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'character_update','character',p_character_id::text,jsonb_build_object('slug',row_out.slug));
  return row_out;
end;
$$;

create or replace function public.owner_upsert_character_ai(
  p_character_id uuid,p_model text,p_persona_summary text,p_system_prompt text,p_behavior_rules jsonb,p_voice_rules jsonb,p_max_output_chars integer,p_ai_enabled boolean
)
returns public.character_ai_profiles
language plpgsql security definer set search_path=public
as $$
declare actor uuid := (select auth.uid()); row_out public.character_ai_profiles;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  insert into public.character_ai_profiles(character_id,model,persona_summary,system_prompt,behavior_rules,voice_rules,max_output_chars,ai_enabled,updated_at)
  values(p_character_id,left(p_model,80),left(p_persona_summary,3000),left(p_system_prompt,10000),coalesce(p_behavior_rules,'{}'::jsonb),coalesce(p_voice_rules,'{}'::jsonb),least(1200,greatest(80,p_max_output_chars)),p_ai_enabled,now())
  on conflict(character_id) do update set
    model=excluded.model,persona_summary=excluded.persona_summary,system_prompt=excluded.system_prompt,
    behavior_rules=excluded.behavior_rules,voice_rules=excluded.voice_rules,max_output_chars=excluded.max_output_chars,
    ai_enabled=excluded.ai_enabled,updated_at=now()
  returning * into row_out;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id)
  values(actor,'character_ai_update','character',p_character_id::text);
  return row_out;
end;
$$;

create or replace function public.owner_save_character_dialogue(
  p_id uuid,p_character_id uuid,p_context text,p_body text,p_weight integer,p_enabled boolean
)
returns public.character_dialogues
language plpgsql security definer set search_path=public
as $$
declare actor uuid := (select auth.uid()); row_out public.character_dialogues;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  if p_id is null then
    insert into public.character_dialogues(character_id,context,body,weight,enabled)
    values(p_character_id,p_context,left(p_body,420),least(100,greatest(1,p_weight)),p_enabled)
    returning * into row_out;
  else
    update public.character_dialogues set context=p_context,body=left(p_body,420),weight=least(100,greatest(1,p_weight)),enabled=p_enabled
    where id=p_id returning * into row_out;
  end if;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id)
  values(actor,'character_dialogue_save','dialogue',row_out.id::text);
  return row_out;
end;
$$;

-- Safe owner database explorer. No arbitrary SQL in a public browser.
create or replace function public.owner_db_table_rows(p_table text,p_limit integer default 50)
returns jsonb
language plpgsql stable security definer set search_path=public
as $$
declare out_json jsonb; lim int:=least(100,greatest(1,coalesce(p_limit,50)));
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  case p_table
    when 'profiles' then select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into out_json from (select * from public.profiles order by created_at desc limit lim) x;
    when 'posts' then select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into out_json from (select * from public.posts order by created_at desc limit lim) x;
    when 'reports' then select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into out_json from (select * from public.reports order by created_at desc limit lim) x;
    when 'moderation_hits' then select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into out_json from (select * from public.moderation_hits order by created_at desc limit lim) x;
    when 'characters' then select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into out_json from (select * from public.characters order by created_at desc limit lim) x;
    when 'asset_catalog' then select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into out_json from (select * from public.asset_catalog order by created_at desc limit lim) x;
    when 'badges' then select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into out_json from (select * from public.badges order by created_at desc limit lim) x;
    when 'site_content_blocks' then select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into out_json from (select * from public.site_content_blocks order by page_slug,sort_order limit lim) x;
    when 'admin_audit_log' then select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) into out_json from (select * from public.admin_audit_log order by created_at desc limit lim) x;
    else raise exception 'table_not_allowed';
  end case;
  return out_json;
end;
$$;

-- Unified staff dashboard snapshot.
create or replace function public.staff_dashboard_snapshot()
returns jsonb
language plpgsql stable security definer set search_path=public
as $$
declare result jsonb; actor_role text:=public.current_staff_role(); actor_rank int:=public.staff_rank(actor_role);
begin
  if actor_rank<10 then raise exception 'forbidden' using errcode='42501'; end if;
  select jsonb_build_object(
    'role',actor_role,
    'counts',jsonb_build_object(
      'users',(select count(*) from public.profiles),
      'online',(select count(*) from public.profiles where presence_mode<>'invisible' and online_until>now()),
      'reports_open',(select count(*) from public.reports where status in ('aberto','em_analise','encaminhado')),
      'hits_open',(select count(*) from public.moderation_hits where status in ('novo','revisando','encaminhado')),
      'banned',(select count(*) from public.user_moderation where suspended and (suspended_until is null or suspended_until>now())),
      'staff',(select count(*) from public.admin_users)
    ),
    'staff',coalesce((
      select jsonb_agg(jsonb_build_object(
        'user_id',a.user_id,'role',a.role,'display_name',p.display_name,'handle',p.handle,'avatar_url',p.avatar_url,
        'warnings',(select count(*) from public.staff_warnings w where w.staff_user_id=a.user_id and w.active)
      ) order by public.staff_rank(a.role) desc,p.display_name)
      from public.admin_users a join public.profiles p on p.id=a.user_id
    ),'[]'::jsonb),
    'reports',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc)
      from (
        select r.*,rp.handle reporter_handle,tp.handle reported_handle,ap.handle assigned_handle
        from public.reports r
        left join public.profiles rp on rp.id=r.reporter_id
        left join public.profiles tp on tp.id=r.reported_profile_id
        left join public.profiles ap on ap.id=r.assigned_to
        order by r.created_at desc limit 80
      ) x
    ),'[]'::jsonb),
    'hits',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc)
      from (
        select h.*,p.handle user_handle,a.handle assigned_handle
        from public.moderation_hits h
        left join public.profiles p on p.id=h.user_id
        left join public.profiles a on a.id=h.assigned_to
        order by h.created_at desc limit 100
      ) x
    ),'[]'::jsonb),
    'terms',coalesce((select jsonb_agg(to_jsonb(t) order by t.severity desc,t.term) from public.moderation_terms t),'[]'::jsonb),
    'users',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc)
      from (
        select p.id,p.display_name,p.handle,p.avatar_url,p.status_message,p.bio,p.created_at,p.presence_mode,p.last_seen,p.online_until,
          a.role as staff_role,
          coalesce(m.suspended,false) and (m.suspended_until is null or m.suspended_until>now()) as banned,
          m.reason as ban_reason,m.suspended_until
        from public.profiles p
        left join public.admin_users a on a.user_id=p.id
        left join public.user_moderation m on m.user_id=p.id
        order by p.created_at desc limit 100
      ) x
    ),'[]'::jsonb),
    'plaza',coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc)
      from (
        select m.id,m.user_id,m.body,m.created_at,p.handle,p.display_name
        from public.plaza_messages m left join public.profiles p on p.id=m.user_id
        where m.user_id is not null order by m.created_at desc limit 80
      ) x
    ),'[]'::jsonb),
    'warnings',case when actor_rank>=20 then coalesce((
      select jsonb_agg(to_jsonb(x) order by x.created_at desc)
      from (
        select w.*,p.handle staff_handle,i.handle issuer_handle
        from public.staff_warnings w
        join public.profiles p on p.id=w.staff_user_id
        join public.profiles i on i.id=w.issued_by
        order by w.created_at desc limit 80
      ) x
    ),'[]'::jsonb) else '[]'::jsonb end,
    'audit',case when actor_rank>=20 then coalesce((
      select jsonb_agg(to_jsonb(a) order by a.created_at desc)
      from (select * from public.admin_audit_log order by created_at desc limit 100) a
    ),'[]'::jsonb) else '[]'::jsonb end,
    'site',case when actor_role='owner' then coalesce((select to_jsonb(s) from public.site_settings s where id='global'),'{}'::jsonb) else '{}'::jsonb end,
    'cms',case when actor_role='owner' then coalesce((select jsonb_agg(to_jsonb(c) order by c.page_slug,c.sort_order) from public.site_content_blocks c),'[]'::jsonb) else '[]'::jsonb end,
    'assets',case when actor_role='owner' then coalesce((select jsonb_agg(to_jsonb(a) order by a.kind,a.sort_order,a.name) from public.asset_catalog a),'[]'::jsonb) else '[]'::jsonb end,
    'badges',case when actor_role='owner' then coalesce((select jsonb_agg(to_jsonb(b) order by b.name) from public.badges b),'[]'::jsonb) else '[]'::jsonb end,
    'characters',case when actor_role='owner' then coalesce((
      select jsonb_agg(jsonb_build_object(
        'character',to_jsonb(c),
        'ai',coalesce((select to_jsonb(ai) from public.character_ai_profiles ai where ai.character_id=c.id),'{}'::jsonb),
        'dialogues',coalesce((select jsonb_agg(to_jsonb(d) order by d.context,d.weight desc) from public.character_dialogues d where d.character_id=c.id),'[]'::jsonb)
      ) order by c.name) from public.characters c
    ),'[]'::jsonb) else '[]'::jsonb end
  ) into result;
  return result;
end;
$$;

-- Grants
grant select on public.admin_users to authenticated;
grant select on public.reports to authenticated;
grant select on public.staff_warnings to authenticated;
grant select,update on public.staff_notifications to authenticated;
grant select on public.moderation_terms to authenticated;
grant select on public.moderation_hits to authenticated;
grant select,insert on public.staff_messages to authenticated;
grant select on public.badges to anon,authenticated;
grant select on public.user_badges to anon,authenticated;
grant select on public.asset_catalog to anon,authenticated;
grant select on public.site_content_blocks to anon,authenticated;

revoke all on function public.staff_update_report(uuid,text,uuid,text,text,text) from public;
revoke all on function public.staff_set_user_ban(uuid,boolean,text,timestamptz) from public;
revoke all on function public.staff_notify_user(uuid,text,text,text) from public;
revoke all on function public.staff_warn_staff(uuid,text) from public;
revoke all on function public.staff_set_role(uuid,text) from public;
revoke all on function public.staff_delete_public_content(text,uuid) from public;
revoke all on function public.staff_upsert_moderation_term(uuid,text,text,text,boolean,text) from public;
revoke all on function public.staff_update_moderation_hit(bigint,text,uuid) from public;
revoke all on function public.owner_upsert_asset(uuid,text,text,text,text,text,jsonb,boolean) from public;
revoke all on function public.owner_upsert_badge(uuid,text,text,text,text,boolean) from public;
revoke all on function public.owner_grant_badge(uuid,uuid,boolean) from public;
revoke all on function public.owner_save_cms_block(text,text,text,text,boolean,integer) from public;
revoke all on function public.owner_update_character(uuid,jsonb) from public;
revoke all on function public.owner_upsert_character_ai(uuid,text,text,text,jsonb,jsonb,integer,boolean) from public;
revoke all on function public.owner_save_character_dialogue(uuid,uuid,text,text,integer,boolean) from public;
revoke all on function public.owner_db_table_rows(text,integer) from public;
revoke all on function public.staff_dashboard_snapshot() from public;

grant execute on function public.staff_update_report(uuid,text,uuid,text,text,text) to authenticated;
grant execute on function public.staff_set_user_ban(uuid,boolean,text,timestamptz) to authenticated;
grant execute on function public.staff_notify_user(uuid,text,text,text) to authenticated;
grant execute on function public.staff_warn_staff(uuid,text) to authenticated;
grant execute on function public.staff_set_role(uuid,text) to authenticated;
grant execute on function public.staff_delete_public_content(text,uuid) to authenticated;
grant execute on function public.staff_upsert_moderation_term(uuid,text,text,text,boolean,text) to authenticated;
grant execute on function public.staff_update_moderation_hit(bigint,text,uuid) to authenticated;
grant execute on function public.owner_upsert_asset(uuid,text,text,text,text,text,jsonb,boolean) to authenticated;
grant execute on function public.owner_upsert_badge(uuid,text,text,text,text,boolean) to authenticated;
grant execute on function public.owner_grant_badge(uuid,uuid,boolean) to authenticated;
grant execute on function public.owner_save_cms_block(text,text,text,text,boolean,integer) to authenticated;
grant execute on function public.owner_update_character(uuid,jsonb) to authenticated;
grant execute on function public.owner_upsert_character_ai(uuid,text,text,text,jsonb,jsonb,integer,boolean) to authenticated;
grant execute on function public.owner_save_character_dialogue(uuid,uuid,text,text,integer,boolean) to authenticated;
grant execute on function public.owner_db_table_rows(text,integer) to authenticated;
grant execute on function public.staff_dashboard_snapshot() to authenticated;

-- Seed a conservative initial watchlist. Staff can expand it from the dashboard.
insert into public.moderation_terms(term,category,severity,enabled,notes,created_by)
select x.term,x.category,x.severity,true,'lista inicial; revisar contexto antes de agir',(select id from public.profiles where handle='beertofcoelho')
from (values
  ('vou te matar','ameaça','critica'),
  ('matar você','ameaça','critica'),
  ('ameaça de morte','ameaça','critica'),
  ('racismo','discriminação','alta'),
  ('homofobia','discriminação','alta'),
  ('nazista','extremismo','alta')
) as x(term,category,severity)
on conflict do nothing;

-- Make staff messages realtime when not already in the publication.
do $$
begin
  if not exists(
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='staff_messages'
  ) then
    alter publication supabase_realtime add table public.staff_messages;
  end if;
  if not exists(
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='staff_notifications'
  ) then
    alter publication supabase_realtime add table public.staff_notifications;
  end if;
end $$;


-- =============================================================
-- 20261001055625 staff_dashboard_v2_experience
-- =============================================================
alter table public.site_settings
  add column if not exists feed_config jsonb not null default '{"page_size":40,"show_tower":true,"show_stories":true}'::jsonb,
  add column if not exists story_config jsonb not null default '{"duration_hours":24,"camera_enabled":true,"max_video_seconds":15,"default_visibility":"publico"}'::jsonb,
  add column if not exists layout_config jsonb not null default '{"density":"compact","feed_width":"normal","sidebar_mode":"fixed"}'::jsonb;

create or replace function public.owner_update_experience_settings(
  p_feed_config jsonb,
  p_story_config jsonb,
  p_layout_config jsonb
)
returns public.site_settings
language plpgsql security definer set search_path=public
as $$
declare actor uuid := (select auth.uid()); row_out public.site_settings;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;

  if coalesce((p_feed_config->>'page_size')::int,40) not between 10 and 60 then raise exception 'invalid_page_size'; end if;
  if coalesce((p_story_config->>'duration_hours')::int,24) not between 1 and 24 then raise exception 'invalid_story_duration'; end if;
  if coalesce((p_story_config->>'max_video_seconds')::int,15) not between 5 and 30 then raise exception 'invalid_video_seconds'; end if;
  if coalesce(p_story_config->>'default_visibility','publico') not in ('publico','amigos') then raise exception 'invalid_story_visibility'; end if;
  if coalesce(p_layout_config->>'density','compact') not in ('compact','comfortable') then raise exception 'invalid_density'; end if;
  if coalesce(p_layout_config->>'feed_width','normal') not in ('narrow','normal','wide') then raise exception 'invalid_feed_width'; end if;
  if coalesce(p_layout_config->>'sidebar_mode','fixed') not in ('fixed','compact') then raise exception 'invalid_sidebar_mode'; end if;

  update public.site_settings
  set feed_config=jsonb_build_object(
        'page_size',coalesce((p_feed_config->>'page_size')::int,40),
        'show_tower',coalesce((p_feed_config->>'show_tower')::boolean,true),
        'show_stories',coalesce((p_feed_config->>'show_stories')::boolean,true)
      ),
      story_config=jsonb_build_object(
        'duration_hours',coalesce((p_story_config->>'duration_hours')::int,24),
        'camera_enabled',coalesce((p_story_config->>'camera_enabled')::boolean,true),
        'max_video_seconds',coalesce((p_story_config->>'max_video_seconds')::int,15),
        'default_visibility',coalesce(p_story_config->>'default_visibility','publico')
      ),
      layout_config=jsonb_build_object(
        'density',coalesce(p_layout_config->>'density','compact'),
        'feed_width',coalesce(p_layout_config->>'feed_width','normal'),
        'sidebar_mode',coalesce(p_layout_config->>'sidebar_mode','fixed')
      ),
      updated_by=actor,updated_at=now()
  where id='global'
  returning * into row_out;

  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'experience_settings_update','site','global',jsonb_build_object(
    'feed',row_out.feed_config,'stories',row_out.story_config,'layout',row_out.layout_config
  ));
  return row_out;
end;
$$;
revoke all on function public.owner_update_experience_settings(jsonb,jsonb,jsonb) from public;
grant execute on function public.owner_update_experience_settings(jsonb,jsonb,jsonb) to authenticated;

create or replace function public.owner_create_character(
  p_slug text,p_name text,p_role text,p_bio text default '',p_accent_color text default '#d8ff3e'
)
returns public.characters
language plpgsql security definer set search_path=public
as $$
declare actor uuid := (select auth.uid()); row_out public.characters;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  if p_slug !~ '^[a-z0-9_]{2,40}$' then raise exception 'invalid_slug'; end if;
  if p_accent_color !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'invalid_color'; end if;
  insert into public.characters(slug,name,role,bio,accent_color,is_active,personality,system_prompt,home_location,presence_state,rarity,ai_enabled,meta)
  values(p_slug,left(p_name,60),left(p_role,80),left(coalesce(p_bio,''),1200),p_accent_color,true,'','','Praça Central','idle',50,false,'{}'::jsonb)
  returning * into row_out;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'character_create','character',row_out.id::text,jsonb_build_object('slug',p_slug));
  return row_out;
end;
$$;
revoke all on function public.owner_create_character(text,text,text,text,text) from public;
grant execute on function public.owner_create_character(text,text,text,text,text) to authenticated;

create or replace function public.owner_remove_character(p_character_id uuid,p_hard_delete boolean default false)
returns boolean
language plpgsql security definer set search_path=public
as $$
declare actor uuid := (select auth.uid()); affected int:=0; slug_name text;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  select slug into slug_name from public.characters where id=p_character_id;
  if p_hard_delete then
    delete from public.characters where id=p_character_id;
    get diagnostics affected=row_count;
  else
    update public.characters set is_active=false,presence_state='offline' where id=p_character_id;
    get diagnostics affected=row_count;
  end if;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,case when p_hard_delete then 'character_delete' else 'character_deactivate' end,'character',p_character_id::text,jsonb_build_object('slug',slug_name));
  return affected>0;
end;
$$;
revoke all on function public.owner_remove_character(uuid,boolean) from public;
grant execute on function public.owner_remove_character(uuid,boolean) to authenticated;


-- =============================================================
-- 20261001055746 staff_dashboard_v2_legacy_hardening
-- =============================================================
create or replace function public.admin_set_world_controls(p_events boolean,p_interventions boolean,p_message text)
returns public.world_settings
language plpgsql security definer set search_path=public
as $$
declare row_out public.world_settings;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  update public.world_settings
  set world_events_enabled=p_events,world_interventions_enabled=p_interventions,
      message=left(coalesce(p_message,''),240),updated_at=now()
  where id='global'
  returning * into row_out;
  return row_out;
end;
$$;

create or replace function public.admin_update_site_settings(
  p_site_name text,p_tagline text,p_color_bg text,p_color_panel text,p_color_panel2 text,
  p_color_ink text,p_color_muted text,p_color_line text,p_color_acid text,p_color_cyan text,
  p_color_coral text,p_color_violet text,p_custom_css text,p_announcement text
)
returns public.site_settings
language plpgsql security definer set search_path=public
as $$
declare row_out public.site_settings; actor uuid:=(select auth.uid()); c text;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  foreach c in array array[p_color_bg,p_color_panel,p_color_panel2,p_color_ink,p_color_muted,p_color_line,p_color_acid,p_color_cyan,p_color_coral,p_color_violet] loop
    if c !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'invalid_color'; end if;
  end loop;
  update public.site_settings set
    site_name=left(coalesce(nullif(trim(p_site_name),''),'AVESSO'),40),
    tagline=left(coalesce(p_tagline,''),120),
    color_bg=p_color_bg,color_panel=p_color_panel,color_panel2=p_color_panel2,
    color_ink=p_color_ink,color_muted=p_color_muted,color_line=p_color_line,
    color_acid=p_color_acid,color_cyan=p_color_cyan,color_coral=p_color_coral,color_violet=p_color_violet,
    custom_css=left(coalesce(p_custom_css,''),20000),announcement=left(coalesce(p_announcement,''),240),
    updated_by=actor,updated_at=now()
  where id='global' returning * into row_out;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id)
  values(actor,'update_site_settings','site','global');
  return row_out;
end;
$$;

create or replace function public.admin_dashboard_snapshot()
returns jsonb
language plpgsql stable security definer set search_path=public
as $$
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  return public.staff_dashboard_snapshot();
end;
$$;

create or replace function public.admin_set_user_role(p_user_id uuid,p_role text)
returns text
language plpgsql security definer set search_path=public
as $$
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  return public.staff_set_role(p_user_id,case when p_role='admin' then 'senior_admin' else p_role end);
end;
$$;


-- =============================================================
-- 20261001062920 staff_dashboard_owner_db_patch
-- =============================================================
create or replace function public.owner_db_patch_row(p_table text,p_id text,p_patch jsonb)
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare
  actor uuid := (select auth.uid());
  out_row jsonb;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  if p_patch is null or jsonb_typeof(p_patch)<>'object' then raise exception 'invalid_patch'; end if;

  case p_table
    when 'profiles' then
      update public.profiles set
        display_name=case when p_patch ? 'display_name' then left(p_patch->>'display_name',80) else display_name end,
        bio=case when p_patch ? 'bio' then left(p_patch->>'bio',300) else bio end,
        status_message=case when p_patch ? 'status_message' then left(p_patch->>'status_message',140) else status_message end,
        profile_wallpaper=case when p_patch ? 'profile_wallpaper' then left(p_patch->>'profile_wallpaper',80) else profile_wallpaper end,
        app_wallpaper=case when p_patch ? 'app_wallpaper' then left(p_patch->>'app_wallpaper',80) else app_wallpaper end,
        updated_at=now()
      where id=p_id::uuid returning to_jsonb(profiles.*) into out_row;

    when 'posts' then
      update public.posts set
        body=case when p_patch ? 'body' then left(p_patch->>'body',420) else body end,
        edited_at=case when p_patch ? 'body' then now() else edited_at end
      where id=p_id::uuid returning to_jsonb(posts.*) into out_row;

    when 'reports' then
      update public.reports set
        status=case when p_patch ? 'status' and p_patch->>'status' in ('aberto','em_analise','encaminhado','resolvido','descartado','arquivado') then p_patch->>'status' else status end,
        priority=case when p_patch ? 'priority' and p_patch->>'priority' in ('baixa','normal','alta','critica') then p_patch->>'priority' else priority end,
        staff_notes=case when p_patch ? 'staff_notes' then left(p_patch->>'staff_notes',3000) else staff_notes end,
        resolution=case when p_patch ? 'resolution' then left(p_patch->>'resolution',2000) else resolution end,
        updated_at=now()
      where id=p_id::uuid returning to_jsonb(reports.*) into out_row;

    when 'moderation_hits' then
      update public.moderation_hits set
        status=case when p_patch ? 'status' and p_patch->>'status' in ('novo','revisando','encaminhado','ignorado','acao_tomada') then p_patch->>'status' else status end,
        updated_at=now()
      where id=p_id::bigint returning to_jsonb(moderation_hits.*) into out_row;

    when 'characters' then
      update public.characters set
        name=case when p_patch ? 'name' then left(p_patch->>'name',60) else name end,
        role=case when p_patch ? 'role' then left(p_patch->>'role',80) else role end,
        bio=case when p_patch ? 'bio' then left(p_patch->>'bio',1200) else bio end,
        personality=case when p_patch ? 'personality' then left(p_patch->>'personality',2000) else personality end,
        system_prompt=case when p_patch ? 'system_prompt' then left(p_patch->>'system_prompt',6000) else system_prompt end,
        accent_color=case when p_patch ? 'accent_color' and (p_patch->>'accent_color') ~ '^#[0-9A-Fa-f]{6}$' then p_patch->>'accent_color' else accent_color end,
        avatar_url=case when p_patch ? 'avatar_url' then nullif(p_patch->>'avatar_url','') else avatar_url end,
        home_location=case when p_patch ? 'home_location' then left(p_patch->>'home_location',100) else home_location end,
        rarity=case when p_patch ? 'rarity' then least(1000,greatest(1,(p_patch->>'rarity')::int)) else rarity end,
        ai_enabled=case when p_patch ? 'ai_enabled' then (p_patch->>'ai_enabled')::boolean else ai_enabled end,
        is_active=case when p_patch ? 'is_active' then (p_patch->>'is_active')::boolean else is_active end
      where id=p_id::uuid returning to_jsonb(characters.*) into out_row;

    when 'asset_catalog' then
      update public.asset_catalog set
        name=case when p_patch ? 'name' then left(p_patch->>'name',80) else name end,
        token=case when p_patch ? 'token' then nullif(p_patch->>'token','') else token end,
        metadata=case when p_patch ? 'metadata' then p_patch->'metadata' else metadata end,
        active=case when p_patch ? 'active' then (p_patch->>'active')::boolean else active end,
        sort_order=case when p_patch ? 'sort_order' then (p_patch->>'sort_order')::int else sort_order end
      where id=p_id::uuid returning to_jsonb(asset_catalog.*) into out_row;

    when 'badges' then
      update public.badges set
        name=case when p_patch ? 'name' then left(p_patch->>'name',60) else name end,
        description=case when p_patch ? 'description' then left(p_patch->>'description',300) else description end,
        active=case when p_patch ? 'active' then (p_patch->>'active')::boolean else active end
      where id=p_id::uuid returning to_jsonb(badges.*) into out_row;

    when 'site_content_blocks' then
      update public.site_content_blocks set
        value=case when p_patch ? 'value' then left(p_patch->>'value',20000) else value end,
        enabled=case when p_patch ? 'enabled' then (p_patch->>'enabled')::boolean else enabled end,
        sort_order=case when p_patch ? 'sort_order' then (p_patch->>'sort_order')::int else sort_order end,
        updated_by=actor,updated_at=now()
      where id=p_id::uuid returning to_jsonb(site_content_blocks.*) into out_row;

    else raise exception 'table_not_patchable';
  end case;

  if out_row is null then raise exception 'row_not_found'; end if;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'db_patch',p_table,p_id,jsonb_build_object('patch',p_patch));
  return out_row;
end;
$$;

revoke all on function public.owner_db_patch_row(text,text,jsonb) from public;
grant execute on function public.owner_db_patch_row(text,text,jsonb) to authenticated;


-- =============================================================
-- 20261001063854 staff_roles_moderation_chat_core
-- =============================================================
alter table public.admin_users drop constraint if exists admin_users_role_check;
alter table public.admin_users
  add constraint admin_users_role_check
  check (role in ('moderator','senior_admin','owner'));

create or replace function public.staff_role_rank(p_role text)
returns integer language sql immutable as $$
  select case p_role when 'moderator' then 10 when 'senior_admin' then 20 when 'owner' then 30 else 0 end;
$$;

create or replace function public.current_staff_role()
returns text language sql stable security definer set search_path=public as $$
  select role from public.admin_users where user_id=(select auth.uid());
$$;
revoke all on function public.current_staff_role() from public;
grant execute on function public.current_staff_role() to authenticated;

create or replace function public.staff_can(p_min_role text)
returns boolean language sql stable security definer set search_path=public as $$
  select public.staff_role_rank(coalesce((select role from public.admin_users where user_id=(select auth.uid())),'')) >= public.staff_role_rank(p_min_role);
$$;
revoke all on function public.staff_can(text) from public;
grant execute on function public.staff_can(text) to authenticated;

create or replace function public.is_avesso_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select public.staff_can('moderator');
$$;
revoke all on function public.is_avesso_admin() from public;
grant execute on function public.is_avesso_admin() to authenticated;

create table if not exists public.staff_warnings (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid not null references public.profiles(id) on delete cascade,
  issued_by uuid not null references public.profiles(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 3 and 800),
  severity text not null default 'advertencia' check (severity in ('observacao','advertencia','grave')),
  created_at timestamptz not null default now(),
  acknowledged_at timestamptz null
);
create index if not exists staff_warnings_staff_created_idx on public.staff_warnings(staff_user_id,created_at desc);
alter table public.staff_warnings enable row level security;

create table if not exists public.user_staff_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  sent_by uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 1200),
  severity text not null default 'info' check (severity in ('info','aviso','moderacao','critico')),
  read_at timestamptz null,
  created_at timestamptz not null default now()
);
create index if not exists user_staff_notifications_user_created_idx on public.user_staff_notifications(user_id,created_at desc);
alter table public.user_staff_notifications enable row level security;
drop policy if exists user_staff_notifications_read_self on public.user_staff_notifications;
create policy user_staff_notifications_read_self on public.user_staff_notifications for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists user_staff_notifications_update_self on public.user_staff_notifications;
create policy user_staff_notifications_update_self on public.user_staff_notifications for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));
grant select,update on public.user_staff_notifications to authenticated;

create table if not exists public.staff_chat_messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  channel text not null check (channel in ('all','moderators','senior')),
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists staff_chat_messages_channel_created_idx on public.staff_chat_messages(channel,created_at desc);
alter table public.staff_chat_messages enable row level security;

create or replace function public.can_access_staff_channel(p_channel text)
returns boolean language plpgsql stable security definer set search_path=public as $$
declare r text := public.current_staff_role();
begin
  if r is null then return false; end if;
  if p_channel='all' then return true; end if;
  if p_channel='moderators' then return r in ('moderator','owner'); end if;
  if p_channel='senior' then return r in ('senior_admin','owner'); end if;
  return false;
end;
$$;
revoke all on function public.can_access_staff_channel(text) from public;
grant execute on function public.can_access_staff_channel(text) to authenticated;

drop policy if exists staff_chat_select on public.staff_chat_messages;
create policy staff_chat_select on public.staff_chat_messages for select to authenticated using (public.can_access_staff_channel(channel));
drop policy if exists staff_chat_insert on public.staff_chat_messages;
create policy staff_chat_insert on public.staff_chat_messages for insert to authenticated with check (sender_id=(select auth.uid()) and public.can_access_staff_channel(channel));
drop policy if exists staff_chat_delete_self on public.staff_chat_messages;
create policy staff_chat_delete_self on public.staff_chat_messages for delete to authenticated using (sender_id=(select auth.uid()) or public.staff_can('owner'));
grant select,insert,delete on public.staff_chat_messages to authenticated;

create table if not exists public.moderation_terms (
  id uuid primary key default gen_random_uuid(),
  term text not null check (char_length(trim(term)) between 2 and 160),
  category text not null default 'outro' check (category in ('racismo','homofobia','ameaca','crime','assedio','spam','outro')),
  severity text not null default 'alta' check (severity in ('baixa','normal','alta','critica')),
  notes text not null default '' check (char_length(notes)<=500),
  active boolean not null default true,
  created_by uuid null references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists moderation_terms_term_lower_uidx on public.moderation_terms(lower(term));
alter table public.moderation_terms enable row level security;

create table if not exists public.moderation_alerts (
  id uuid primary key default gen_random_uuid(),
  term_id uuid null references public.moderation_terms(id) on delete set null,
  source_type text not null check (source_type in ('post','response','plaza','story','guestbook','profile')),
  source_id uuid not null,
  user_id uuid null references public.profiles(id) on delete set null,
  matched_term text not null,
  excerpt text not null default '',
  severity text not null default 'alta' check (severity in ('baixa','normal','alta','critica')),
  status text not null default 'novo' check (status in ('novo','em_analise','resolvido','ignorado','encaminhado')),
  assigned_to uuid null references public.profiles(id) on delete set null,
  resolution text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(term_id,source_type,source_id)
);
create index if not exists moderation_alerts_status_created_idx on public.moderation_alerts(status,created_at desc);
alter table public.moderation_alerts enable row level security;

create or replace function public.scan_moderation_text(p_source_type text,p_source_id uuid,p_user_id uuid,p_text text)
returns void language plpgsql security definer set search_path=public as $$
declare t record; normalized text := lower(coalesce(p_text,''));
begin
  if length(trim(normalized))=0 then return; end if;
  for t in select id,term,severity from public.moderation_terms where active=true loop
    if position(lower(t.term) in normalized)>0 then
      insert into public.moderation_alerts(term_id,source_type,source_id,user_id,matched_term,excerpt,severity)
      values(t.id,p_source_type,p_source_id,p_user_id,t.term,left(coalesce(p_text,''),500),t.severity)
      on conflict(term_id,source_type,source_id) do update set excerpt=excluded.excerpt,severity=excluded.severity,updated_at=now();
    end if;
  end loop;
end;
$$;
revoke all on function public.scan_moderation_text(text,uuid,uuid,text) from public;

create or replace function public.trg_scan_post_text() returns trigger language plpgsql security definer set search_path=public as $$ begin perform public.scan_moderation_text('post',new.id,new.author_id,new.body); return new; end; $$;
create or replace function public.trg_scan_response_text() returns trigger language plpgsql security definer set search_path=public as $$ begin perform public.scan_moderation_text('response',new.id,new.author_id,new.body); return new; end; $$;
create or replace function public.trg_scan_plaza_text() returns trigger language plpgsql security definer set search_path=public as $$ begin if new.user_id is not null then perform public.scan_moderation_text('plaza',new.id,new.user_id,new.body); end if; return new; end; $$;
create or replace function public.trg_scan_story_text() returns trigger language plpgsql security definer set search_path=public as $$ begin perform public.scan_moderation_text('story',new.id,new.author_id,new.body); return new; end; $$;
create or replace function public.trg_scan_guestbook_text() returns trigger language plpgsql security definer set search_path=public as $$ begin perform public.scan_moderation_text('guestbook',new.id,new.author_id,new.body); return new; end; $$;
create or replace function public.trg_scan_profile_text() returns trigger language plpgsql security definer set search_path=public as $$ begin perform public.scan_moderation_text('profile',new.id,new.id,concat_ws(' ',new.display_name,new.handle,new.status_message,new.bio)); return new; end; $$;

drop trigger if exists scan_post_text on public.posts;
create trigger scan_post_text after insert or update of body on public.posts for each row execute function public.trg_scan_post_text();
drop trigger if exists scan_response_text on public.responses;
create trigger scan_response_text after insert or update of body on public.responses for each row execute function public.trg_scan_response_text();
drop trigger if exists scan_plaza_text on public.plaza_messages;
create trigger scan_plaza_text after insert or update of body on public.plaza_messages for each row execute function public.trg_scan_plaza_text();
drop trigger if exists scan_story_text on public.stories;
create trigger scan_story_text after insert or update of body on public.stories for each row execute function public.trg_scan_story_text();
drop trigger if exists scan_guestbook_text on public.guestbook_entries;
create trigger scan_guestbook_text after insert or update of body on public.guestbook_entries for each row execute function public.trg_scan_guestbook_text();
drop trigger if exists scan_profile_text on public.profiles;
create trigger scan_profile_text after insert or update of display_name,handle,status_message,bio on public.profiles for each row execute function public.trg_scan_profile_text();

insert into public.moderation_terms(term,category,severity,notes)
values
  ('racismo','racismo','alta','contexto deve ser revisado por humano'),
  ('homofobia','homofobia','alta','contexto deve ser revisado por humano'),
  ('ameaça','ameaca','alta','contexto deve ser revisado por humano'),
  ('nazismo','crime','critica','contexto deve ser revisado por humano'),
  ('estupro','crime','critica','contexto deve ser revisado por humano')
on conflict do nothing;


-- =============================================================
-- 20261001063937 owner_assets_badges_cms_terms
-- =============================================================
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('avesso-admin-assets','avesso-admin-assets',true,10485760,array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml'])
on conflict(id) do update set public=true,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists avesso_admin_assets_owner_insert on storage.objects;
create policy avesso_admin_assets_owner_insert on storage.objects for insert to authenticated
with check (bucket_id='avesso-admin-assets' and public.staff_can('owner'));
drop policy if exists avesso_admin_assets_owner_update on storage.objects;
create policy avesso_admin_assets_owner_update on storage.objects for update to authenticated
using (bucket_id='avesso-admin-assets' and public.staff_can('owner'))
with check (bucket_id='avesso-admin-assets' and public.staff_can('owner'));
drop policy if exists avesso_admin_assets_owner_delete on storage.objects;
create policy avesso_admin_assets_owner_delete on storage.objects for delete to authenticated
using (bucket_id='avesso-admin-assets' and public.staff_can('owner'));

create table if not exists public.admin_assets (
  id uuid primary key default gen_random_uuid(),
  asset_type text not null check (asset_type in ('wallpaper','avatar','emoticon','badge','character','page_image')),
  name text not null check (char_length(name) between 1 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9_-]{0,79}$'),
  storage_path text not null,
  mime_type text not null default 'image/webp',
  shortcode text not null default '',
  meta jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_assets enable row level security;
drop policy if exists admin_assets_public_read on public.admin_assets;
create policy admin_assets_public_read on public.admin_assets for select using (active=true or public.staff_can('owner'));
drop policy if exists admin_assets_owner_all on public.admin_assets;
create policy admin_assets_owner_all on public.admin_assets for all to authenticated
using (public.staff_can('owner')) with check (public.staff_can('owner'));
grant select on public.admin_assets to anon,authenticated;
grant insert,update,delete on public.admin_assets to authenticated;

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  slug text not null unique,
  asset_id uuid not null references public.admin_assets(id) on delete cascade,
  description text not null default '' check (char_length(description)<=240),
  created_at timestamptz not null default now()
);
create table if not exists public.user_badges (
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  assigned_by uuid not null references public.profiles(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key(user_id,badge_id)
);
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
drop policy if exists badges_public_read on public.badges;
create policy badges_public_read on public.badges for select using (true);
drop policy if exists user_badges_public_read on public.user_badges;
create policy user_badges_public_read on public.user_badges for select using (true);
grant select on public.badges,public.user_badges to anon,authenticated;

create table if not exists public.site_overrides (
  id uuid primary key default gen_random_uuid(),
  page text not null default 'global' check (char_length(page)<=80),
  selector text not null check (char_length(selector) between 1 and 300),
  action text not null check (action in ('text','src','alt','hide','show','append_text','prepend_text','background_image')),
  value text not null default '' check (char_length(value)<=4000),
  enabled boolean not null default true,
  sort_order integer not null default 0,
  updated_by uuid null references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.site_overrides enable row level security;
drop policy if exists site_overrides_public_read on public.site_overrides;
create policy site_overrides_public_read on public.site_overrides for select using (enabled=true or public.staff_can('owner'));
grant select on public.site_overrides to anon,authenticated;

alter table public.site_settings
  add column if not exists feed_settings jsonb not null default '{"page_size":40,"show_attention_tag":true}'::jsonb,
  add column if not exists story_settings jsonb not null default '{"enabled":true,"camera_enabled":true}'::jsonb,
  add column if not exists login_settings jsonb not null default '{"registration_enabled":true}'::jsonb,
  add column if not exists layout_settings jsonb not null default '{}'::jsonb;

create or replace function public.owner_upsert_moderation_term(
  p_id uuid,p_term text,p_category text,p_severity text,p_notes text,p_active boolean
)
returns public.moderation_terms
language plpgsql security definer set search_path=public as $$
declare outrow public.moderation_terms;
begin
  if not public.staff_can('owner') then raise exception 'owner_required' using errcode='42501'; end if;
  if p_category not in ('racismo','homofobia','ameaca','crime','assedio','spam','outro') then raise exception 'bad_category'; end if;
  if p_severity not in ('baixa','normal','alta','critica') then raise exception 'bad_severity'; end if;
  if p_id is null then
    insert into public.moderation_terms(term,category,severity,notes,active,created_by)
    values(left(trim(p_term),160),p_category,p_severity,left(coalesce(p_notes,''),500),p_active,(select auth.uid()))
    returning * into outrow;
  else
    update public.moderation_terms set term=left(trim(p_term),160),category=p_category,severity=p_severity,
      notes=left(coalesce(p_notes,''),500),active=p_active
    where id=p_id returning * into outrow;
  end if;
  return outrow;
end; $$;
revoke all on function public.owner_upsert_moderation_term(uuid,text,text,text,text,boolean) from public;
grant execute on function public.owner_upsert_moderation_term(uuid,text,text,text,text,boolean) to authenticated;

create or replace function public.owner_delete_moderation_term(p_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if not public.staff_can('owner') then raise exception 'owner_required' using errcode='42501'; end if;
  delete from public.moderation_terms where id=p_id; return found;
end; $$;
revoke all on function public.owner_delete_moderation_term(uuid) from public;
grant execute on function public.owner_delete_moderation_term(uuid) to authenticated;

create or replace function public.staff_resolve_alert(p_id uuid,p_status text,p_resolution text default '')
returns public.moderation_alerts
language plpgsql security definer set search_path=public as $$
declare outrow public.moderation_alerts;
begin
  if not public.staff_can('moderator') then raise exception 'forbidden' using errcode='42501'; end if;
  if p_status not in ('novo','em_analise','resolvido','ignorado','encaminhado') then raise exception 'bad_status'; end if;
  update public.moderation_alerts set status=p_status,resolution=left(coalesce(p_resolution,''),1000),
    assigned_to=(select auth.uid()),updated_at=now()
  where id=p_id returning * into outrow;
  return outrow;
end; $$;
revoke all on function public.staff_resolve_alert(uuid,text,text) from public;
grant execute on function public.staff_resolve_alert(uuid,text,text) to authenticated;

create or replace function public.owner_save_site_override(
  p_id uuid,p_page text,p_selector text,p_action text,p_value text,p_enabled boolean,p_sort_order integer
)
returns public.site_overrides
language plpgsql security definer set search_path=public as $$
declare outrow public.site_overrides;
begin
  if not public.staff_can('owner') then raise exception 'owner_required' using errcode='42501'; end if;
  if p_action not in ('text','src','alt','hide','show','append_text','prepend_text','background_image') then raise exception 'bad_action'; end if;
  if p_id is null then
    insert into public.site_overrides(page,selector,action,value,enabled,sort_order,updated_by)
    values(left(coalesce(p_page,'global'),80),left(trim(p_selector),300),p_action,left(coalesce(p_value,''),4000),
      p_enabled,coalesce(p_sort_order,0),(select auth.uid())) returning * into outrow;
  else
    update public.site_overrides set page=left(coalesce(p_page,'global'),80),selector=left(trim(p_selector),300),
      action=p_action,value=left(coalesce(p_value,''),4000),enabled=p_enabled,sort_order=coalesce(p_sort_order,0),
      updated_by=(select auth.uid()),updated_at=now()
    where id=p_id returning * into outrow;
  end if;
  return outrow;
end; $$;
revoke all on function public.owner_save_site_override(uuid,text,text,text,text,boolean,integer) from public;
grant execute on function public.owner_save_site_override(uuid,text,text,text,text,boolean,integer) to authenticated;

create or replace function public.owner_delete_site_override(p_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if not public.staff_can('owner') then raise exception 'owner_required' using errcode='42501'; end if;
  delete from public.site_overrides where id=p_id; return found;
end; $$;
revoke all on function public.owner_delete_site_override(uuid) from public;
grant execute on function public.owner_delete_site_override(uuid) to authenticated;

create or replace function public.owner_create_badge(p_asset_id uuid,p_name text,p_slug text,p_description text default '')
returns public.badges
language plpgsql security definer set search_path=public as $$
declare outrow public.badges;
begin
  if not public.staff_can('owner') then raise exception 'owner_required' using errcode='42501'; end if;
  insert into public.badges(asset_id,name,slug,description)
  values(p_asset_id,left(trim(p_name),80),left(trim(p_slug),80),left(coalesce(p_description,''),240))
  returning * into outrow;
  return outrow;
end; $$;
revoke all on function public.owner_create_badge(uuid,text,text,text) from public;
grant execute on function public.owner_create_badge(uuid,text,text,text) to authenticated;

create or replace function public.owner_assign_badge(p_user_id uuid,p_badge_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if not public.staff_can('owner') then raise exception 'owner_required' using errcode='42501'; end if;
  insert into public.user_badges(user_id,badge_id,assigned_by)
  values(p_user_id,p_badge_id,(select auth.uid())) on conflict do nothing;
  return true;
end; $$;
revoke all on function public.owner_assign_badge(uuid,uuid) from public;
grant execute on function public.owner_assign_badge(uuid,uuid) to authenticated;

create or replace function public.owner_remove_badge(p_user_id uuid,p_badge_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if not public.staff_can('owner') then raise exception 'owner_required' using errcode='42501'; end if;
  delete from public.user_badges where user_id=p_user_id and badge_id=p_badge_id; return true;
end; $$;
revoke all on function public.owner_remove_badge(uuid,uuid) from public;
grant execute on function public.owner_remove_badge(uuid,uuid) to authenticated;


-- =============================================================
-- 20261001064030 staff_reports_bans_team_roles
-- =============================================================
create or replace function public.staff_set_report_status(p_report_id uuid,p_status text)
returns public.reports
language plpgsql security definer set search_path=public as $$
declare outrow public.reports;
begin
  if not public.staff_can('moderator') then raise exception 'forbidden' using errcode='42501'; end if;
  if p_status not in ('aberto','em_analise','encaminhado','resolvido','descartado','arquivado') then raise exception 'invalid_status'; end if;
  update public.reports
  set status=p_status,updated_at=now(),
      resolved_by=case when p_status in ('resolvido','descartado','arquivado') then (select auth.uid()) else resolved_by end,
      resolved_at=case when p_status in ('resolvido','descartado','arquivado') then now() else resolved_at end
  where id=p_report_id returning * into outrow;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values((select auth.uid()),'report_status','report',p_report_id::text,jsonb_build_object('status',p_status));
  return outrow;
end; $$;
revoke all on function public.staff_set_report_status(uuid,text) from public;
grant execute on function public.staff_set_report_status(uuid,text) to authenticated;

create or replace function public.staff_assign_report(p_report_id uuid,p_assignee uuid)
returns public.reports
language plpgsql security definer set search_path=public as $$
declare actor uuid:=(select auth.uid()); actor_role text:=public.current_staff_role(); assignee_role text; outrow public.reports;
begin
  if public.staff_role_rank(actor_role)<10 then raise exception 'forbidden' using errcode='42501'; end if;
  select role into assignee_role from public.admin_users where user_id=p_assignee;
  if assignee_role is null then raise exception 'assignee_not_staff'; end if;
  if actor_role='moderator' and p_assignee<>actor then raise exception 'moderator_self_assignment_only' using errcode='42501'; end if;
  update public.reports set assigned_to=p_assignee,assigned_by=actor,assigned_at=now(),status='em_analise',updated_at=now()
  where id=p_report_id returning * into outrow;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'assign_report','report',p_report_id::text,jsonb_build_object('assignee',p_assignee,'role',assignee_role));
  return outrow;
end; $$;
revoke all on function public.staff_assign_report(uuid,uuid) from public;
grant execute on function public.staff_assign_report(uuid,uuid) to authenticated;

create or replace function public.staff_forward_report(p_report_id uuid,p_assignee uuid,p_note text default '')
returns public.reports
language plpgsql security definer set search_path=public as $$
declare actor uuid:=(select auth.uid()); actor_role text:=public.current_staff_role(); assignee_role text; outrow public.reports;
begin
  if public.staff_role_rank(actor_role)<10 then raise exception 'forbidden' using errcode='42501'; end if;
  select role into assignee_role from public.admin_users where user_id=p_assignee;
  if assignee_role is null then raise exception 'assignee_not_staff'; end if;
  update public.reports
  set assigned_to=p_assignee,assigned_by=actor,assigned_at=now(),status='encaminhado',
      staff_notes=left(concat_ws(E'\n',nullif(staff_notes,''),'ENCAMINHADO: '||left(coalesce(p_note,''),500)),2500),
      updated_at=now()
  where id=p_report_id returning * into outrow;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'forward_report','report',p_report_id::text,jsonb_build_object('assignee',p_assignee,'note',left(coalesce(p_note,''),500)));
  return outrow;
end; $$;
revoke all on function public.staff_forward_report(uuid,uuid,text) from public;
grant execute on function public.staff_forward_report(uuid,uuid,text) to authenticated;

create or replace function public.staff_ban_user(p_user_id uuid,p_reason text,p_until timestamptz default null)
returns public.user_moderation
language plpgsql security definer set search_path=public as $$
declare actor uuid:=(select auth.uid()); actor_role text:=public.current_staff_role(); target_role text; outrow public.user_moderation;
begin
  if public.staff_role_rank(actor_role)<10 then raise exception 'forbidden' using errcode='42501'; end if;
  if p_user_id=actor then raise exception 'cannot_ban_self'; end if;
  if length(trim(coalesce(p_reason,'')))<3 then raise exception 'reason_required'; end if;
  select role into target_role from public.admin_users where user_id=p_user_id;
  if actor_role='moderator' and target_role is not null then raise exception 'cannot_ban_staff' using errcode='42501'; end if;
  if actor_role='senior_admin' and target_role in ('senior_admin','owner') then raise exception 'cannot_ban_peer_or_owner' using errcode='42501'; end if;

  insert into public.user_moderation(user_id,suspended,reason,suspended_until,updated_by,updated_at)
  values(p_user_id,true,left(trim(p_reason),500),p_until,actor,now())
  on conflict(user_id) do update set suspended=true,reason=excluded.reason,suspended_until=excluded.suspended_until,updated_by=actor,updated_at=now()
  returning * into outrow;

  insert into public.user_staff_notifications(user_id,sent_by,title,body,severity)
  values(p_user_id,actor,'Conta suspensa',
    case when p_until is null then 'Sua conta foi suspensa por tempo indeterminado. Motivo: '||left(trim(p_reason),500)
         else 'Sua conta foi suspensa até '||to_char(p_until,'DD/MM/YYYY HH24:MI')||'. Motivo: '||left(trim(p_reason),500) end,
    'moderacao');

  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'suspend_user','profile',p_user_id::text,jsonb_build_object('reason',left(trim(p_reason),500),'until',p_until));
  return outrow;
end; $$;
revoke all on function public.staff_ban_user(uuid,text,timestamptz) from public;
grant execute on function public.staff_ban_user(uuid,text,timestamptz) to authenticated;

create or replace function public.staff_unban_user(p_user_id uuid,p_reason text default '')
returns public.user_moderation
language plpgsql security definer set search_path=public as $$
declare actor uuid:=(select auth.uid()); outrow public.user_moderation;
begin
  if not public.staff_can('moderator') then raise exception 'forbidden' using errcode='42501'; end if;
  update public.user_moderation set suspended=false,suspended_until=null,reason=left(coalesce(p_reason,reason),500),updated_by=actor,updated_at=now()
  where user_id=p_user_id returning * into outrow;
  if outrow.user_id is null then
    insert into public.user_moderation(user_id,suspended,reason,updated_by) values(p_user_id,false,left(coalesce(p_reason,''),500),actor)
    returning * into outrow;
  end if;
  insert into public.user_staff_notifications(user_id,sent_by,title,body,severity)
  values(p_user_id,actor,'Conta reativada','Seu acesso ao AVESSO foi reativado.','info');
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'restore_user','profile',p_user_id::text,jsonb_build_object('reason',left(coalesce(p_reason,''),500)));
  return outrow;
end; $$;
revoke all on function public.staff_unban_user(uuid,text) from public;
grant execute on function public.staff_unban_user(uuid,text) to authenticated;

create or replace function public.staff_send_user_notice(p_user_id uuid,p_title text,p_body text,p_severity text default 'info')
returns uuid language plpgsql security definer set search_path=public as $$
declare actor uuid:=(select auth.uid()); new_id uuid;
begin
  if not public.staff_can('moderator') then raise exception 'forbidden' using errcode='42501'; end if;
  if p_severity not in ('info','aviso','moderacao','critico') then raise exception 'invalid_severity'; end if;
  insert into public.user_staff_notifications(user_id,sent_by,title,body,severity)
  values(p_user_id,actor,left(trim(p_title),120),left(trim(p_body),1200),p_severity) returning id into new_id;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'send_user_notice','profile',p_user_id::text,jsonb_build_object('title',left(trim(p_title),120),'severity',p_severity));
  return new_id;
end; $$;
revoke all on function public.staff_send_user_notice(uuid,text,text,text) from public;
grant execute on function public.staff_send_user_notice(uuid,text,text,text) to authenticated;

create or replace function public.senior_warn_moderator(p_user_id uuid,p_reason text,p_severity text default 'advertencia')
returns uuid language plpgsql security definer set search_path=public as $$
declare actor uuid:=(select auth.uid()); actor_role text:=public.current_staff_role(); target_role text; new_id uuid;
begin
  if public.staff_role_rank(actor_role)<20 then raise exception 'forbidden' using errcode='42501'; end if;
  select role into target_role from public.admin_users where user_id=p_user_id;
  if target_role<>'moderator' then raise exception 'target_not_moderator'; end if;
  if p_severity not in ('observacao','advertencia','grave') then raise exception 'invalid_severity'; end if;
  insert into public.staff_warnings(staff_user_id,issued_by,reason,severity)
  values(p_user_id,actor,left(trim(p_reason),800),p_severity) returning id into new_id;
  insert into public.user_staff_notifications(user_id,sent_by,title,body,severity)
  values(p_user_id,actor,'Advertência da equipe',left(trim(p_reason),800),case when p_severity='grave' then 'critico' else 'aviso' end);
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'warn_moderator','staff',p_user_id::text,jsonb_build_object('severity',p_severity,'reason',left(trim(p_reason),800)));
  return new_id;
end; $$;
revoke all on function public.senior_warn_moderator(uuid,text,text) from public;
grant execute on function public.senior_warn_moderator(uuid,text,text) to authenticated;

create or replace function public.senior_revoke_moderator(p_user_id uuid,p_reason text)
returns boolean language plpgsql security definer set search_path=public as $$
declare actor uuid:=(select auth.uid()); actor_role text:=public.current_staff_role(); target_role text;
begin
  if public.staff_role_rank(actor_role)<20 then raise exception 'forbidden' using errcode='42501'; end if;
  select role into target_role from public.admin_users where user_id=p_user_id;
  if target_role<>'moderator' then raise exception 'target_not_moderator'; end if;
  delete from public.admin_users where user_id=p_user_id;
  insert into public.user_staff_notifications(user_id,sent_by,title,body,severity)
  values(p_user_id,actor,'Acesso de moderação removido',left(trim(p_reason),800),'moderacao');
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'revoke_moderator','staff',p_user_id::text,jsonb_build_object('reason',left(trim(p_reason),800)));
  return true;
end; $$;
revoke all on function public.senior_revoke_moderator(uuid,text) from public;
grant execute on function public.senior_revoke_moderator(uuid,text) to authenticated;

create or replace function public.owner_set_user_role(p_user_id uuid,p_role text)
returns text language plpgsql security definer set search_path=public as $$
declare actor uuid:=(select auth.uid());
begin
  if not public.staff_can('owner') then raise exception 'owner_required' using errcode='42501'; end if;
  if p_user_id=actor and p_role<>'owner' then raise exception 'owner_cannot_demote_self'; end if;
  if p_role='none' then
    delete from public.admin_users where user_id=p_user_id;
  elsif p_role in ('moderator','senior_admin','owner') then
    insert into public.admin_users(user_id,role) values(p_user_id,p_role)
    on conflict(user_id) do update set role=excluded.role;
  else raise exception 'invalid_role'; end if;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'set_staff_role','profile',p_user_id::text,jsonb_build_object('role',p_role));
  return p_role;
end; $$;
revoke all on function public.owner_set_user_role(uuid,text) from public;
grant execute on function public.owner_set_user_role(uuid,text) to authenticated;

create or replace function public.admin_set_user_role(p_user_id uuid,p_role text)
returns text language plpgsql security definer set search_path=public as $$
begin return public.owner_set_user_role(p_user_id,case when p_role='admin' then 'senior_admin' else p_role end); end; $$;
revoke all on function public.admin_set_user_role(uuid,text) from public;
grant execute on function public.admin_set_user_role(uuid,text) to authenticated;

create or replace function public.admin_delete_post(p_id uuid) returns boolean language plpgsql security definer set search_path=public as $$
declare actor uuid:=(select auth.uid()); affected int;
begin if not public.staff_can('moderator') then raise exception 'forbidden' using errcode='42501'; end if;
delete from public.posts where id=p_id; get diagnostics affected=row_count;
insert into public.admin_audit_log(admin_id,action,target_type,target_id) values(actor,'delete_post','post',p_id::text); return affected>0; end; $$;
create or replace function public.admin_delete_response(p_id uuid) returns boolean language plpgsql security definer set search_path=public as $$
declare actor uuid:=(select auth.uid()); affected int;
begin if not public.staff_can('moderator') then raise exception 'forbidden' using errcode='42501'; end if;
delete from public.responses where id=p_id; get diagnostics affected=row_count;
insert into public.admin_audit_log(admin_id,action,target_type,target_id) values(actor,'delete_response','response',p_id::text); return affected>0; end; $$;
create or replace function public.admin_delete_photo(p_id uuid) returns boolean language plpgsql security definer set search_path=public as $$
declare actor uuid:=(select auth.uid()); affected int;
begin if not public.staff_can('moderator') then raise exception 'forbidden' using errcode='42501'; end if;
delete from public.profile_photos where id=p_id; get diagnostics affected=row_count;
insert into public.admin_audit_log(admin_id,action,target_type,target_id) values(actor,'delete_photo','photo',p_id::text); return affected>0; end; $$;
create or replace function public.admin_delete_story(p_id uuid) returns boolean language plpgsql security definer set search_path=public as $$
declare actor uuid:=(select auth.uid()); affected int;
begin if not public.staff_can('moderator') then raise exception 'forbidden' using errcode='42501'; end if;
delete from public.stories where id=p_id; get diagnostics affected=row_count;
insert into public.admin_audit_log(admin_id,action,target_type,target_id) values(actor,'delete_story','story',p_id::text); return affected>0; end; $$;

create or replace function public.admin_set_report_status(p_report_id uuid,p_status text)
returns public.reports language sql security definer set search_path=public as $$
  select public.staff_set_report_status(p_report_id,p_status);
$$;


-- =============================================================
-- 20261001064106 owner_character_db_controls
-- =============================================================
create or replace function public.admin_update_site_settings(
  p_site_name text,p_tagline text,p_color_bg text,p_color_panel text,p_color_panel2 text,
  p_color_ink text,p_color_muted text,p_color_line text,p_color_acid text,p_color_cyan text,
  p_color_coral text,p_color_violet text,p_custom_css text,p_announcement text
)
returns public.site_settings
language plpgsql security definer set search_path=public as $$
declare row_out public.site_settings; actor uuid:=(select auth.uid()); c text;
begin
  if not public.staff_can('owner') then raise exception 'owner_required' using errcode='42501'; end if;
  foreach c in array array[p_color_bg,p_color_panel,p_color_panel2,p_color_ink,p_color_muted,p_color_line,p_color_acid,p_color_cyan,p_color_coral,p_color_violet] loop
    if c !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'invalid_color'; end if;
  end loop;
  update public.site_settings set
    site_name=left(coalesce(nullif(trim(p_site_name),''),'AVESSO'),40),
    tagline=left(coalesce(p_tagline,''),120),
    color_bg=p_color_bg,color_panel=p_color_panel,color_panel2=p_color_panel2,color_ink=p_color_ink,
    color_muted=p_color_muted,color_line=p_color_line,color_acid=p_color_acid,color_cyan=p_color_cyan,
    color_coral=p_color_coral,color_violet=p_color_violet,custom_css=left(coalesce(p_custom_css,''),20000),
    announcement=left(coalesce(p_announcement,''),240),updated_by=actor,updated_at=now()
  where id='global' returning * into row_out;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id) values(actor,'update_site_settings','site','global');
  return row_out;
end; $$;

create or replace function public.admin_set_world_controls(p_events boolean,p_interventions boolean,p_message text)
returns public.world_settings
language plpgsql security definer set search_path=public as $$
declare row_out public.world_settings;
begin
  if not public.staff_can('owner') then raise exception 'owner_required' using errcode='42501'; end if;
  update public.world_settings set world_events_enabled=p_events,world_interventions_enabled=p_interventions,
    message=left(coalesce(p_message,''),240),updated_at=now()
  where id='global' returning * into row_out;
  return row_out;
end; $$;

create or replace function public.owner_update_character(
  p_id uuid,p_name text,p_role text,p_bio text,p_personality text,p_accent_color text,
  p_avatar_url text,p_home_location text,p_presence_state text,p_rarity integer,p_ai_enabled boolean,p_is_active boolean
)
returns public.characters
language plpgsql security definer set search_path=public as $$
declare outrow public.characters;
begin
  if not public.staff_can('owner') then raise exception 'owner_required' using errcode='42501'; end if;
  update public.characters set
    name=left(trim(p_name),100),role=left(trim(p_role),120),bio=left(coalesce(p_bio,''),1200),
    personality=left(coalesce(p_personality,''),3000),accent_color=p_accent_color,avatar_url=nullif(trim(p_avatar_url),''),
    home_location=left(coalesce(p_home_location,''),120),presence_state=left(coalesce(p_presence_state,'idle'),80),
    rarity=greatest(1,least(100,coalesce(p_rarity,50))),ai_enabled=p_ai_enabled,is_active=p_is_active
  where id=p_id returning * into outrow;
  return outrow;
end; $$;
revoke all on function public.owner_update_character(uuid,text,text,text,text,text,text,text,text,integer,boolean,boolean) from public;
grant execute on function public.owner_update_character(uuid,text,text,text,text,text,text,text,text,integer,boolean,boolean) to authenticated;

create or replace function public.owner_update_character_ai(
  p_character_id uuid,p_model text,p_persona_summary text,p_system_prompt text,p_max_output_chars integer,p_ai_enabled boolean
)
returns public.character_ai_profiles
language plpgsql security definer set search_path=public as $$
declare outrow public.character_ai_profiles;
begin
  if not public.staff_can('owner') then raise exception 'owner_required' using errcode='42501'; end if;
  insert into public.character_ai_profiles(character_id,model,persona_summary,system_prompt,max_output_chars,ai_enabled,updated_at)
  values(p_character_id,left(trim(p_model),80),left(coalesce(p_persona_summary,''),3000),left(coalesce(p_system_prompt,''),12000),
    greatest(40,least(2000,coalesce(p_max_output_chars,420))),p_ai_enabled,now())
  on conflict(character_id) do update set model=excluded.model,persona_summary=excluded.persona_summary,system_prompt=excluded.system_prompt,
    max_output_chars=excluded.max_output_chars,ai_enabled=excluded.ai_enabled,updated_at=now()
  returning * into outrow;
  return outrow;
end; $$;
revoke all on function public.owner_update_character_ai(uuid,text,text,text,integer,boolean) from public;
grant execute on function public.owner_update_character_ai(uuid,text,text,text,integer,boolean) to authenticated;

create or replace function public.owner_save_dialogue(p_id uuid,p_character_id uuid,p_context text,p_body text,p_weight integer,p_enabled boolean)
returns public.character_dialogues
language plpgsql security definer set search_path=public as $$
declare outrow public.character_dialogues;
begin
  if not public.staff_can('owner') then raise exception 'owner_required' using errcode='42501'; end if;
  if p_id is null then
    insert into public.character_dialogues(character_id,context,body,weight,enabled)
    values(p_character_id,left(trim(p_context),120),left(trim(p_body),1200),greatest(1,least(100,coalesce(p_weight,1))),p_enabled)
    returning * into outrow;
  else
    update public.character_dialogues set context=left(trim(p_context),120),body=left(trim(p_body),1200),
      weight=greatest(1,least(100,coalesce(p_weight,1))),enabled=p_enabled
    where id=p_id returning * into outrow;
  end if;
  return outrow;
end; $$;
revoke all on function public.owner_save_dialogue(uuid,uuid,text,text,integer,boolean) from public;
grant execute on function public.owner_save_dialogue(uuid,uuid,text,text,integer,boolean) to authenticated;

create or replace function public.owner_delete_dialogue(p_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if not public.staff_can('owner') then raise exception 'owner_required' using errcode='42501'; end if;
  delete from public.character_dialogues where id=p_id; return found;
end; $$;
revoke all on function public.owner_delete_dialogue(uuid) from public;
grant execute on function public.owner_delete_dialogue(uuid) to authenticated;

create or replace function public.owner_database_snapshot()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
  if not public.staff_can('owner') then raise exception 'owner_required' using errcode='42501'; end if;
  select jsonb_build_object(
    'tables',jsonb_build_array(
      jsonb_build_object('name','profiles','rows',(select count(*) from public.profiles)),
      jsonb_build_object('name','posts','rows',(select count(*) from public.posts)),
      jsonb_build_object('name','responses','rows',(select count(*) from public.responses)),
      jsonb_build_object('name','stories','rows',(select count(*) from public.stories)),
      jsonb_build_object('name','direct_messages','rows',(select count(*) from public.direct_messages)),
      jsonb_build_object('name','friendships','rows',(select count(*) from public.friendships)),
      jsonb_build_object('name','reports','rows',(select count(*) from public.reports)),
      jsonb_build_object('name','moderation_alerts','rows',(select count(*) from public.moderation_alerts)),
      jsonb_build_object('name','admin_assets','rows',(select count(*) from public.admin_assets)),
      jsonb_build_object('name','characters','rows',(select count(*) from public.characters)),
      jsonb_build_object('name','character_dialogues','rows',(select count(*) from public.character_dialogues))
    ),
    'database',current_database(),'generated_at',now()
  ) into result;
  return result;
end; $$;
revoke all on function public.owner_database_snapshot() from public;
grant execute on function public.owner_database_snapshot() to authenticated;

create or replace function public.owner_database_preview(p_table text,p_limit integer default 20)
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare allowed text[]:=array['profiles','posts','responses','stories','friendships','reports','moderation_alerts','admin_assets','characters','character_dialogues','site_settings','site_overrides','badges','user_badges','staff_warnings']; result jsonb; lim int:=greatest(1,least(coalesce(p_limit,20),100));
begin
  if not public.staff_can('owner') then raise exception 'owner_required' using errcode='42501'; end if;
  if not (p_table=any(allowed)) then raise exception 'table_not_allowed'; end if;
  execute format('select coalesce(jsonb_agg(to_jsonb(x)),''[]''::jsonb) from (select * from public.%I limit %s) x',p_table,lim) into result;
  return result;
end; $$;
revoke all on function public.owner_database_preview(text,integer) from public;
grant execute on function public.owner_database_preview(text,integer) to authenticated;

insert into public.admin_users(user_id,role)
select id,'owner' from public.profiles where handle='beertofcoelho'
on conflict(user_id) do update set role='owner';


-- =============================================================
-- 20261001064143 staff_dashboard_snapshot_v2
-- =============================================================
create or replace function public.staff_dashboard_snapshot()
returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare r text:=public.current_staff_role(); result jsonb;
begin
  if r is null then raise exception 'forbidden' using errcode='42501'; end if;

  select jsonb_build_object(
    'role',r,
    'counts',jsonb_build_object(
      'users',(select count(*) from public.profiles),
      'online_now',(select count(*) from public.profiles where presence_mode<>'invisible' and online_until>now()),
      'reports_open',(select count(*) from public.reports where status in ('aberto','em_analise','encaminhado')),
      'alerts_open',(select count(*) from public.moderation_alerts where status in ('novo','em_analise','encaminhado')),
      'suspended_users',(select count(*) from public.user_moderation where suspended and (suspended_until is null or suspended_until>now())),
      'staff',(select count(*) from public.admin_users)
    ),
    'users',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,'display_name',p.display_name,'handle',p.handle,'avatar_url',p.avatar_url,'status_message',p.status_message,
        'created_at',p.created_at,'presence_mode',p.presence_mode,'last_seen',p.last_seen,'online_until',p.online_until,
        'staff_role',a.role,
        'suspended',coalesce(m.suspended,false) and (m.suspended_until is null or m.suspended_until>now()),
        'suspension_reason',coalesce(m.reason,''),'suspended_until',m.suspended_until
      ) order by p.created_at desc)
      from (select * from public.profiles order by created_at desc limit 100) p
      left join public.admin_users a on a.user_id=p.id
      left join public.user_moderation m on m.user_id=p.id
    ),'[]'::jsonb),
    'staff',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,'display_name',p.display_name,'handle',p.handle,'avatar_url',p.avatar_url,'role',a.role,'created_at',a.created_at,
        'warnings',(select count(*) from public.staff_warnings w where w.staff_user_id=p.id)
      ) order by public.staff_role_rank(a.role) desc,p.display_name)
      from public.admin_users a join public.profiles p on p.id=a.user_id
    ),'[]'::jsonb),
    'reports',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',x.id,'reason',x.reason,'details',x.details,'status',x.status,'priority',x.priority,'created_at',x.created_at,
        'post_id',x.post_id,'reported_profile_id',x.reported_profile_id,'assigned_to',x.assigned_to,'staff_notes',x.staff_notes,'resolution',x.resolution,
        'reporter',jsonb_build_object('id',x.reporter_id,'display_name',x.reporter_name,'handle',x.reporter_handle),
        'reported_profile',case when x.reported_profile_id is null then null else jsonb_build_object('id',x.reported_profile_id,'display_name',x.reported_name,'handle',x.reported_handle) end
      ) order by x.created_at desc)
      from (
        select rr.*,rp.display_name reporter_name,rp.handle reporter_handle,tp.display_name reported_name,tp.handle reported_handle
        from public.reports rr
        left join public.profiles rp on rp.id=rr.reporter_id
        left join public.profiles tp on tp.id=rr.reported_profile_id
        order by rr.created_at desc limit 100
      ) x
    ),'[]'::jsonb),
    'alerts',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',m.id,'source_type',m.source_type,'source_id',m.source_id,'user_id',m.user_id,'matched_term',m.matched_term,
        'excerpt',m.excerpt,'severity',m.severity,'status',m.status,'assigned_to',m.assigned_to,'resolution',m.resolution,'created_at',m.created_at,
        'user_handle',p.handle,'user_name',p.display_name
      ) order by m.created_at desc)
      from (select * from public.moderation_alerts order by created_at desc limit 100) m
      left join public.profiles p on p.id=m.user_id
    ),'[]'::jsonb),
    'terms',case when r='owner' then coalesce((select jsonb_agg(to_jsonb(t) order by t.category,t.term) from public.moderation_terms t),'[]'::jsonb) else '[]'::jsonb end,
    'warnings',case when public.staff_role_rank(r)>=20 then coalesce((
      select jsonb_agg(jsonb_build_object('id',w.id,'staff_user_id',w.staff_user_id,'issued_by',w.issued_by,'reason',w.reason,'severity',w.severity,'created_at',w.created_at,
        'staff_handle',p.handle,'staff_name',p.display_name,'issuer_handle',i.handle) order by w.created_at desc)
      from public.staff_warnings w join public.profiles p on p.id=w.staff_user_id join public.profiles i on i.id=w.issued_by
    ),'[]'::jsonb) else '[]'::jsonb end,
    'site',case when r='owner' then coalesce((select to_jsonb(s) from public.site_settings s where id='global'),'{}'::jsonb) else '{}'::jsonb end,
    'site_overrides',case when r='owner' then coalesce((select jsonb_agg(to_jsonb(o) order by o.sort_order,o.updated_at desc) from public.site_overrides o),'[]'::jsonb) else '[]'::jsonb end,
    'assets',case when r='owner' then coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc) from public.admin_assets a),'[]'::jsonb) else '[]'::jsonb end,
    'badges',case when r='owner' then coalesce((
      select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'slug',b.slug,'description',b.description,'asset_id',b.asset_id,'storage_path',a.storage_path))
      from public.badges b join public.admin_assets a on a.id=b.asset_id
    ),'[]'::jsonb) else '[]'::jsonb end,
    'user_badges',case when r='owner' then coalesce((select jsonb_agg(to_jsonb(ub)) from public.user_badges ub),'[]'::jsonb) else '[]'::jsonb end,
    'characters',case when r='owner' then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',c.id,'slug',c.slug,'name',c.name,'role',c.role,'bio',c.bio,'accent_color',c.accent_color,'avatar_url',c.avatar_url,'image_path',c.image_path,
        'personality',c.personality,'home_location',c.home_location,'presence_state',c.presence_state,'rarity',c.rarity,'ai_enabled',c.ai_enabled,'is_active',c.is_active,
        'ai_profile',case when ai.character_id is null then null else to_jsonb(ai) end
      ) order by c.slug)
      from public.characters c left join public.character_ai_profiles ai on ai.character_id=c.id
    ),'[]'::jsonb) else '[]'::jsonb end,
    'dialogues',case when r='owner' then coalesce((select jsonb_agg(to_jsonb(d) order by d.created_at desc) from public.character_dialogues d),'[]'::jsonb) else '[]'::jsonb end,
    'audit',case when r='owner' then coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc) from (select * from public.admin_audit_log order by created_at desc limit 100) a),'[]'::jsonb) else '[]'::jsonb end
  ) into result;
  return result;
end;
$$;
revoke all on function public.staff_dashboard_snapshot() from public;
grant execute on function public.staff_dashboard_snapshot() to authenticated;

create or replace function public.admin_dashboard_snapshot()
returns jsonb language sql stable security definer set search_path=public as $$ select public.staff_dashboard_snapshot(); $$;
revoke all on function public.admin_dashboard_snapshot() from public;
grant execute on function public.admin_dashboard_snapshot() to authenticated;


-- =============================================================
-- 20261001064234 public_staff_directory
-- =============================================================
create or replace function public.staff_directory_public()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'user_id',a.user_id,
    'role',a.role,
    'handle',p.handle,
    'display_name',p.display_name
  ) order by public.staff_role_rank(a.role) desc,p.handle),'[]'::jsonb)
  from public.admin_users a
  join public.profiles p on p.id=a.user_id;
$$;
revoke all on function public.staff_directory_public() from public;
grant execute on function public.staff_directory_public() to anon,authenticated;


-- =============================================================
-- 20261001064929 owner_system_settings_rpc
-- =============================================================
create or replace function public.owner_update_system_settings(
  p_feed_settings jsonb,
  p_story_settings jsonb,
  p_login_settings jsonb,
  p_layout_settings jsonb
)
returns public.site_settings
language plpgsql
security definer
set search_path=public
as $$
declare outrow public.site_settings;
begin
  if not public.staff_can('owner') then raise exception 'owner_required' using errcode='42501'; end if;
  update public.site_settings
  set feed_settings=coalesce(p_feed_settings,'{}'::jsonb),
      story_settings=coalesce(p_story_settings,'{}'::jsonb),
      login_settings=coalesce(p_login_settings,'{}'::jsonb),
      layout_settings=coalesce(p_layout_settings,'{}'::jsonb),
      updated_by=(select auth.uid()),
      updated_at=now()
  where id='global'
  returning * into outrow;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values((select auth.uid()),'update_system_settings','site','global',
    jsonb_build_object('feed',p_feed_settings,'stories',p_story_settings,'login',p_login_settings,'layout',p_layout_settings));
  return outrow;
end;
$$;
revoke all on function public.owner_update_system_settings(jsonb,jsonb,jsonb,jsonb) from public;
grant execute on function public.owner_update_system_settings(jsonb,jsonb,jsonb,jsonb) to authenticated;


-- =============================================================
-- 20261001065002 staff_content_moderation_snapshot
-- =============================================================
create or replace function public.staff_moderation_content_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare result jsonb;
begin
  if not public.staff_can('moderator') then raise exception 'forbidden' using errcode='42501'; end if;
  select jsonb_build_object(
    'posts',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,'body',p.body,'created_at',p.created_at,'author_id',p.author_id,
        'author_name',u.display_name,'author_handle',u.handle,'image_url',p.image_url,'media_kind',p.media_kind
      ) order by p.created_at desc)
      from (select * from public.posts where visibility='publico' order by created_at desc limit 60) p
      join public.profiles u on u.id=p.author_id
    ),'[]'::jsonb),
    'responses',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',r.id,'post_id',r.post_id,'body',r.body,'created_at',r.created_at,
        'author_id',r.author_id,'author_name',u.display_name,'author_handle',u.handle
      ) order by r.created_at desc)
      from (select * from public.responses order by created_at desc limit 60) r
      join public.profiles u on u.id=r.author_id
    ),'[]'::jsonb),
    'photos',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,'storage_path',p.storage_path,'caption',p.caption,'created_at',p.created_at,
        'user_id',p.user_id,'author_name',u.display_name,'author_handle',u.handle
      ) order by p.created_at desc)
      from (select * from public.profile_photos order by created_at desc limit 60) p
      join public.profiles u on u.id=p.user_id
    ),'[]'::jsonb),
    'stories',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',s.id,'body',s.body,'created_at',s.created_at,'expires_at',s.expires_at,
        'author_id',s.author_id,'author_name',u.display_name,'author_handle',u.handle
      ) order by s.created_at desc)
      from (select * from public.stories order by created_at desc limit 60) s
      join public.profiles u on u.id=s.author_id
    ),'[]'::jsonb),
    'plaza',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',m.id,'body',m.body,'created_at',m.created_at,'user_id',m.user_id,
        'author_name',u.display_name,'author_handle',u.handle
      ) order by m.created_at desc)
      from (select * from public.plaza_messages where user_id is not null order by created_at desc limit 100) m
      join public.profiles u on u.id=m.user_id
    ),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.staff_moderation_content_snapshot() from public;
grant execute on function public.staff_moderation_content_snapshot() to authenticated;

create or replace function public.staff_delete_plaza_message(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare actor uuid:=(select auth.uid()); affected int;
begin
  if not public.staff_can('moderator') then raise exception 'forbidden' using errcode='42501'; end if;
  delete from public.plaza_messages where id=p_id;
  get diagnostics affected=row_count;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id)
  values(actor,'delete_plaza_message','plaza_message',p_id::text);
  return affected>0;
end;
$$;
revoke all on function public.staff_delete_plaza_message(uuid) from public;
grant execute on function public.staff_delete_plaza_message(uuid) to authenticated;


-- =============================================================
-- 20261001070900 staff_dashboard_v3
-- =============================================================
-- AVESSO // Staff Dashboard V3
-- Consolida cargos, moderação, chat interno, conteúdo, assets e painel owner.

-- Corrige defaults/colunas inconsistentes de uma implantação anterior.
alter table public.admin_users alter column role set default 'moderator';

alter table public.staff_warnings
  add column if not exists severity text not null default 'aviso';
alter table public.staff_warnings drop constraint if exists staff_warnings_severity_check;
alter table public.staff_warnings
  add constraint staff_warnings_severity_check check (severity in ('aviso','grave','critico'));

alter table public.staff_chat_messages
  add column if not exists recipient_id uuid references public.profiles(id) on delete cascade;

alter table public.staff_chat_messages drop constraint if exists staff_chat_channel_check;
alter table public.staff_chat_messages
  add constraint staff_chat_channel_check check (channel in ('all','moderators','senior','direct'));

create index if not exists staff_chat_recipient_created_idx
  on public.staff_chat_messages(recipient_id,created_at desc);
create index if not exists staff_chat_channel_created_idx
  on public.staff_chat_messages(channel,created_at desc);

-- Evita alerta duplicado: uma trigger por superfície já é suficiente.
drop trigger if exists posts_moderation_scan on public.posts;
drop trigger if exists responses_moderation_scan on public.responses;
drop trigger if exists stories_moderation_scan on public.stories;
drop trigger if exists plaza_moderation_scan on public.plaza_messages;

-- Chat interno: grupos e mensagem direta entre membros da equipe.
create or replace function public.can_access_staff_chat(p_channel text, p_sender uuid, p_recipient uuid)
returns boolean
language plpgsql
stable
security definer
set search_path=public
as $$
declare
  me uuid := (select auth.uid());
  r text := public.current_staff_role();
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
end;
$$;

drop policy if exists staff_chat_select on public.staff_chat_messages;
create policy staff_chat_select on public.staff_chat_messages
for select to authenticated
using (public.can_access_staff_chat(channel,sender_id,recipient_id));

drop policy if exists staff_chat_insert on public.staff_chat_messages;
create policy staff_chat_insert on public.staff_chat_messages
for insert to authenticated
with check (
  sender_id=(select auth.uid())
  and (
    (channel in ('all','moderators','senior') and public.can_access_staff_chat(channel,sender_id,recipient_id))
    or
    (channel='direct' and recipient_id is not null and public.can_access_staff_chat(channel,sender_id,recipient_id))
  )
);

drop policy if exists staff_chat_delete_self on public.staff_chat_messages;
create policy staff_chat_delete_self on public.staff_chat_messages
for delete to authenticated
using (sender_id=(select auth.uid()) or public.staff_can('owner'));

-- Termos podem ser lidos por todo staff. Escrita segue RPC auditada.
drop policy if exists moderation_terms_staff_read on public.moderation_terms;
create policy moderation_terms_staff_read on public.moderation_terms
for select to authenticated
using (public.staff_can('moderator'));

-- Assets, blocos e overrides: owner apenas para escrita.
alter table public.site_content_blocks enable row level security;
drop policy if exists site_content_blocks_public_read on public.site_content_blocks;
create policy site_content_blocks_public_read on public.site_content_blocks for select using (true);

drop policy if exists site_overrides_public_read on public.site_overrides;
create policy site_overrides_public_read on public.site_overrides for select using (true);

-- Notificação direta para usuário.
create or replace function public.staff_send_user_notice(
  p_user_id uuid,
  p_title text,
  p_body text,
  p_severity text default 'info'
)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare actor uuid:=(select auth.uid()); new_id uuid;
begin
  if not public.staff_can('moderator') then raise exception 'forbidden' using errcode='42501'; end if;
  if p_severity not in ('info','aviso','moderacao','critico') then raise exception 'invalid_severity'; end if;
  insert into public.user_staff_notifications(user_id,sent_by,title,body,severity)
  values(p_user_id,actor,left(trim(p_title),120),left(trim(p_body),1200),p_severity)
  returning id into new_id;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'send_user_notice','profile',p_user_id::text,
         jsonb_build_object('title',left(trim(p_title),120),'severity',p_severity));
  return new_id;
end;
$$;
revoke all on function public.staff_send_user_notice(uuid,text,text,text) from public;
grant execute on function public.staff_send_user_notice(uuid,text,text,text) to authenticated;

-- Advertência hierárquica, com severidade.
create or replace function public.staff_warn_staff(p_user_id uuid,p_reason text,p_severity text default 'aviso')
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  actor uuid:=(select auth.uid());
  actor_rank int:=public.staff_rank(public.current_staff_role());
  target_rank int;
  out_id uuid;
begin
  select public.staff_rank(role) into target_rank from public.admin_users where user_id=p_user_id;
  if actor_rank<20 or target_rank is null or target_rank>=actor_rank then
    raise exception 'forbidden' using errcode='42501';
  end if;
  if p_severity not in ('aviso','grave','critico') then raise exception 'invalid_severity'; end if;
  if char_length(trim(p_reason))<2 then raise exception 'reason_required'; end if;

  insert into public.staff_warnings(staff_user_id,issued_by,reason,severity)
  values(p_user_id,actor,left(trim(p_reason),600),p_severity)
  returning id into out_id;

  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'warn_staff','staff',p_user_id::text,
         jsonb_build_object('reason',left(trim(p_reason),600),'severity',p_severity));
  return out_id;
end;
$$;
revoke all on function public.staff_warn_staff(uuid,text,text) from public;
grant execute on function public.staff_warn_staff(uuid,text,text) to authenticated;

-- Cargos: senior administra moderadores; owner administra tudo.
create or replace function public.staff_set_role(p_user_id uuid,p_role text)
returns text
language plpgsql
security definer
set search_path=public
as $$
declare
  actor uuid:=(select auth.uid());
  actor_role text:=public.current_staff_role();
  actor_rank int:=public.staff_rank(actor_role);
  current_role text;
  current_rank int;
begin
  if actor_rank<20 then raise exception 'forbidden' using errcode='42501'; end if;
  select role into current_role from public.admin_users where user_id=p_user_id;
  current_rank:=public.staff_rank(coalesce(current_role,''));

  if actor_role='senior_admin' then
    if p_role not in ('moderator','none') then raise exception 'senior_can_manage_moderators_only'; end if;
    if current_rank>=20 then raise exception 'insufficient_rank'; end if;
  elsif actor_role='owner' then
    if p_role not in ('moderator','senior_admin','none','owner') then raise exception 'invalid_role'; end if;
    if p_user_id=actor and p_role<>'owner' then raise exception 'owner_cannot_demote_self'; end if;
  else
    raise exception 'forbidden' using errcode='42501';
  end if;

  if p_role='none' then
    delete from public.admin_users where user_id=p_user_id;
  else
    insert into public.admin_users(user_id,role)
    values(p_user_id,p_role)
    on conflict(user_id) do update set role=excluded.role;
  end if;

  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'set_staff_role','profile',p_user_id::text,jsonb_build_object('role',p_role));
  return p_role;
end;
$$;
revoke all on function public.staff_set_role(uuid,text) from public;
grant execute on function public.staff_set_role(uuid,text) to authenticated;

-- Ban temporário ou permanente.
create or replace function public.staff_set_user_ban(
  p_user_id uuid,
  p_banned boolean,
  p_reason text default '',
  p_until timestamptz default null
)
returns public.user_moderation
language plpgsql
security definer
set search_path=public
as $$
declare
  actor uuid:=(select auth.uid());
  actor_role text:=public.current_staff_role();
  actor_rank integer:=public.staff_rank(actor_role);
  target_role text;
  target_rank integer;
  row_out public.user_moderation;
begin
  if actor_rank<10 then raise exception 'forbidden' using errcode='42501'; end if;
  if p_user_id=actor then raise exception 'cannot_ban_self'; end if;
  select role into target_role from public.admin_users where user_id=p_user_id;
  target_rank:=public.staff_rank(coalesce(target_role,''));
  if target_rank>=actor_rank then raise exception 'insufficient_rank' using errcode='42501'; end if;
  if p_banned and char_length(trim(coalesce(p_reason,'')))<2 then raise exception 'reason_required'; end if;
  if p_until is not null and p_until<=now() then raise exception 'invalid_until'; end if;

  insert into public.user_moderation(user_id,suspended,reason,suspended_until,updated_by,updated_at)
  values(p_user_id,p_banned,left(coalesce(p_reason,''),500),case when p_banned then p_until else null end,actor,now())
  on conflict(user_id) do update set
    suspended=excluded.suspended,
    reason=excluded.reason,
    suspended_until=excluded.suspended_until,
    updated_by=excluded.updated_by,
    updated_at=excluded.updated_at
  returning * into row_out;

  if p_banned then
    insert into public.user_staff_notifications(user_id,sent_by,title,body,severity)
    values(
      p_user_id,actor,
      case when p_until is null then 'Conta banida' else 'Conta suspensa temporariamente' end,
      left(coalesce(p_reason,'Acesso suspenso pela moderação.'),1200),
      'moderacao'
    );
  end if;

  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,case when p_banned then 'ban_user' else 'restore_user' end,'profile',p_user_id::text,
    jsonb_build_object('reason',left(coalesce(p_reason,''),500),'until',p_until,'permanent',p_until is null));
  return row_out;
end;
$$;
revoke all on function public.staff_set_user_ban(uuid,boolean,text,timestamptz) from public;
grant execute on function public.staff_set_user_ban(uuid,boolean,text,timestamptz) to authenticated;

-- Termos auditados. Moderador pode gerenciar lista operacional.
create or replace function public.staff_upsert_moderation_term(
  p_id uuid,p_term text,p_category text,p_severity text,p_enabled boolean,p_notes text default ''
)
returns public.moderation_terms
language plpgsql
security definer
set search_path=public
as $$
declare actor uuid:=(select auth.uid()); row_out public.moderation_terms;
begin
  if not public.staff_can('moderator') then raise exception 'forbidden' using errcode='42501'; end if;
  if p_severity not in ('baixa','media','alta','critica') then raise exception 'invalid_severity'; end if;
  if p_category not in ('racismo','homofobia','transfobia','xenofobia','ameaca','crime','assedio','spam','outro') then
    raise exception 'invalid_category';
  end if;
  if char_length(trim(p_term))<2 then raise exception 'term_too_short'; end if;

  if p_id is null then
    insert into public.moderation_terms(term,category,severity,enabled,notes,created_by)
    values(left(trim(p_term),160),p_category,p_severity,p_enabled,left(coalesce(p_notes,''),500),actor)
    returning * into row_out;
  else
    update public.moderation_terms set
      term=left(trim(p_term),160),category=p_category,severity=p_severity,enabled=p_enabled,
      notes=left(coalesce(p_notes,''),500),updated_at=now()
    where id=p_id returning * into row_out;
  end if;

  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'moderation_term_save','moderation_term',coalesce(row_out.id,p_id)::text,
    jsonb_build_object('term',left(trim(p_term),80),'category',p_category,'severity',p_severity));
  return row_out;
end;
$$;
revoke all on function public.staff_upsert_moderation_term(uuid,text,text,text,boolean,text) from public;
grant execute on function public.staff_upsert_moderation_term(uuid,text,text,text,boolean,text) to authenticated;

create or replace function public.staff_delete_moderation_term(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare actor uuid:=(select auth.uid()); affected int;
begin
  if not public.staff_can('moderator') then raise exception 'forbidden' using errcode='42501'; end if;
  delete from public.moderation_terms where id=p_id;
  get diagnostics affected=row_count;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id)
  values(actor,'moderation_term_delete','moderation_term',p_id::text);
  return affected>0;
end;
$$;
revoke all on function public.staff_delete_moderation_term(uuid) from public;
grant execute on function public.staff_delete_moderation_term(uuid) to authenticated;

-- Conteúdo institucional editável sem expor SQL cru.
create or replace function public.owner_upsert_content_block(
  p_id uuid,p_page_slug text,p_block_key text,p_kind text,p_value text,p_enabled boolean,p_sort_order integer
)
returns public.site_content_blocks
language plpgsql
security definer
set search_path=public
as $$
declare actor uuid:=(select auth.uid()); outrow public.site_content_blocks;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  if p_kind not in ('text','html','image','link','json') then raise exception 'invalid_kind'; end if;
  if p_id is null then
    insert into public.site_content_blocks(page_slug,block_key,kind,value,enabled,sort_order,updated_by,updated_at)
    values(left(trim(p_page_slug),80),left(trim(p_block_key),100),p_kind,left(coalesce(p_value,''),20000),p_enabled,p_sort_order,actor,now())
    returning * into outrow;
  else
    update public.site_content_blocks set
      page_slug=left(trim(p_page_slug),80),block_key=left(trim(p_block_key),100),kind=p_kind,
      value=left(coalesce(p_value,''),20000),enabled=p_enabled,sort_order=p_sort_order,updated_by=actor,updated_at=now()
    where id=p_id returning * into outrow;
  end if;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'content_block_save','content_block',outrow.id::text,
         jsonb_build_object('page',outrow.page_slug,'key',outrow.block_key,'kind',outrow.kind));
  return outrow;
end;
$$;
revoke all on function public.owner_upsert_content_block(uuid,text,text,text,text,boolean,integer) from public;
grant execute on function public.owner_upsert_content_block(uuid,text,text,text,text,boolean,integer) to authenticated;

create or replace function public.owner_delete_content_block(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare actor uuid:=(select auth.uid()); affected int;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  delete from public.site_content_blocks where id=p_id;
  get diagnostics affected=row_count;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id)
  values(actor,'content_block_delete','content_block',p_id::text);
  return affected>0;
end;
$$;
revoke all on function public.owner_delete_content_block(uuid) from public;
grant execute on function public.owner_delete_content_block(uuid) to authenticated;

-- Configurações completas de feed, stories, login e layout.
create or replace function public.owner_update_runtime_settings(
  p_feed_settings jsonb,
  p_story_settings jsonb,
  p_login_settings jsonb,
  p_layout_settings jsonb
)
returns public.site_settings
language plpgsql
security definer
set search_path=public
as $$
declare actor uuid:=(select auth.uid()); outrow public.site_settings;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;

  update public.site_settings set
    feed_settings=coalesce(p_feed_settings,'{}'::jsonb),
    story_settings=coalesce(p_story_settings,'{}'::jsonb),
    login_settings=coalesce(p_login_settings,'{}'::jsonb),
    layout_settings=coalesce(p_layout_settings,'{}'::jsonb),
    updated_by=actor,updated_at=now()
  where id='global'
  returning * into outrow;

  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'runtime_settings_update','site','global',
    jsonb_build_object('feed',p_feed_settings,'stories',p_story_settings,'login',p_login_settings,'layout',p_layout_settings));
  return outrow;
end;
$$;
revoke all on function public.owner_update_runtime_settings(jsonb,jsonb,jsonb,jsonb) from public;
grant execute on function public.owner_update_runtime_settings(jsonb,jsonb,jsonb,jsonb) to authenticated;

-- Catálogo de assets do owner.
create or replace function public.owner_upsert_admin_asset(
  p_id uuid,p_asset_type text,p_name text,p_slug text,p_storage_path text,p_mime_type text,
  p_shortcode text,p_meta jsonb,p_active boolean
)
returns public.admin_assets
language plpgsql
security definer
set search_path=public
as $$
declare actor uuid:=(select auth.uid()); outrow public.admin_assets;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  if p_asset_type not in ('wallpaper','emoticon','avatar','badge','character','ui','other') then raise exception 'invalid_asset_type'; end if;

  if p_id is null then
    insert into public.admin_assets(asset_type,name,slug,storage_path,mime_type,shortcode,meta,active,created_by)
    values(p_asset_type,left(trim(p_name),100),left(trim(p_slug),100),p_storage_path,left(p_mime_type,100),
           left(coalesce(p_shortcode,''),80),coalesce(p_meta,'{}'::jsonb),p_active,actor)
    returning * into outrow;
  else
    update public.admin_assets set
      asset_type=p_asset_type,name=left(trim(p_name),100),slug=left(trim(p_slug),100),
      storage_path=p_storage_path,mime_type=left(p_mime_type,100),shortcode=left(coalesce(p_shortcode,''),80),
      meta=coalesce(p_meta,'{}'::jsonb),active=p_active
    where id=p_id returning * into outrow;
  end if;

  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'admin_asset_save','asset',outrow.id::text,jsonb_build_object('type',p_asset_type,'slug',p_slug));
  return outrow;
end;
$$;
revoke all on function public.owner_upsert_admin_asset(uuid,text,text,text,text,text,text,jsonb,boolean) from public;
grant execute on function public.owner_upsert_admin_asset(uuid,text,text,text,text,text,text,jsonb,boolean) to authenticated;

create or replace function public.owner_delete_admin_asset(p_id uuid)
returns text
language plpgsql
security definer
set search_path=public
as $$
declare actor uuid:=(select auth.uid()); path text;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  select storage_path into path from public.admin_assets where id=p_id;
  delete from public.admin_assets where id=p_id;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id)
  values(actor,'admin_asset_delete','asset',p_id::text);
  return path;
end;
$$;
revoke all on function public.owner_delete_admin_asset(uuid) from public;
grant execute on function public.owner_delete_admin_asset(uuid) to authenticated;

-- Badges baseadas em caminho de imagem, sem depender de coluna asset_id antiga.
create or replace function public.owner_upsert_badge(
  p_id uuid,p_slug text,p_name text,p_description text,p_image_path text,p_active boolean default true
)
returns public.badges
language plpgsql
security definer
set search_path=public
as $$
declare actor uuid:=(select auth.uid()); row_out public.badges;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  if p_id is null then
    insert into public.badges(slug,name,description,image_path,active,created_by)
    values(left(trim(p_slug),80),left(trim(p_name),80),left(coalesce(p_description,''),300),p_image_path,p_active,actor)
    returning * into row_out;
  else
    update public.badges set
      slug=left(trim(p_slug),80),name=left(trim(p_name),80),description=left(coalesce(p_description,''),300),
      image_path=p_image_path,active=p_active
    where id=p_id returning * into row_out;
  end if;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'badge_save','badge',row_out.id::text,jsonb_build_object('slug',row_out.slug,'name',row_out.name));
  return row_out;
end;
$$;

create or replace function public.owner_grant_badge(p_user_id uuid,p_badge_id uuid,p_grant boolean)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare actor uuid:=(select auth.uid());
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  if p_grant then
    insert into public.user_badges(user_id,badge_id,granted_by)
    values(p_user_id,p_badge_id,actor) on conflict do nothing;
  else
    delete from public.user_badges where user_id=p_user_id and badge_id=p_badge_id;
  end if;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,case when p_grant then 'badge_grant' else 'badge_revoke' end,'profile',p_user_id::text,
         jsonb_build_object('badge_id',p_badge_id));
  return true;
end;
$$;
revoke all on function public.owner_upsert_badge(uuid,text,text,text,text,boolean) from public;
revoke all on function public.owner_grant_badge(uuid,uuid,boolean) from public;
grant execute on function public.owner_upsert_badge(uuid,text,text,text,text,boolean) to authenticated;
grant execute on function public.owner_grant_badge(uuid,uuid,boolean) to authenticated;

-- Owner: edição dos habitantes/IA/frases.
create or replace function public.owner_update_character(
  p_id uuid,p_name text,p_role text,p_bio text,p_personality text,p_accent_color text,p_avatar_url text,
  p_home_location text,p_presence_state text,p_rarity integer,p_ai_enabled boolean,p_is_active boolean
)
returns public.characters
language plpgsql
security definer
set search_path=public
as $$
declare actor uuid:=(select auth.uid()); outrow public.characters;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  update public.characters set
    name=left(trim(p_name),60),role=left(trim(p_role),100),bio=left(coalesce(p_bio,''),1000),
    personality=left(coalesce(p_personality,''),4000),accent_color=p_accent_color,avatar_url=nullif(trim(p_avatar_url),''),
    home_location=left(trim(p_home_location),100),presence_state=p_presence_state,
    rarity=greatest(1,least(1000,p_rarity)),ai_enabled=p_ai_enabled,is_active=p_is_active
  where id=p_id returning * into outrow;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id)
  values(actor,'character_update','character',p_id::text);
  return outrow;
end;
$$;

create or replace function public.owner_upsert_character_ai(
  p_character_id uuid,p_model text,p_persona_summary text,p_system_prompt text,p_behavior_rules jsonb,
  p_voice_rules jsonb,p_max_output_chars integer,p_ai_enabled boolean
)
returns public.character_ai_profiles
language plpgsql
security definer
set search_path=public
as $$
declare actor uuid:=(select auth.uid()); outrow public.character_ai_profiles;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  insert into public.character_ai_profiles(
    character_id,model,persona_summary,system_prompt,behavior_rules,voice_rules,max_output_chars,ai_enabled,updated_at
  )
  values(
    p_character_id,left(trim(p_model),80),left(coalesce(p_persona_summary,''),3000),left(coalesce(p_system_prompt,''),12000),
    coalesce(p_behavior_rules,'{}'::jsonb),coalesce(p_voice_rules,'{}'::jsonb),
    greatest(80,least(1200,p_max_output_chars)),p_ai_enabled,now()
  )
  on conflict(character_id) do update set
    model=excluded.model,persona_summary=excluded.persona_summary,system_prompt=excluded.system_prompt,
    behavior_rules=excluded.behavior_rules,voice_rules=excluded.voice_rules,
    max_output_chars=excluded.max_output_chars,ai_enabled=excluded.ai_enabled,updated_at=now()
  returning * into outrow;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id)
  values(actor,'character_ai_update','character',p_character_id::text);
  return outrow;
end;
$$;

create or replace function public.owner_save_character_dialogue(
  p_id uuid,p_character_id uuid,p_context text,p_body text,p_weight integer,p_enabled boolean
)
returns public.character_dialogues
language plpgsql
security definer
set search_path=public
as $$
declare actor uuid:=(select auth.uid()); outrow public.character_dialogues;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  if p_id is null then
    insert into public.character_dialogues(character_id,context,body,weight,enabled)
    values(p_character_id,p_context,left(p_body,420),greatest(1,least(100,p_weight)),p_enabled)
    returning * into outrow;
  else
    update public.character_dialogues set
      character_id=p_character_id,context=p_context,body=left(p_body,420),
      weight=greatest(1,least(100,p_weight)),enabled=p_enabled
    where id=p_id returning * into outrow;
  end if;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id)
  values(actor,'character_dialogue_save','character_dialogue',outrow.id::text);
  return outrow;
end;
$$;

create or replace function public.owner_delete_character_dialogue(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare actor uuid:=(select auth.uid()); affected int;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  delete from public.character_dialogues where id=p_id;
  get diagnostics affected=row_count;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id)
  values(actor,'character_dialogue_delete','character_dialogue',p_id::text);
  return affected>0;
end;
$$;

revoke all on function public.owner_update_character(uuid,text,text,text,text,text,text,text,text,integer,boolean,boolean) from public;
revoke all on function public.owner_upsert_character_ai(uuid,text,text,text,jsonb,jsonb,integer,boolean) from public;
revoke all on function public.owner_save_character_dialogue(uuid,uuid,text,text,integer,boolean) from public;
revoke all on function public.owner_delete_character_dialogue(uuid) from public;
grant execute on function public.owner_update_character(uuid,text,text,text,text,text,text,text,text,integer,boolean,boolean) to authenticated;
grant execute on function public.owner_upsert_character_ai(uuid,text,text,text,jsonb,jsonb,integer,boolean) to authenticated;
grant execute on function public.owner_save_character_dialogue(uuid,uuid,text,text,integer,boolean) to authenticated;
grant execute on function public.owner_delete_character_dialogue(uuid) to authenticated;

-- Snapshot do banco: leitura estrutural segura, sem expor uma console SQL arbitrária no navegador.
create or replace function public.owner_database_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare result jsonb;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  select jsonb_build_object(
    'tables',coalesce((
      select jsonb_agg(jsonb_build_object(
        'name',c.relname,
        'rls',c.relrowsecurity,
        'estimated_rows',greatest(c.reltuples::bigint,0),
        'size_bytes',pg_total_relation_size(c.oid),
        'policies',(select count(*) from pg_policies p where p.schemaname='public' and p.tablename=c.relname)
      ) order by pg_total_relation_size(c.oid) desc)
      from pg_class c
      join pg_namespace n on n.oid=c.relnamespace
      where n.nspname='public' and c.relkind='r'
    ),'[]'::jsonb),
    'functions',(select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'),
    'policies',(select count(*) from pg_policies where schemaname='public'),
    'storage_objects',(select count(*) from storage.objects),
    'storage_bytes',coalesce((select sum((metadata->>'size')::bigint) from storage.objects where metadata ? 'size'),0),
    'generated_at',now()
  ) into result;
  return result;
end;
$$;
revoke all on function public.owner_database_snapshot() from public;
grant execute on function public.owner_database_snapshot() to authenticated;

-- Snapshot da dashboard corrigido e expandido.
create or replace function public.staff_dashboard_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare r text:=public.current_staff_role(); result jsonb;
begin
  if r is null then raise exception 'forbidden' using errcode='42501'; end if;

  select jsonb_build_object(
    'role',r,
    'counts',jsonb_build_object(
      'users',(select count(*) from public.profiles),
      'online_now',(select count(*) from public.profiles where presence_mode<>'invisible' and online_until>now()),
      'reports_open',(select count(*) from public.reports where status in ('aberto','em_analise','encaminhado')),
      'alerts_open',(select count(*) from public.moderation_alerts where status in ('novo','em_analise','encaminhado')),
      'suspended_users',(select count(*) from public.user_moderation where suspended and (suspended_until is null or suspended_until>now())),
      'staff',(select count(*) from public.admin_users)
    ),
    'users',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,'display_name',p.display_name,'handle',p.handle,'avatar_url',p.avatar_url,'status_message',p.status_message,
        'created_at',p.created_at,'presence_mode',p.presence_mode,'last_seen',p.last_seen,'online_until',p.online_until,
        'staff_role',a.role,
        'suspended',coalesce(m.suspended,false) and (m.suspended_until is null or m.suspended_until>now()),
        'suspension_reason',coalesce(m.reason,''),'suspended_until',m.suspended_until
      ) order by p.created_at desc)
      from (select * from public.profiles order by created_at desc limit 150) p
      left join public.admin_users a on a.user_id=p.id
      left join public.user_moderation m on m.user_id=p.id
    ),'[]'::jsonb),
    'staff',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,'display_name',p.display_name,'handle',p.handle,'avatar_url',p.avatar_url,'role',a.role,'created_at',a.created_at,
        'warnings',(select count(*) from public.staff_warnings w where w.staff_user_id=p.id and w.active)
      ) order by public.staff_role_rank(a.role) desc,p.display_name)
      from public.admin_users a join public.profiles p on p.id=a.user_id
    ),'[]'::jsonb),
    'reports',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',x.id,'reason',x.reason,'details',x.details,'status',x.status,'priority',x.priority,'created_at',x.created_at,
        'post_id',x.post_id,'reported_profile_id',x.reported_profile_id,'assigned_to',x.assigned_to,'staff_notes',x.staff_notes,'resolution',x.resolution,
        'reporter',jsonb_build_object('id',x.reporter_id,'display_name',x.reporter_name,'handle',x.reporter_handle),
        'reported_profile',case when x.reported_profile_id is null then null else jsonb_build_object('id',x.reported_profile_id,'display_name',x.reported_name,'handle',x.reported_handle) end
      ) order by x.created_at desc)
      from (
        select rr.*,rp.display_name reporter_name,rp.handle reporter_handle,tp.display_name reported_name,tp.handle reported_handle
        from public.reports rr
        left join public.profiles rp on rp.id=rr.reporter_id
        left join public.profiles tp on tp.id=rr.reported_profile_id
        order by rr.created_at desc limit 120
      ) x
    ),'[]'::jsonb),
    'alerts',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',m.id,'source_type',m.source_type,'source_id',m.source_id,'user_id',m.user_id,'matched_term',m.matched_term,
        'excerpt',m.excerpt,'severity',m.severity,'status',m.status,'assigned_to',m.assigned_to,'resolution',m.resolution,'created_at',m.created_at,
        'user_handle',p.handle,'user_name',p.display_name
      ) order by m.created_at desc)
      from (select * from public.moderation_alerts order by created_at desc limit 120) m
      left join public.profiles p on p.id=m.user_id
    ),'[]'::jsonb),
    'terms',coalesce((select jsonb_agg(to_jsonb(t) order by t.category,t.term) from public.moderation_terms t),'[]'::jsonb),
    'warnings',case when public.staff_role_rank(r)>=20 then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',w.id,'staff_user_id',w.staff_user_id,'issued_by',w.issued_by,'reason',w.reason,'severity',w.severity,
        'active',w.active,'created_at',w.created_at,'staff_handle',p.handle,'staff_name',p.display_name,'issuer_handle',i.handle
      ) order by w.created_at desc)
      from public.staff_warnings w
      join public.profiles p on p.id=w.staff_user_id
      join public.profiles i on i.id=w.issued_by
    ),'[]'::jsonb) else '[]'::jsonb end,
    'site',case when r='owner' then coalesce((select to_jsonb(s) from public.site_settings s where id='global'),'{}'::jsonb) else '{}'::jsonb end,
    'content_blocks',case when r='owner' then coalesce((select jsonb_agg(to_jsonb(b) order by b.page_slug,b.sort_order,b.updated_at desc) from public.site_content_blocks b),'[]'::jsonb) else '[]'::jsonb end,
    'site_overrides',case when r='owner' then coalesce((select jsonb_agg(to_jsonb(o) order by o.sort_order,o.updated_at desc) from public.site_overrides o),'[]'::jsonb) else '[]'::jsonb end,
    'assets',case when r='owner' then coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc) from public.admin_assets a),'[]'::jsonb) else '[]'::jsonb end,
    'badges',case when r='owner' then coalesce((select jsonb_agg(to_jsonb(b) order by b.created_at desc) from public.badges b),'[]'::jsonb) else '[]'::jsonb end,
    'user_badges',case when r='owner' then coalesce((select jsonb_agg(to_jsonb(ub)) from public.user_badges ub),'[]'::jsonb) else '[]'::jsonb end,
    'characters',case when r='owner' then coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',c.id,'slug',c.slug,'name',c.name,'role',c.role,'bio',c.bio,'accent_color',c.accent_color,
        'avatar_url',c.avatar_url,'image_path',c.image_path,'personality',c.personality,'home_location',c.home_location,
        'presence_state',c.presence_state,'rarity',c.rarity,'ai_enabled',c.ai_enabled,'is_active',c.is_active,
        'ai_profile',case when ai.character_id is null then null else to_jsonb(ai) end
      ) order by c.slug)
      from public.characters c left join public.character_ai_profiles ai on ai.character_id=c.id
    ),'[]'::jsonb) else '[]'::jsonb end,
    'dialogues',case when r='owner' then coalesce((select jsonb_agg(to_jsonb(d) order by d.created_at desc) from public.character_dialogues d),'[]'::jsonb) else '[]'::jsonb end,
    'audit',case when r='owner' then coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc) from (select * from public.admin_audit_log order by created_at desc limit 120) a),'[]'::jsonb) else '[]'::jsonb end
  ) into result;
  return result;
end;
$$;
revoke all on function public.staff_dashboard_snapshot() from public;
grant execute on function public.staff_dashboard_snapshot() to authenticated;

create or replace function public.admin_dashboard_snapshot()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$ select public.staff_dashboard_snapshot(); $$;
revoke all on function public.admin_dashboard_snapshot() from public;
grant execute on function public.admin_dashboard_snapshot() to authenticated;


-- =============================================================
-- 20261001072408 staff_moderation_monitor_hardening
-- =============================================================
-- Staff moderation hardening: one monitoring path, all public/social surfaces.
alter table public.moderation_alerts drop constraint if exists moderation_alerts_source_type_check;
alter table public.moderation_alerts
  add constraint moderation_alerts_source_type_check
  check (source_type in ('post','response','plaza','story','guestbook','profile','photo','photo_comment','story_comment'));

create or replace function public.scan_moderation_text(
  p_source_type text,
  p_source_id uuid,
  p_user_id uuid,
  p_text text
)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare
  t record;
  normalized text:=lower(coalesce(p_text,''));
  alert_severity text;
begin
  if length(trim(normalized))=0 then return; end if;
  for t in
    select id,term,severity
    from public.moderation_terms
    where enabled=true and char_length(trim(term))>=2
  loop
    if position(lower(trim(t.term)) in normalized)>0 then
      alert_severity:=case t.severity when 'media' then 'normal' else t.severity end;
      if alert_severity not in ('baixa','normal','alta','critica') then alert_severity:='normal'; end if;
      insert into public.moderation_alerts(
        term_id,source_type,source_id,user_id,matched_term,excerpt,severity,status,updated_at
      )
      values(
        t.id,left(p_source_type,40),p_source_id,p_user_id,t.term,left(coalesce(p_text,''),500),
        alert_severity,'novo',now()
      )
      on conflict(term_id,source_type,source_id)
      do update set
        excerpt=excluded.excerpt,
        severity=excluded.severity,
        user_id=excluded.user_id,
        status=case when public.moderation_alerts.status in ('resolvido','ignorado') then 'novo' else public.moderation_alerts.status end,
        updated_at=now();
    end if;
  end loop;
end;
$$;

create or replace function public.trg_scan_photo_comment_text()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  perform public.scan_moderation_text('photo_comment',new.id,new.user_id,new.body);
  return new;
end;
$$;

create or replace function public.trg_scan_story_comment_text()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  perform public.scan_moderation_text('story_comment',new.id,new.user_id,new.body);
  return new;
end;
$$;

create or replace function public.trg_scan_profile_photo_text()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  perform public.scan_moderation_text('photo',new.id,new.user_id,new.caption);
  return new;
end;
$$;

drop trigger if exists profiles_moderation_scan on public.profiles;
drop trigger if exists scan_profile_text on public.profiles;
create trigger scan_profile_text
after insert or update of display_name,handle,status_message,bio on public.profiles
for each row execute function public.trg_scan_profile_text();

drop trigger if exists photo_comments_moderation_scan on public.photo_comments;
create trigger photo_comments_moderation_scan
after insert or update of body on public.photo_comments
for each row execute function public.trg_scan_photo_comment_text();

drop trigger if exists story_comments_moderation_scan on public.story_comments;
create trigger story_comments_moderation_scan
after insert or update of body on public.story_comments
for each row execute function public.trg_scan_story_comment_text();

drop trigger if exists profile_photos_moderation_scan on public.profile_photos;
create trigger profile_photos_moderation_scan
after insert or update of caption on public.profile_photos
for each row execute function public.trg_scan_profile_photo_text();


-- =============================================================
-- 20261001073118 staff_chat_direct_constraint_fix
-- =============================================================
alter table public.staff_chat_messages drop constraint if exists staff_chat_messages_channel_check;
alter table public.staff_chat_messages drop constraint if exists staff_chat_channel_check;
alter table public.staff_chat_messages
  add constraint staff_chat_channel_check check(channel in ('all','moderators','senior','direct'));
