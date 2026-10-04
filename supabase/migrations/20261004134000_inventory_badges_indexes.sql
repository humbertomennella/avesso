-- AVESSO // índices de suporte para Inventário + Badges
create index if not exists avesso_user_inventory_item_idx
  on public.avesso_user_inventory(item_id);

create index if not exists badges_asset_id_idx
  on public.badges(asset_id)
  where asset_id is not null;
