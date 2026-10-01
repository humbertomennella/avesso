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
