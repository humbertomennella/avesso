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

