-- AVESSO // mantém badges administrativos dentro do catálogo genérico.

create or replace function public.avesso_sync_badge_catalog()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  insert into public.avesso_item_catalog(
    slug,item_type,name,description,asset_path,rarity,tradable,soulbound,badge_id,metadata,sort_order,active
  )
  values(
    new.slug,
    'badge',
    new.name,
    new.description,
    new.image_path,
    'common',
    false,
    true,
    new.id,
    jsonb_build_object('glyph','◆','criteria','Concedido pela administração do AVESSO.'),
    100,
    new.active
  )
  on conflict (badge_id) do update set
    slug=excluded.slug,
    name=excluded.name,
    description=excluded.description,
    asset_path=excluded.asset_path,
    active=excluded.active,
    updated_at=now();
  return new;
end;
$$;

revoke all on function public.avesso_sync_badge_catalog() from public,anon,authenticated;

drop trigger if exists avesso_badges_catalog_sync on public.badges;
create trigger avesso_badges_catalog_sync
after insert or update of slug,name,description,image_path,active on public.badges
for each row execute function public.avesso_sync_badge_catalog();

-- Backfill defensivo para qualquer badge legado fora do catálogo.
insert into public.avesso_item_catalog(
  slug,item_type,name,description,asset_path,rarity,tradable,soulbound,badge_id,metadata,sort_order,active
)
select
  b.slug,'badge',b.name,b.description,b.image_path,'common',false,true,b.id,
  jsonb_build_object('glyph','◆','criteria','Concedido pela administração do AVESSO.'),100,b.active
from public.badges b
where not exists(select 1 from public.avesso_item_catalog c where c.badge_id=b.id)
on conflict do nothing;
