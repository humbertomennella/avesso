-- AVESSO // Economia v2 - Inventário + Badges
-- Mantém a economia em shadow mode. Nenhuma operação nesta migration altera Saldo/ledger.

alter table public.user_badges
  add column if not exists source text not null default 'manual',
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.avesso_item_catalog (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9_-]{2,64}$'),
  item_type text not null check (item_type in ('badge','avatar','theme','emoticon_pack','music','profile_frame','title')),
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '',
  asset_path text,
  rarity text not null default 'common' check (rarity in ('common','uncommon','rare','epic','event')),
  tradable boolean not null default false,
  soulbound boolean not null default true,
  active boolean not null default true,
  badge_id uuid unique references public.badges(id) on delete cascade,
  metadata jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint avesso_item_catalog_trade_check check (not (tradable and soulbound)),
  constraint avesso_item_catalog_badge_check check (
    (item_type = 'badge' and badge_id is not null)
    or (item_type <> 'badge' and badge_id is null)
  )
);

create table if not exists public.avesso_user_inventory (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.avesso_item_catalog(id) on delete cascade,
  quantity integer not null default 1 check (quantity > 0),
  acquisition_source text not null default 'system' check (char_length(acquisition_source) between 2 and 80),
  acquired_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  primary key (user_id,item_id)
);

create table if not exists public.avesso_user_equipment (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  primary_badge_id uuid references public.badges(id) on delete set null,
  updated_at timestamptz not null default now()
);

create index if not exists avesso_item_catalog_active_sort_idx
  on public.avesso_item_catalog(active,item_type,sort_order,created_at);
create index if not exists avesso_user_inventory_user_idx
  on public.avesso_user_inventory(user_id,acquired_at desc);
create index if not exists avesso_user_equipment_badge_idx
  on public.avesso_user_equipment(primary_badge_id)
  where primary_badge_id is not null;

alter table public.avesso_item_catalog enable row level security;
alter table public.avesso_user_inventory enable row level security;
alter table public.avesso_user_equipment enable row level security;

revoke all on table public.avesso_item_catalog from anon, authenticated;
revoke all on table public.avesso_user_inventory from anon, authenticated;
revoke all on table public.avesso_user_equipment from anon, authenticated;

grant select on table public.avesso_item_catalog to authenticated;
grant select on table public.avesso_user_inventory to authenticated;
grant select,insert,update on table public.avesso_user_equipment to authenticated;

drop policy if exists avesso_item_catalog_authenticated_read on public.avesso_item_catalog;
create policy avesso_item_catalog_authenticated_read
on public.avesso_item_catalog for select
to authenticated
using (active = true);

drop policy if exists avesso_user_inventory_owner_read on public.avesso_user_inventory;
create policy avesso_user_inventory_owner_read
on public.avesso_user_inventory for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists avesso_user_equipment_authenticated_read on public.avesso_user_equipment;
create policy avesso_user_equipment_authenticated_read
on public.avesso_user_equipment for select
to authenticated
using (true);

drop policy if exists avesso_user_equipment_owner_insert on public.avesso_user_equipment;
create policy avesso_user_equipment_owner_insert
on public.avesso_user_equipment for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    primary_badge_id is null
    or exists (
      select 1
      from public.user_badges ub
      join public.badges b on b.id = ub.badge_id and b.active = true
      where ub.user_id = (select auth.uid())
        and ub.badge_id = primary_badge_id
    )
  )
);

drop policy if exists avesso_user_equipment_owner_update on public.avesso_user_equipment;
create policy avesso_user_equipment_owner_update
on public.avesso_user_equipment for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    primary_badge_id is null
    or exists (
      select 1
      from public.user_badges ub
      join public.badges b on b.id = ub.badge_id and b.active = true
      where ub.user_id = (select auth.uid())
        and ub.badge_id = primary_badge_id
    )
  )
);

insert into public.badges (slug,name,description,image_path,active)
values
  ('primeira_dobra','Primeira Dobra','Estava aqui quando a casa ainda cheirava a CSS novo.','assets/avesso-app-icon.svg',true),
  ('presenca_real','Presença Real','Para quem aparece, participa e não transforma presença em fazenda de clique.','assets/avesso-app-icon.svg',true),
  ('voz_da_praca','Voz da Praça','Reconhecimento por participação consistente e recíproca na Praça.','assets/avesso-app-icon.svg',true),
  ('cumplice_de_verdade','Cúmplice de Verdade','Um vínculo que evoluiu por convivência real e escolha dos dois lados.','assets/avesso-app-icon.svg',true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  image_path = excluded.image_path,
  active = excluded.active;

insert into public.avesso_item_catalog
  (slug,item_type,name,description,asset_path,rarity,tradable,soulbound,badge_id,metadata,sort_order)
select
  v.slug,
  'badge',
  b.name,
  b.description,
  b.image_path,
  v.rarity,
  false,
  true,
  b.id,
  jsonb_build_object('glyph',v.glyph,'criteria',v.criteria),
  v.sort_order
from (values
  ('primeira_dobra','event','◒','Conta criada durante a fase beta inicial do AVESSO.',10),
  ('presenca_real','rare','◎','Critério futuro: presença ativa qualificada, com limites anti-farm.',20),
  ('voz_da_praca','rare','⌂','Critério futuro: participação comunitária consistente e recíproca.',30),
  ('cumplice_de_verdade','epic','↔','Critério futuro: vínculo Cúmplice bilateral e consolidado.',40)
) as v(slug,rarity,glyph,criteria,sort_order)
join public.badges b on b.slug = v.slug
on conflict (slug) do update set
  item_type = excluded.item_type,
  name = excluded.name,
  description = excluded.description,
  asset_path = excluded.asset_path,
  rarity = excluded.rarity,
  tradable = excluded.tradable,
  soulbound = excluded.soulbound,
  badge_id = excluded.badge_id,
  metadata = excluded.metadata,
  sort_order = excluded.sort_order,
  active = true,
  updated_at = now();

create or replace function public.avesso_sync_badge_inventory()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item_id uuid;
begin
  if tg_op = 'INSERT' then
    select c.id into v_item_id
    from public.avesso_item_catalog c
    where c.badge_id = new.badge_id and c.active = true;

    if v_item_id is not null then
      insert into public.avesso_user_inventory(user_id,item_id,quantity,acquisition_source,metadata)
      values (new.user_id,v_item_id,1,coalesce(nullif(new.source,''),'badge'),coalesce(new.metadata,'{}'::jsonb))
      on conflict (user_id,item_id) do update set
        quantity = greatest(public.avesso_user_inventory.quantity,1),
        acquisition_source = excluded.acquisition_source,
        metadata = public.avesso_user_inventory.metadata || excluded.metadata;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    select c.id into v_item_id
    from public.avesso_item_catalog c
    where c.badge_id = old.badge_id;

    update public.avesso_user_equipment
      set primary_badge_id = null, updated_at = now()
      where user_id = old.user_id and primary_badge_id = old.badge_id;

    if v_item_id is not null then
      delete from public.avesso_user_inventory
      where user_id = old.user_id and item_id = v_item_id;
    end if;
    return old;
  end if;

  return null;
end;
$$;

revoke all on function public.avesso_sync_badge_inventory() from public, anon, authenticated;

drop trigger if exists avesso_user_badges_inventory_sync on public.user_badges;
create trigger avesso_user_badges_inventory_sync
after insert or delete on public.user_badges
for each row execute function public.avesso_sync_badge_inventory();

-- Sincroniza badges antigos, caso já existam antes desta etapa.
insert into public.avesso_user_inventory(user_id,item_id,quantity,acquisition_source,acquired_at,metadata)
select ub.user_id,c.id,1,coalesce(nullif(ub.source,''),'badge'),ub.created_at,coalesce(ub.metadata,'{}'::jsonb)
from public.user_badges ub
join public.avesso_item_catalog c on c.badge_id = ub.badge_id
on conflict (user_id,item_id) do update set
  quantity = greatest(public.avesso_user_inventory.quantity,1);

-- Marco beta: concedido somente às contas que já existem nesta implantação.
insert into public.user_badges(user_id,badge_id,source,metadata)
select p.id,b.id,'beta_seed',jsonb_build_object('phase','economia_v2_inventory_badges')
from public.profiles p
cross join public.badges b
where b.slug = 'primeira_dobra'
on conflict (user_id,badge_id) do nothing;

-- Garante equipamento vazio sem escolher badge pelo usuário.
insert into public.avesso_user_equipment(user_id,primary_badge_id)
select p.id,null
from public.profiles p
on conflict (user_id) do nothing;
