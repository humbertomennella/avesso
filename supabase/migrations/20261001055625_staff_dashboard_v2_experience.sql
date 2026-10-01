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

