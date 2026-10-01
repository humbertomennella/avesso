-- AVESSO // Virar, foto social e administração owner
-- Aplicada no Supabase em 2026-10-01.

alter table public.posts drop constraint if exists posts_body_or_image_check;
alter table public.posts
  add constraint posts_body_or_image_check
  check (
    char_length(trim(body)) <= 420
    and (
      (image_url is not null and image_url <> '')
      or (recipient_id is not null and char_length(trim(body)) >= 2)
      or (recipient_id is null and char_length(trim(body)) >= 12)
    )
  );

alter table public.posts
  add column if not exists reshare_post_id uuid references public.posts(id) on delete set null,
  add column if not exists reshare_photo_id uuid references public.profile_photos(id) on delete set null,
  add column if not exists reshare_author_id uuid references public.profiles(id) on delete set null;

alter table public.posts drop constraint if exists posts_reshare_source_check;
alter table public.posts
  add constraint posts_reshare_source_check
  check (
    num_nonnulls(reshare_post_id, reshare_photo_id) <= 1
    and (
      (num_nonnulls(reshare_post_id, reshare_photo_id)=0 and reshare_author_id is null)
      or
      (num_nonnulls(reshare_post_id, reshare_photo_id)=1 and reshare_author_id is not null)
    )
  );

create index if not exists posts_reshare_post_idx on public.posts(reshare_post_id);
create index if not exists posts_reshare_photo_idx on public.posts(reshare_photo_id);
create index if not exists posts_reshare_author_idx on public.posts(reshare_author_id);

create table if not exists public.photo_comments (
  id uuid primary key default gen_random_uuid(),
  photo_id uuid not null references public.profile_photos(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 2 and 420),
  created_at timestamptz not null default now(),
  edited_at timestamptz null
);
create index if not exists photo_comments_photo_created_idx on public.photo_comments(photo_id,created_at);
alter table public.photo_comments enable row level security;

drop policy if exists photo_comments_read on public.photo_comments;
create policy photo_comments_read on public.photo_comments for select to authenticated using (true);

drop policy if exists photo_comments_update_self on public.photo_comments;
create policy photo_comments_update_self on public.photo_comments for update to authenticated
using (user_id=(select auth.uid()))
with check (user_id=(select auth.uid()));

drop policy if exists photo_comments_delete_author_or_owner on public.photo_comments;
create policy photo_comments_delete_author_or_owner on public.photo_comments for delete to authenticated
using (
  user_id=(select auth.uid())
  or exists (
    select 1 from public.profile_photos p
    where p.id=photo_comments.photo_id and p.user_id=(select auth.uid())
  )
);

create table if not exists public.site_settings (
  id text primary key default 'global',
  site_name text not null default 'AVESSO' check (char_length(site_name) between 1 and 40),
  tagline text not null default 'menos palco, mais presença' check (char_length(tagline)<=120),
  color_bg text not null default '#090b0c',
  color_panel text not null default '#111517',
  color_panel2 text not null default '#191f21',
  color_ink text not null default '#f5f3e8',
  color_muted text not null default '#8e9999',
  color_line text not null default '#293235',
  color_acid text not null default '#d8ff3e',
  color_cyan text not null default '#22d9ee',
  color_coral text not null default '#ff5c4d',
  color_violet text not null default '#9b7cff',
  custom_css text not null default '' check (char_length(custom_css)<=20000),
  announcement text not null default '' check (char_length(announcement)<=240),
  updated_by uuid null references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
insert into public.site_settings(id) values('global') on conflict(id) do nothing;
alter table public.site_settings enable row level security;
drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings for select using (true);

create table if not exists public.user_moderation (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  suspended boolean not null default false,
  reason text not null default '' check (char_length(reason)<=500),
  suspended_until timestamptz null,
  updated_by uuid null references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.user_moderation enable row level security;
drop policy if exists user_moderation_self_read on public.user_moderation;
create policy user_moderation_self_read on public.user_moderation for select to authenticated
using (user_id=(select auth.uid()));

create or replace function public.is_user_suspended(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select coalesce((
    select m.suspended and (m.suspended_until is null or m.suspended_until > now())
    from public.user_moderation m
    where m.user_id=p_user_id
  ),false);
$$;
revoke all on function public.is_user_suspended(uuid) from public;
grant execute on function public.is_user_suspended(uuid) to authenticated;

create table if not exists public.admin_audit_log (
  id bigint generated by default as identity primary key,
  admin_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  target_type text not null,
  target_id text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_created_idx on public.admin_audit_log(created_at desc);
alter table public.admin_audit_log enable row level security;

drop policy if exists posts_author_insert on public.posts;
create policy posts_author_insert on public.posts for insert to authenticated
with check (
  (select auth.uid())=author_id
  and not public.is_user_suspended((select auth.uid()))
  and ((recipient_id is null) or (author_id<>recipient_id))
  and ((visibility='publico'::post_visibility) or (recipient_id is not null))
);

drop policy if exists responses_author_insert on public.responses;
create policy responses_author_insert on public.responses for insert to authenticated
with check ((select auth.uid())=author_id and not public.is_user_suspended((select auth.uid())));

drop policy if exists profile_photos_insert_self on public.profile_photos;
create policy profile_photos_insert_self on public.profile_photos for insert to authenticated
with check (user_id=(select auth.uid()) and not public.is_user_suspended((select auth.uid())));

drop policy if exists profile_media_insert_self on public.profile_media;
create policy profile_media_insert_self on public.profile_media for insert to authenticated
with check (user_id=(select auth.uid()) and not public.is_user_suspended((select auth.uid())));

drop policy if exists photo_reactions_insert_self on public.photo_reactions;
create policy photo_reactions_insert_self on public.photo_reactions for insert to authenticated
with check (user_id=(select auth.uid()) and not public.is_user_suspended((select auth.uid())));

drop policy if exists post_reactions_insert_self on public.post_reactions;
create policy post_reactions_insert_self on public.post_reactions for insert to authenticated
with check (
  user_id=(select auth.uid())
  and not public.is_user_suspended((select auth.uid()))
  and exists (
    select 1 from public.posts p
    where p.id=post_reactions.post_id
      and (p.visibility='publico'::post_visibility or p.author_id=(select auth.uid()) or p.recipient_id=(select auth.uid()))
  )
);

drop policy if exists stories_insert_self on public.stories;
create policy stories_insert_self on public.stories for insert to authenticated
with check (
  author_id=(select auth.uid())
  and not public.is_user_suspended((select auth.uid()))
  and visibility=any(array['publico'::text,'amigos'::text])
  and expires_at<=now()+interval '24:05:00'
);

drop policy if exists story_comments_insert_self on public.story_comments;
create policy story_comments_insert_self on public.story_comments for insert to authenticated
with check (
  user_id=(select auth.uid())
  and not public.is_user_suspended((select auth.uid()))
  and exists(select 1 from public.stories s where s.id=story_comments.story_id)
);

drop policy if exists story_reactions_insert_self on public.story_reactions;
create policy story_reactions_insert_self on public.story_reactions for insert to authenticated
with check (
  user_id=(select auth.uid())
  and not public.is_user_suspended((select auth.uid()))
  and exists(select 1 from public.stories s where s.id=story_reactions.story_id)
);

drop policy if exists direct_messages_send_friends on public.direct_messages;
create policy direct_messages_send_friends on public.direct_messages for insert to authenticated
with check (
  sender_id=(select auth.uid())
  and not public.is_user_suspended((select auth.uid()))
  and exists (
    select 1 from public.friendships f
    where f.status='accepted'
      and (
        (f.requester_id=direct_messages.sender_id and f.addressee_id=direct_messages.recipient_id)
        or
        (f.requester_id=direct_messages.recipient_id and f.addressee_id=direct_messages.sender_id)
      )
  )
  and not public.is_blocked_pair(sender_id,recipient_id)
);

drop policy if exists direct_message_reactions_insert_self on public.direct_message_reactions;
create policy direct_message_reactions_insert_self on public.direct_message_reactions for insert to authenticated
with check (
  user_id=(select auth.uid())
  and not public.is_user_suspended((select auth.uid()))
  and char_length(reaction) between 1 and 32
  and exists (
    select 1 from public.direct_messages m
    where m.id=direct_message_reactions.message_id
      and m.deleted_at is null
      and m.message_kind<>'deleted'
      and (m.sender_id=(select auth.uid()) or m.recipient_id=(select auth.uid()))
  )
);

drop policy if exists friendships_requester_insert on public.friendships;
create policy friendships_requester_insert on public.friendships for insert to authenticated
with check (
  requester_id=(select auth.uid())
  and not public.is_user_suspended((select auth.uid()))
  and requester_id<>addressee_id
  and status='pending'
  and not public.is_blocked_pair(requester_id,addressee_id)
);

drop policy if exists guestbook_entries_insert_friends on public.guestbook_entries;
create policy guestbook_entries_insert_friends on public.guestbook_entries for insert to authenticated
with check (
  author_id=(select auth.uid())
  and not public.is_user_suspended((select auth.uid()))
  and profile_id<>author_id
  and exists (
    select 1 from public.friendships f
    where f.status='accepted'
      and (
        (f.requester_id=guestbook_entries.author_id and f.addressee_id=guestbook_entries.profile_id)
        or
        (f.addressee_id=guestbook_entries.author_id and f.requester_id=guestbook_entries.profile_id)
      )
  )
);

drop policy if exists plaza_insert_self on public.plaza_messages;
drop policy if exists plaza_messages_user_insert on public.plaza_messages;
create policy plaza_messages_user_insert on public.plaza_messages for insert to authenticated
with check (
  (select auth.uid())=user_id
  and not public.is_user_suspended((select auth.uid()))
  and character_id is null
  and message_kind='chat'
);

drop policy if exists photo_comments_insert_self on public.photo_comments;
create policy photo_comments_insert_self on public.photo_comments for insert to authenticated
with check (
  user_id=(select auth.uid())
  and not public.is_user_suspended((select auth.uid()))
  and not public.is_blocked_pair(user_id,(select p.user_id from public.profile_photos p where p.id=photo_id))
);

create or replace function public.virar_post(p_post_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  actor uuid := (select auth.uid());
  src public.posts;
  original_post_id uuid;
  original_author_id uuid;
  new_id uuid;
begin
  if actor is null then raise exception 'unauthenticated' using errcode='42501'; end if;
  if public.is_user_suspended(actor) then raise exception 'suspended' using errcode='42501'; end if;

  select * into src from public.posts where id=p_post_id and visibility='publico'::post_visibility;
  if not found then raise exception 'post_not_found'; end if;

  original_post_id:=coalesce(src.reshare_post_id,src.id);
  original_author_id:=coalesce(src.reshare_author_id,src.author_id);

  insert into public.posts(
    author_id,recipient_id,body,image_url,media_url,media_kind,visibility,
    reshare_post_id,reshare_photo_id,reshare_author_id
  )
  values(
    actor,null,src.body,src.image_url,src.media_url,src.media_kind,'publico',
    original_post_id,null,original_author_id
  )
  returning id into new_id;

  return new_id;
end;
$$;
revoke all on function public.virar_post(uuid) from public;
grant execute on function public.virar_post(uuid) to authenticated;

create or replace function public.virar_foto(p_photo_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  actor uuid := (select auth.uid());
  photo public.profile_photos;
  owner_handle text;
  new_id uuid;
  post_body text;
begin
  if actor is null then raise exception 'unauthenticated' using errcode='42501'; end if;
  if public.is_user_suspended(actor) then raise exception 'suspended' using errcode='42501'; end if;

  select * into photo from public.profile_photos where id=p_photo_id;
  if not found then raise exception 'photo_not_found'; end if;

  select handle into owner_handle from public.profiles where id=photo.user_id;
  post_body:=coalesce(nullif(trim(photo.caption),''),'Imagem do Canto de @'||owner_handle||' virada para o feed.');
  if char_length(post_body)<12 then post_body:=post_body||' · do Canto de @'||owner_handle; end if;

  insert into public.posts(
    author_id,recipient_id,body,visibility,reshare_post_id,reshare_photo_id,reshare_author_id
  )
  values(actor,null,left(post_body,420),'publico',null,photo.id,photo.user_id)
  returning id into new_id;

  return new_id;
end;
$$;
revoke all on function public.virar_foto(uuid) from public;
grant execute on function public.virar_foto(uuid) to authenticated;

create or replace view public.feed_attention as
select
  p.id,p.author_id,p.recipient_id,p.body,p.image_url,p.visibility,p.created_at,p.edited_at,
  a.handle as author_handle,a.display_name as author_name,a.avatar_url as author_avatar,
  r.handle as recipient_handle,r.display_name as recipient_name,r.avatar_url as recipient_avatar,
  count(distinct rs.id)::integer as response_count,
  count(distinct ss.supporter_id)::integer as private_support_count,
  extract(epoch from now()-p.created_at)/3600.0/greatest(1::bigint,count(distinct rs.id)+1)::numeric as attention_need,
  p.media_url,p.media_kind,
  p.reshare_post_id,p.reshare_photo_id,p.reshare_author_id,
  oa.handle as reshare_author_handle,oa.display_name as reshare_author_name,oa.avatar_url as reshare_author_avatar,
  ph.storage_path as reshare_photo_storage_path,ph.caption as reshare_photo_caption
from public.posts p
join public.profiles a on a.id=p.author_id
left join public.profiles r on r.id=p.recipient_id
left join public.profiles oa on oa.id=p.reshare_author_id
left join public.profile_photos ph on ph.id=p.reshare_photo_id
left join public.responses rs on rs.post_id=p.id and not public.is_blocked_pair(rs.author_id,(select auth.uid()))
left join public.support_signals ss on ss.post_id=p.id and not public.is_blocked_pair(ss.supporter_id,(select auth.uid()))
where p.visibility='publico'::post_visibility
  and not public.is_blocked_pair(p.author_id,(select auth.uid()))
  and (p.recipient_id is null or not public.is_blocked_pair(p.recipient_id,(select auth.uid())))
group by p.id,a.id,r.id,oa.id,ph.id;

create or replace function public.admin_update_site_settings(
  p_site_name text,p_tagline text,p_color_bg text,p_color_panel text,p_color_panel2 text,
  p_color_ink text,p_color_muted text,p_color_line text,p_color_acid text,p_color_cyan text,
  p_color_coral text,p_color_violet text,p_custom_css text,p_announcement text
)
returns public.site_settings
language plpgsql
security definer
set search_path=public
as $$
declare
  row_out public.site_settings;
  actor uuid := (select auth.uid());
  c text;
begin
  if not public.is_avesso_admin() then raise exception 'forbidden' using errcode='42501'; end if;
  foreach c in array array[
    p_color_bg,p_color_panel,p_color_panel2,p_color_ink,p_color_muted,p_color_line,
    p_color_acid,p_color_cyan,p_color_coral,p_color_violet
  ] loop
    if c !~ '^#[0-9A-Fa-f]{6}$' then raise exception 'invalid_color'; end if;
  end loop;

  update public.site_settings set
    site_name=left(coalesce(nullif(trim(p_site_name),''),'AVESSO'),40),
    tagline=left(coalesce(p_tagline,''),120),
    color_bg=p_color_bg,color_panel=p_color_panel,color_panel2=p_color_panel2,
    color_ink=p_color_ink,color_muted=p_color_muted,color_line=p_color_line,
    color_acid=p_color_acid,color_cyan=p_color_cyan,color_coral=p_color_coral,color_violet=p_color_violet,
    custom_css=left(coalesce(p_custom_css,''),20000),
    announcement=left(coalesce(p_announcement,''),240),
    updated_by=actor,updated_at=now()
  where id='global'
  returning * into row_out;

  insert into public.admin_audit_log(admin_id,action,target_type,target_id)
  values(actor,'update_site_settings','site','global');
  return row_out;
end;
$$;
revoke all on function public.admin_update_site_settings(text,text,text,text,text,text,text,text,text,text,text,text,text,text) from public;
grant execute on function public.admin_update_site_settings(text,text,text,text,text,text,text,text,text,text,text,text,text,text) to authenticated;

create or replace function public.admin_set_user_suspension(
  p_user_id uuid,p_suspended boolean,p_reason text default '',p_until timestamptz default null
)
returns public.user_moderation
language plpgsql
security definer
set search_path=public
as $$
declare
  actor uuid := (select auth.uid());
  actor_role text;
  target_role text;
  row_out public.user_moderation;
begin
  select role into actor_role from public.admin_users where user_id=actor;
  if actor_role is null then raise exception 'forbidden' using errcode='42501'; end if;
  if p_user_id=actor then raise exception 'cannot_suspend_self'; end if;
  select role into target_role from public.admin_users where user_id=p_user_id;
  if target_role is not null and actor_role<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;

  insert into public.user_moderation(user_id,suspended,reason,suspended_until,updated_by,updated_at)
  values(p_user_id,p_suspended,left(coalesce(p_reason,''),500),p_until,actor,now())
  on conflict(user_id) do update set
    suspended=excluded.suspended,reason=excluded.reason,suspended_until=excluded.suspended_until,
    updated_by=excluded.updated_by,updated_at=excluded.updated_at
  returning * into row_out;

  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,case when p_suspended then 'suspend_user' else 'restore_user' end,'profile',p_user_id::text,
         jsonb_build_object('reason',left(coalesce(p_reason,''),500),'until',p_until));
  return row_out;
end;
$$;
revoke all on function public.admin_set_user_suspension(uuid,boolean,text,timestamptz) from public;
grant execute on function public.admin_set_user_suspension(uuid,boolean,text,timestamptz) to authenticated;

create or replace function public.admin_set_user_role(p_user_id uuid,p_role text)
returns text
language plpgsql
security definer
set search_path=public
as $$
declare
  actor uuid := (select auth.uid());
  actor_role text;
begin
  select role into actor_role from public.admin_users where user_id=actor;
  if actor_role<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  if p_user_id=actor and p_role<>'owner' then raise exception 'owner_cannot_demote_self'; end if;

  if p_role='none' then
    delete from public.admin_users where user_id=p_user_id;
  elsif p_role in ('admin','owner') then
    insert into public.admin_users(user_id,role) values(p_user_id,p_role)
    on conflict(user_id) do update set role=excluded.role;
  else
    raise exception 'invalid_role';
  end if;

  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'set_admin_role','profile',p_user_id::text,jsonb_build_object('role',p_role));
  return p_role;
end;
$$;
revoke all on function public.admin_set_user_role(uuid,text) from public;
grant execute on function public.admin_set_user_role(uuid,text) to authenticated;

create or replace function public.admin_delete_post(p_id uuid) returns boolean
language plpgsql security definer set search_path=public as $$
declare actor uuid := (select auth.uid()); affected integer;
begin
  if not public.is_avesso_admin() then raise exception 'forbidden' using errcode='42501'; end if;
  delete from public.posts where id=p_id; get diagnostics affected=row_count;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id) values(actor,'delete_post','post',p_id::text);
  return affected>0;
end; $$;

create or replace function public.admin_delete_response(p_id uuid) returns boolean
language plpgsql security definer set search_path=public as $$
declare actor uuid := (select auth.uid()); affected integer;
begin
  if not public.is_avesso_admin() then raise exception 'forbidden' using errcode='42501'; end if;
  delete from public.responses where id=p_id; get diagnostics affected=row_count;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id) values(actor,'delete_response','response',p_id::text);
  return affected>0;
end; $$;

create or replace function public.admin_delete_photo(p_id uuid) returns boolean
language plpgsql security definer set search_path=public as $$
declare actor uuid := (select auth.uid()); affected integer;
begin
  if not public.is_avesso_admin() then raise exception 'forbidden' using errcode='42501'; end if;
  delete from public.profile_photos where id=p_id; get diagnostics affected=row_count;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id) values(actor,'delete_photo','photo',p_id::text);
  return affected>0;
end; $$;

create or replace function public.admin_delete_story(p_id uuid) returns boolean
language plpgsql security definer set search_path=public as $$
declare actor uuid := (select auth.uid()); affected integer;
begin
  if not public.is_avesso_admin() then raise exception 'forbidden' using errcode='42501'; end if;
  delete from public.stories where id=p_id; get diagnostics affected=row_count;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id) values(actor,'delete_story','story',p_id::text);
  return affected>0;
end; $$;

revoke all on function public.admin_delete_post(uuid) from public;
revoke all on function public.admin_delete_response(uuid) from public;
revoke all on function public.admin_delete_photo(uuid) from public;
revoke all on function public.admin_delete_story(uuid) from public;
grant execute on function public.admin_delete_post(uuid) to authenticated;
grant execute on function public.admin_delete_response(uuid) to authenticated;
grant execute on function public.admin_delete_photo(uuid) to authenticated;
grant execute on function public.admin_delete_story(uuid) to authenticated;

create or replace function public.admin_dashboard_snapshot()
returns jsonb
language plpgsql
stable
security definer
set search_path=public
as $$
declare result jsonb;
begin
  if not public.is_avesso_admin() then raise exception 'forbidden' using errcode='42501'; end if;

  select jsonb_build_object(
    'counts',jsonb_build_object(
      'users',(select count(*) from public.profiles),
      'users_7d',(select count(*) from public.profiles where created_at>=now()-interval '7 days'),
      'online_now',(select count(*) from public.profiles where presence_mode<>'invisible' and online_until>now()),
      'posts',(select count(*) from public.posts),
      'responses',(select count(*) from public.responses),
      'stories_active',(select count(*) from public.stories where expires_at>now()),
      'direct_messages',(select count(*) from public.direct_messages where deleted_at is null),
      'friendships',(select count(*) from public.friendships where status='accepted'),
      'reports_open',(select count(*) from public.reports where status='aberto'),
      'suspended_users',(select count(*) from public.user_moderation where suspended and (suspended_until is null or suspended_until>now()))
    ),
    'recent_users',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,'display_name',p.display_name,'handle',p.handle,'avatar_url',p.avatar_url,
        'created_at',p.created_at,'presence_mode',p.presence_mode,'last_seen',p.last_seen,'online_until',p.online_until,
        'admin_role',a.role,'suspended',coalesce(m.suspended,false) and (m.suspended_until is null or m.suspended_until>now()),
        'suspension_reason',coalesce(m.reason,''),'suspended_until',m.suspended_until
      ) order by p.created_at desc)
      from (select * from public.profiles order by created_at desc limit 40) p
      left join public.admin_users a on a.user_id=p.id
      left join public.user_moderation m on m.user_id=p.id
    ),'[]'::jsonb),
    'reports',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',x.id,'reason',x.reason,'details',x.details,'status',x.status,'created_at',x.created_at,
        'post_id',x.post_id,'reported_profile_id',x.reported_profile_id,
        'reporter',jsonb_build_object('display_name',x.reporter_name,'handle',x.reporter_handle),
        'reported_profile',case when x.reported_profile_id is null then null else jsonb_build_object('display_name',x.reported_name,'handle',x.reported_handle) end
      ) order by x.created_at desc)
      from (
        select r.*,rp.display_name reporter_name,rp.handle reporter_handle,tp.display_name reported_name,tp.handle reported_handle
        from public.reports r
        left join public.profiles rp on rp.id=r.reporter_id
        left join public.profiles tp on tp.id=r.reported_profile_id
        order by r.created_at desc limit 50
      ) x
    ),'[]'::jsonb),
    'world',coalesce((select to_jsonb(w) from public.world_settings w where w.id='global'),'{}'::jsonb),
    'site',coalesce((select to_jsonb(s) from public.site_settings s where s.id='global'),'{}'::jsonb),
    'recent_posts',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,'body',p.body,'created_at',p.created_at,'author_id',p.author_id,
        'author_name',u.display_name,'author_handle',u.handle,'image_url',p.image_url,'media_kind',p.media_kind
      ) order by p.created_at desc)
      from (select * from public.posts where visibility='publico' order by created_at desc limit 30) p
      join public.profiles u on u.id=p.author_id
    ),'[]'::jsonb),
    'recent_responses',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',r.id,'post_id',r.post_id,'body',r.body,'created_at',r.created_at,'author_id',r.author_id,
        'author_name',u.display_name,'author_handle',u.handle
      ) order by r.created_at desc)
      from (select * from public.responses order by created_at desc limit 30) r
      join public.profiles u on u.id=r.author_id
    ),'[]'::jsonb),
    'recent_photos',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',p.id,'storage_path',p.storage_path,'caption',p.caption,'created_at',p.created_at,'user_id',p.user_id,
        'author_name',u.display_name,'author_handle',u.handle
      ) order by p.created_at desc)
      from (select * from public.profile_photos order by created_at desc limit 24) p
      join public.profiles u on u.id=p.user_id
    ),'[]'::jsonb),
    'recent_stories',coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',s.id,'body',s.body,'image_path',s.image_path,'media_type',s.media_type,'created_at',s.created_at,'expires_at',s.expires_at,
        'author_id',s.author_id,'author_name',u.display_name,'author_handle',u.handle
      ) order by s.created_at desc)
      from (select * from public.stories order by created_at desc limit 24) s
      join public.profiles u on u.id=s.author_id
    ),'[]'::jsonb),
    'audit',coalesce((
      select jsonb_agg(to_jsonb(a) order by a.created_at desc)
      from (select * from public.admin_audit_log order by created_at desc limit 40) a
    ),'[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.admin_dashboard_snapshot() from public;
grant execute on function public.admin_dashboard_snapshot() to authenticated;
