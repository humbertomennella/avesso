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

