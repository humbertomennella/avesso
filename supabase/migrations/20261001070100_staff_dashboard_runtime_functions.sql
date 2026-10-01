-- AVESSO // Staff runtime RPCs
-- Funções auditadas consumidas pela Dashboard V3.

create or replace function public.staff_assign_report(p_report_id uuid,p_assignee uuid)
returns public.reports language plpgsql security definer set search_path=public as $$
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
end $$;

create or replace function public.staff_forward_report(p_report_id uuid,p_assignee uuid,p_note text default '')
returns public.reports language plpgsql security definer set search_path=public as $$
declare actor uuid:=(select auth.uid()); actor_role text:=public.current_staff_role(); assignee_role text; outrow public.reports;
begin
  if public.staff_role_rank(actor_role)<10 then raise exception 'forbidden' using errcode='42501'; end if;
  select role into assignee_role from public.admin_users where user_id=p_assignee;
  if assignee_role is null then raise exception 'assignee_not_staff'; end if;
  update public.reports set assigned_to=p_assignee,assigned_by=actor,assigned_at=now(),status='encaminhado',
    staff_notes=left(concat_ws(E'\n',nullif(staff_notes,''),'ENCAMINHADO: '||left(coalesce(p_note,''),500)),3000),updated_at=now()
  where id=p_report_id returning * into outrow;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'forward_report','report',p_report_id::text,jsonb_build_object('assignee',p_assignee,'note',left(coalesce(p_note,''),500)));
  return outrow;
end $$;

create or replace function public.staff_update_report(
  p_report_id uuid,p_status text,p_assigned_to uuid default null,p_priority text default null,
  p_staff_notes text default null,p_resolution text default null
)
returns public.reports language plpgsql security definer set search_path=public as $$
declare actor uuid:=(select auth.uid()); role_name text:=public.current_staff_role(); outrow public.reports;
begin
  if public.staff_rank(role_name)<10 then raise exception 'forbidden' using errcode='42501'; end if;
  if p_status not in ('aberto','em_analise','encaminhado','resolvido','descartado','arquivado') then raise exception 'invalid_status'; end if;
  if p_priority is not null and p_priority not in ('baixa','normal','alta','critica') then raise exception 'invalid_priority'; end if;
  if p_assigned_to is not null and not exists(select 1 from public.admin_users where user_id=p_assigned_to) then raise exception 'invalid_assignee'; end if;
  update public.reports set status=p_status,assigned_to=coalesce(p_assigned_to,assigned_to),
    assigned_by=case when p_assigned_to is not null then actor else assigned_by end,
    assigned_at=case when p_assigned_to is not null then now() else assigned_at end,
    priority=coalesce(p_priority,priority),
    staff_notes=case when p_staff_notes is null then staff_notes else left(p_staff_notes,3000) end,
    resolution=case when p_resolution is null then resolution else left(p_resolution,2000) end,
    resolved_by=case when p_status in ('resolvido','descartado','arquivado') then actor else resolved_by end,
    resolved_at=case when p_status in ('resolvido','descartado','arquivado') then now() else resolved_at end,
    updated_at=now()
  where id=p_report_id returning * into outrow;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id,metadata)
  values(actor,'report_update','report',p_report_id::text,jsonb_build_object('status',p_status,'assigned_to',p_assigned_to,'priority',p_priority));
  return outrow;
end $$;

create or replace function public.staff_resolve_alert(p_id uuid,p_status text,p_resolution text default '')
returns public.moderation_alerts language plpgsql security definer set search_path=public as $$
declare outrow public.moderation_alerts;
begin
  if not public.staff_can('moderator') then raise exception 'forbidden' using errcode='42501'; end if;
  if p_status not in ('novo','em_analise','resolvido','ignorado','encaminhado') then raise exception 'bad_status'; end if;
  update public.moderation_alerts set status=p_status,resolution=left(coalesce(p_resolution,''),1000),
    assigned_to=(select auth.uid()),updated_at=now()
  where id=p_id returning * into outrow;
  return outrow;
end $$;

create or replace function public.staff_delete_public_content(p_kind text,p_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare actor uuid:=(select auth.uid()); affected int:=0;
begin
  if not public.staff_can('moderator') then raise exception 'forbidden' using errcode='42501'; end if;
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
end $$;

create or replace function public.staff_moderation_content_snapshot()
returns jsonb language plpgsql stable security definer set search_path=public as $$
declare result jsonb;
begin
  if not public.staff_can('moderator') then raise exception 'forbidden' using errcode='42501'; end if;
  select jsonb_build_object(
    'posts',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'body',p.body,'created_at',p.created_at,'author_id',p.author_id,'author_name',u.display_name,'author_handle',u.handle,'image_url',p.image_url,'media_kind',p.media_kind) order by p.created_at desc) from (select * from public.posts where visibility='publico' order by created_at desc limit 60) p join public.profiles u on u.id=p.author_id),'[]'::jsonb),
    'responses',coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'post_id',r.post_id,'body',r.body,'created_at',r.created_at,'author_id',r.author_id,'author_name',u.display_name,'author_handle',u.handle) order by r.created_at desc) from (select * from public.responses order by created_at desc limit 60) r join public.profiles u on u.id=r.author_id),'[]'::jsonb),
    'photos',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'storage_path',p.storage_path,'caption',p.caption,'created_at',p.created_at,'user_id',p.user_id,'author_name',u.display_name,'author_handle',u.handle) order by p.created_at desc) from (select * from public.profile_photos order by created_at desc limit 60) p join public.profiles u on u.id=p.user_id),'[]'::jsonb),
    'stories',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'body',s.body,'created_at',s.created_at,'expires_at',s.expires_at,'author_id',s.author_id,'author_name',u.display_name,'author_handle',u.handle) order by s.created_at desc) from (select * from public.stories order by created_at desc limit 60) s join public.profiles u on u.id=s.author_id),'[]'::jsonb),
    'plaza',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'body',m.body,'created_at',m.created_at,'user_id',m.user_id,'author_name',u.display_name,'author_handle',u.handle) order by m.created_at desc) from (select * from public.plaza_messages where user_id is not null order by created_at desc limit 100) m join public.profiles u on u.id=m.user_id),'[]'::jsonb)
  ) into result;
  return result;
end $$;

create or replace function public.owner_save_site_override(p_id uuid,p_page text,p_selector text,p_action text,p_value text,p_enabled boolean,p_sort_order integer)
returns public.site_overrides language plpgsql security definer set search_path=public as $$
declare outrow public.site_overrides;
begin
  if not public.staff_can('owner') then raise exception 'owner_required' using errcode='42501'; end if;
  if p_action not in ('text','src','alt','hide','show','append_text','prepend_text','background_image') then raise exception 'bad_action'; end if;
  if p_id is null then
    insert into public.site_overrides(page,selector,action,value,enabled,sort_order,updated_by)
    values(left(coalesce(p_page,'global'),80),left(trim(p_selector),300),p_action,left(coalesce(p_value,''),4000),p_enabled,coalesce(p_sort_order,0),(select auth.uid())) returning * into outrow;
  else
    update public.site_overrides set page=left(coalesce(p_page,'global'),80),selector=left(trim(p_selector),300),action=p_action,
      value=left(coalesce(p_value,''),4000),enabled=p_enabled,sort_order=coalesce(p_sort_order,0),updated_by=(select auth.uid()),updated_at=now()
    where id=p_id returning * into outrow;
  end if;
  return outrow;
end $$;
create or replace function public.owner_delete_site_override(p_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if not public.staff_can('owner') then raise exception 'owner_required' using errcode='42501'; end if;
  delete from public.site_overrides where id=p_id; return found;
end $$;

create or replace function public.owner_update_character(
  p_id uuid,p_name text,p_role text,p_bio text,p_personality text,p_accent_color text,p_avatar_url text,
  p_home_location text,p_presence_state text,p_rarity integer,p_ai_enabled boolean,p_is_active boolean
)
returns public.characters language plpgsql security definer set search_path=public as $$
declare actor uuid:=(select auth.uid()); outrow public.characters;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  update public.characters set name=left(trim(p_name),60),role=left(trim(p_role),100),bio=left(coalesce(p_bio,''),1000),
    personality=left(coalesce(p_personality,''),4000),accent_color=p_accent_color,avatar_url=nullif(trim(p_avatar_url),''),
    home_location=left(trim(p_home_location),100),presence_state=p_presence_state,rarity=greatest(1,least(1000,p_rarity)),
    ai_enabled=p_ai_enabled,is_active=p_is_active where id=p_id returning * into outrow;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id) values(actor,'character_update','character',p_id::text);
  return outrow;
end $$;

create or replace function public.owner_upsert_character_ai(
  p_character_id uuid,p_model text,p_persona_summary text,p_system_prompt text,p_behavior_rules jsonb,
  p_voice_rules jsonb,p_max_output_chars integer,p_ai_enabled boolean
)
returns public.character_ai_profiles language plpgsql security definer set search_path=public as $$
declare actor uuid:=(select auth.uid()); outrow public.character_ai_profiles;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  insert into public.character_ai_profiles(character_id,model,persona_summary,system_prompt,behavior_rules,voice_rules,max_output_chars,ai_enabled,updated_at)
  values(p_character_id,left(trim(p_model),80),left(coalesce(p_persona_summary,''),3000),left(coalesce(p_system_prompt,''),12000),
    coalesce(p_behavior_rules,'{}'),coalesce(p_voice_rules,'{}'),greatest(80,least(1200,p_max_output_chars)),p_ai_enabled,now())
  on conflict(character_id) do update set model=excluded.model,persona_summary=excluded.persona_summary,system_prompt=excluded.system_prompt,
    behavior_rules=excluded.behavior_rules,voice_rules=excluded.voice_rules,max_output_chars=excluded.max_output_chars,ai_enabled=excluded.ai_enabled,updated_at=now()
  returning * into outrow;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id) values(actor,'character_ai_update','character',p_character_id::text);
  return outrow;
end $$;

create or replace function public.owner_save_character_dialogue(p_id uuid,p_character_id uuid,p_context text,p_body text,p_weight integer,p_enabled boolean)
returns public.character_dialogues language plpgsql security definer set search_path=public as $$
declare actor uuid:=(select auth.uid()); outrow public.character_dialogues;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  if p_id is null then
    insert into public.character_dialogues(character_id,context,body,weight,enabled)
    values(p_character_id,p_context,left(p_body,420),greatest(1,least(100,p_weight)),p_enabled) returning * into outrow;
  else
    update public.character_dialogues set character_id=p_character_id,context=p_context,body=left(p_body,420),weight=greatest(1,least(100,p_weight)),enabled=p_enabled
    where id=p_id returning * into outrow;
  end if;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id) values(actor,'character_dialogue_save','character_dialogue',outrow.id::text);
  return outrow;
end $$;
create or replace function public.owner_delete_character_dialogue(p_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare actor uuid:=(select auth.uid()); n int;
begin
  if public.current_staff_role()<>'owner' then raise exception 'owner_required' using errcode='42501'; end if;
  delete from public.character_dialogues where id=p_id; get diagnostics n=row_count;
  insert into public.admin_audit_log(admin_id,action,target_type,target_id) values(actor,'character_dialogue_delete','character_dialogue',p_id::text);
  return n>0;
end $$;

create or replace function public.staff_dashboard_snapshot()
returns jsonb language plpgsql stable security definer set search_path=public as $$
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
    'users',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'display_name',p.display_name,'handle',p.handle,'avatar_url',p.avatar_url,'status_message',p.status_message,'created_at',p.created_at,'presence_mode',p.presence_mode,'last_seen',p.last_seen,'online_until',p.online_until,'staff_role',a.role,'suspended',coalesce(m.suspended,false) and (m.suspended_until is null or m.suspended_until>now()),'suspension_reason',coalesce(m.reason,''),'suspended_until',m.suspended_until) order by p.created_at desc) from (select * from public.profiles order by created_at desc limit 150) p left join public.admin_users a on a.user_id=p.id left join public.user_moderation m on m.user_id=p.id),'[]'::jsonb),
    'staff',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'display_name',p.display_name,'handle',p.handle,'avatar_url',p.avatar_url,'role',a.role,'created_at',a.created_at,'warnings',(select count(*) from public.staff_warnings w where w.staff_user_id=p.id and w.active)) order by public.staff_role_rank(a.role) desc,p.display_name) from public.admin_users a join public.profiles p on p.id=a.user_id),'[]'::jsonb),
    'reports',coalesce((select jsonb_agg(jsonb_build_object('id',x.id,'reason',x.reason,'details',x.details,'status',x.status,'priority',x.priority,'created_at',x.created_at,'post_id',x.post_id,'reported_profile_id',x.reported_profile_id,'assigned_to',x.assigned_to,'staff_notes',x.staff_notes,'resolution',x.resolution,'reporter',jsonb_build_object('id',x.reporter_id,'display_name',x.reporter_name,'handle',x.reporter_handle),'reported_profile',case when x.reported_profile_id is null then null else jsonb_build_object('id',x.reported_profile_id,'display_name',x.reported_name,'handle',x.reported_handle) end) order by x.created_at desc) from (select rr.*,rp.display_name reporter_name,rp.handle reporter_handle,tp.display_name reported_name,tp.handle reported_handle from public.reports rr left join public.profiles rp on rp.id=rr.reporter_id left join public.profiles tp on tp.id=rr.reported_profile_id order by rr.created_at desc limit 120) x),'[]'::jsonb),
    'alerts',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'source_type',m.source_type,'source_id',m.source_id,'user_id',m.user_id,'matched_term',m.matched_term,'excerpt',m.excerpt,'severity',m.severity,'status',m.status,'assigned_to',m.assigned_to,'resolution',m.resolution,'created_at',m.created_at,'user_handle',p.handle,'user_name',p.display_name) order by m.created_at desc) from (select * from public.moderation_alerts order by created_at desc limit 120) m left join public.profiles p on p.id=m.user_id),'[]'::jsonb),
    'terms',coalesce((select jsonb_agg(to_jsonb(t) order by t.category,t.term) from public.moderation_terms t),'[]'::jsonb),
    'warnings',case when public.staff_role_rank(r)>=20 then coalesce((select jsonb_agg(jsonb_build_object('id',w.id,'staff_user_id',w.staff_user_id,'issued_by',w.issued_by,'reason',w.reason,'severity',w.severity,'active',w.active,'created_at',w.created_at,'staff_handle',p.handle,'staff_name',p.display_name,'issuer_handle',i.handle) order by w.created_at desc) from public.staff_warnings w join public.profiles p on p.id=w.staff_user_id join public.profiles i on i.id=w.issued_by),'[]'::jsonb) else '[]'::jsonb end,
    'site',case when r='owner' then coalesce((select to_jsonb(s) from public.site_settings s where id='global'),'{}'::jsonb) else '{}'::jsonb end,
    'content_blocks',case when r='owner' then coalesce((select jsonb_agg(to_jsonb(b) order by b.page_slug,b.sort_order,b.updated_at desc) from public.site_content_blocks b),'[]'::jsonb) else '[]'::jsonb end,
    'site_overrides',case when r='owner' then coalesce((select jsonb_agg(to_jsonb(o) order by o.sort_order,o.updated_at desc) from public.site_overrides o),'[]'::jsonb) else '[]'::jsonb end,
    'assets',case when r='owner' then coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc) from public.admin_assets a),'[]'::jsonb) else '[]'::jsonb end,
    'badges',case when r='owner' then coalesce((select jsonb_agg(to_jsonb(b) order by b.created_at desc) from public.badges b),'[]'::jsonb) else '[]'::jsonb end,
    'user_badges',case when r='owner' then coalesce((select jsonb_agg(to_jsonb(ub)) from public.user_badges ub),'[]'::jsonb) else '[]'::jsonb end,
    'characters',case when r='owner' then coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'slug',c.slug,'name',c.name,'role',c.role,'bio',c.bio,'accent_color',c.accent_color,'avatar_url',c.avatar_url,'image_path',c.image_path,'personality',c.personality,'home_location',c.home_location,'presence_state',c.presence_state,'rarity',c.rarity,'ai_enabled',c.ai_enabled,'is_active',c.is_active,'ai_profile',case when ai.character_id is null then null else to_jsonb(ai) end) order by c.slug) from public.characters c left join public.character_ai_profiles ai on ai.character_id=c.id),'[]'::jsonb) else '[]'::jsonb end,
    'dialogues',case when r='owner' then coalesce((select jsonb_agg(to_jsonb(d) order by d.created_at desc) from public.character_dialogues d),'[]'::jsonb) else '[]'::jsonb end,
    'audit',case when r='owner' then coalesce((select jsonb_agg(to_jsonb(a) order by a.created_at desc) from (select * from public.admin_audit_log order by created_at desc limit 120) a),'[]'::jsonb) else '[]'::jsonb end
  ) into result;
  return result;
end $$;
create or replace function public.admin_dashboard_snapshot()
returns jsonb language sql stable security definer set search_path=public as $$ select public.staff_dashboard_snapshot(); $$;

revoke all on function public.staff_assign_report(uuid,uuid),public.staff_forward_report(uuid,uuid,text),public.staff_update_report(uuid,text,uuid,text,text,text),public.staff_resolve_alert(uuid,text,text),public.staff_delete_public_content(text,uuid),public.staff_moderation_content_snapshot(),public.owner_save_site_override(uuid,text,text,text,text,boolean,integer),public.owner_delete_site_override(uuid),public.owner_update_character(uuid,text,text,text,text,text,text,text,text,integer,boolean,boolean),public.owner_upsert_character_ai(uuid,text,text,text,jsonb,jsonb,integer,boolean),public.owner_save_character_dialogue(uuid,uuid,text,text,integer,boolean),public.owner_delete_character_dialogue(uuid),public.staff_dashboard_snapshot(),public.admin_dashboard_snapshot() from public;
grant execute on function public.staff_assign_report(uuid,uuid),public.staff_forward_report(uuid,uuid,text),public.staff_update_report(uuid,text,uuid,text,text,text),public.staff_resolve_alert(uuid,text,text),public.staff_delete_public_content(text,uuid),public.staff_moderation_content_snapshot(),public.owner_save_site_override(uuid,text,text,text,text,boolean,integer),public.owner_delete_site_override(uuid),public.owner_update_character(uuid,text,text,text,text,text,text,text,text,integer,boolean,boolean),public.owner_upsert_character_ai(uuid,text,text,text,jsonb,jsonb,integer,boolean),public.owner_save_character_dialogue(uuid,uuid,text,text,integer,boolean),public.owner_delete_character_dialogue(uuid),public.staff_dashboard_snapshot(),public.admin_dashboard_snapshot() to authenticated;
