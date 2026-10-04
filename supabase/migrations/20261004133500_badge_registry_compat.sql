-- AVESSO // compatibilidade do registro legado de badges
-- Repara drift entre app.js/RPCs antigos e o schema atual sem duplicar ownership.

alter table public.badges
  add column if not exists asset_id uuid references public.admin_assets(id) on delete set null;

alter table public.user_badges
  add column if not exists assigned_at timestamptz;

update public.user_badges
set assigned_at = created_at
where assigned_at is null;

alter table public.user_badges
  alter column assigned_at set default now(),
  alter column assigned_at set not null;

create or replace function public.owner_create_badge(
  p_asset_id uuid,
  p_name text,
  p_slug text,
  p_description text default ''::text
)
returns public.badges
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  outrow public.badges;
  v_image_path text;
begin
  if not public.staff_can('owner') then
    raise exception 'owner_required' using errcode='42501';
  end if;

  select storage_path into v_image_path
  from public.admin_assets
  where id = p_asset_id;

  insert into public.badges(asset_id,name,slug,description,image_path,created_by)
  values(
    p_asset_id,
    left(trim(p_name),60),
    left(trim(p_slug),50),
    left(coalesce(p_description,''),300),
    coalesce(nullif(v_image_path,''),'assets/avesso-app-icon.svg'),
    (select auth.uid())
  )
  returning * into outrow;

  return outrow;
end;
$$;

create or replace function public.owner_assign_badge(p_user_id uuid,p_badge_id uuid)
returns boolean
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  if not public.staff_can('owner') then
    raise exception 'owner_required' using errcode='42501';
  end if;

  insert into public.user_badges(user_id,badge_id,granted_by,source,assigned_at)
  values(p_user_id,p_badge_id,(select auth.uid()),'owner_assign',now())
  on conflict (user_id,badge_id) do nothing;

  return true;
end;
$$;
