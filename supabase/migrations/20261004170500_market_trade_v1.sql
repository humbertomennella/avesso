-- AVESSO // Economia v3 - Mercado + Trocas
-- Mantem Saldo em shadow mode. Compras com Saldo so executam quando avesso_economy_settings.mode = 'live'.

create table if not exists public.avesso_market_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.avesso_item_catalog(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  price_saldo bigint not null check (price_saldo > 0),
  status text not null default 'active' check (status in ('active','sold','cancelled','expired')),
  buyer_id uuid references public.profiles(id) on delete set null,
  expires_at timestamptz,
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (buyer_id is null or buyer_id <> seller_id)
);

create unique index if not exists avesso_market_one_active_item_per_seller_idx
  on public.avesso_market_listings(seller_id,item_id)
  where status = 'active';
create index if not exists avesso_market_active_created_idx
  on public.avesso_market_listings(status,created_at desc);

create table if not exists public.avesso_market_escrow (
  listing_id uuid primary key references public.avesso_market_listings(id) on delete cascade,
  item_id uuid not null references public.avesso_item_catalog(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.avesso_trade_offers (
  id uuid primary key default gen_random_uuid(),
  proposer_id uuid not null references public.profiles(id) on delete cascade,
  counterparty_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','rejected','cancelled','expired')),
  note text not null default '' check (char_length(note) <= 280),
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (proposer_id <> counterparty_id)
);
create index if not exists avesso_trade_counterparty_status_idx
  on public.avesso_trade_offers(counterparty_id,status,created_at desc);
create index if not exists avesso_trade_proposer_status_idx
  on public.avesso_trade_offers(proposer_id,status,created_at desc);

create table if not exists public.avesso_trade_lines (
  offer_id uuid not null references public.avesso_trade_offers(id) on delete cascade,
  side text not null check (side in ('offer','request')),
  item_id uuid not null references public.avesso_item_catalog(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  primary key (offer_id,side,item_id)
);

create table if not exists public.avesso_trade_escrow (
  offer_id uuid not null references public.avesso_trade_offers(id) on delete cascade,
  item_id uuid not null references public.avesso_item_catalog(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  primary key (offer_id,item_id)
);

alter table public.avesso_market_listings enable row level security;
alter table public.avesso_market_escrow enable row level security;
alter table public.avesso_trade_offers enable row level security;
alter table public.avesso_trade_lines enable row level security;
alter table public.avesso_trade_escrow enable row level security;

revoke all on table public.avesso_market_listings, public.avesso_market_escrow,
  public.avesso_trade_offers, public.avesso_trade_lines, public.avesso_trade_escrow
  from anon, authenticated;

grant select on table public.avesso_market_listings to authenticated;
grant select on table public.avesso_trade_offers, public.avesso_trade_lines to authenticated;

drop policy if exists avesso_market_authenticated_read on public.avesso_market_listings;
create policy avesso_market_authenticated_read
on public.avesso_market_listings for select
to authenticated
using (
  status = 'active'
  or seller_id = (select auth.uid())
  or buyer_id = (select auth.uid())
);

drop policy if exists avesso_trade_participant_read on public.avesso_trade_offers;
create policy avesso_trade_participant_read
on public.avesso_trade_offers for select
to authenticated
using (proposer_id = (select auth.uid()) or counterparty_id = (select auth.uid()));

drop policy if exists avesso_trade_lines_participant_read on public.avesso_trade_lines;
create policy avesso_trade_lines_participant_read
on public.avesso_trade_lines for select
to authenticated
using (
  exists (
    select 1 from public.avesso_trade_offers o
    where o.id = offer_id
      and (o.proposer_id = (select auth.uid()) or o.counterparty_id = (select auth.uid()))
  )
);

create or replace function public.avesso_market_create_listing(
  p_item_id uuid,
  p_quantity integer,
  p_price_saldo bigint,
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_listing uuid;
  v_qty integer;
  v_item public.avesso_item_catalog%rowtype;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if p_quantity is null or p_quantity <= 0 then raise exception 'invalid_quantity'; end if;
  if p_price_saldo is null or p_price_saldo <= 0 then raise exception 'invalid_price'; end if;
  if p_expires_at is not null and p_expires_at <= now() then raise exception 'invalid_expiry'; end if;

  select * into v_item from public.avesso_item_catalog c
  where c.id = p_item_id and c.active = true;
  if not found or not v_item.tradable or v_item.soulbound then raise exception 'item_not_tradable'; end if;

  if exists(select 1 from public.avesso_market_listings l where l.seller_id=v_user and l.item_id=p_item_id and l.status='active') then
    raise exception 'active_listing_exists';
  end if;

  select i.quantity into v_qty
  from public.avesso_user_inventory i
  where i.user_id=v_user and i.item_id=p_item_id
  for update;
  if coalesce(v_qty,0) < p_quantity then raise exception 'insufficient_inventory'; end if;

  if v_qty = p_quantity then
    delete from public.avesso_user_inventory where user_id=v_user and item_id=p_item_id;
  else
    update public.avesso_user_inventory set quantity=quantity-p_quantity where user_id=v_user and item_id=p_item_id;
  end if;

  insert into public.avesso_market_listings(seller_id,item_id,quantity,price_saldo,expires_at)
  values(v_user,p_item_id,p_quantity,p_price_saldo,p_expires_at)
  returning id into v_listing;

  insert into public.avesso_market_escrow(listing_id,item_id,quantity)
  values(v_listing,p_item_id,p_quantity);

  return v_listing;
end;
$$;

revoke all on function public.avesso_market_create_listing(uuid,integer,bigint,timestamptz) from public,anon;
grant execute on function public.avesso_market_create_listing(uuid,integer,bigint,timestamptz) to authenticated;

create or replace function public.avesso_market_cancel_listing(p_listing_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_listing public.avesso_market_listings%rowtype;
  v_escrow public.avesso_market_escrow%rowtype;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  select * into v_listing from public.avesso_market_listings where id=p_listing_id for update;
  if not found or v_listing.seller_id<>v_user then raise exception 'listing_not_found'; end if;
  if v_listing.status<>'active' then return false; end if;
  select * into v_escrow from public.avesso_market_escrow where listing_id=p_listing_id for update;
  if not found then raise exception 'escrow_missing'; end if;

  insert into public.avesso_user_inventory(user_id,item_id,quantity,acquisition_source,metadata)
  values(v_user,v_escrow.item_id,v_escrow.quantity,'market_cancel',jsonb_build_object('listing_id',p_listing_id))
  on conflict(user_id,item_id) do update set quantity=public.avesso_user_inventory.quantity+excluded.quantity;

  delete from public.avesso_market_escrow where listing_id=p_listing_id;
  update public.avesso_market_listings set status='cancelled',updated_at=now() where id=p_listing_id;
  return true;
end;
$$;

revoke all on function public.avesso_market_cancel_listing(uuid) from public,anon;
grant execute on function public.avesso_market_cancel_listing(uuid) to authenticated;

create or replace function public.avesso_market_buy(p_listing_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_buyer uuid := (select auth.uid());
  v_listing public.avesso_market_listings%rowtype;
  v_escrow public.avesso_market_escrow%rowtype;
  v_mode text;
  v_buyer_balance bigint;
  v_debit_id bigint;
  v_credit_id bigint;
begin
  if v_buyer is null then raise exception 'authentication_required'; end if;
  select mode into v_mode from public.avesso_economy_settings where id='global';
  if coalesce(v_mode,'off') <> 'live' then raise exception 'economy_not_live'; end if;

  select * into v_listing from public.avesso_market_listings where id=p_listing_id for update;
  if not found or v_listing.status<>'active' then raise exception 'listing_not_available'; end if;
  if v_listing.seller_id=v_buyer then raise exception 'cannot_buy_own_listing'; end if;
  if v_listing.expires_at is not null and v_listing.expires_at<=now() then raise exception 'listing_expired'; end if;

  select * into v_escrow from public.avesso_market_escrow where listing_id=p_listing_id for update;
  if not found then raise exception 'escrow_missing'; end if;

  insert into public.avesso_wallets(user_id) values(v_buyer) on conflict(user_id) do nothing;
  insert into public.avesso_wallets(user_id) values(v_listing.seller_id) on conflict(user_id) do nothing;

  perform 1 from public.avesso_wallets where user_id in (v_buyer,v_listing.seller_id) order by user_id for update;
  select balance into v_buyer_balance from public.avesso_wallets where user_id=v_buyer;
  if coalesce(v_buyer_balance,0) < v_listing.price_saldo then raise exception 'insufficient_saldo'; end if;

  insert into public.avesso_wallet_ledger(user_id,transaction_type,rule_key,source_type,source_id,amount,idempotency_key,metadata)
  values(v_buyer,'transfer_out',null,'market_listing',p_listing_id::text,-v_listing.price_saldo,'market:buy:out:'||p_listing_id::text,jsonb_build_object('seller_id',v_listing.seller_id))
  returning id into v_debit_id;

  insert into public.avesso_wallet_ledger(user_id,transaction_type,rule_key,source_type,source_id,amount,idempotency_key,metadata)
  values(v_listing.seller_id,'transfer_in',null,'market_listing',p_listing_id::text,v_listing.price_saldo,'market:buy:in:'||p_listing_id::text,jsonb_build_object('buyer_id',v_buyer))
  returning id into v_credit_id;

  update public.avesso_wallets set balance=balance-v_listing.price_saldo,lifetime_spent=lifetime_spent+v_listing.price_saldo,updated_at=now() where user_id=v_buyer;
  update public.avesso_wallets set balance=balance+v_listing.price_saldo,updated_at=now() where user_id=v_listing.seller_id;

  insert into public.avesso_user_inventory(user_id,item_id,quantity,acquisition_source,metadata)
  values(v_buyer,v_escrow.item_id,v_escrow.quantity,'market_purchase',jsonb_build_object('listing_id',p_listing_id,'seller_id',v_listing.seller_id))
  on conflict(user_id,item_id) do update set quantity=public.avesso_user_inventory.quantity+excluded.quantity;

  delete from public.avesso_market_escrow where listing_id=p_listing_id;
  update public.avesso_market_listings
    set status='sold',buyer_id=v_buyer,sold_at=now(),updated_at=now()
    where id=p_listing_id;
  return true;
end;
$$;

revoke all on function public.avesso_market_buy(uuid) from public,anon;
grant execute on function public.avesso_market_buy(uuid) to authenticated;

create or replace function public.avesso_trade_create_offer(
  p_counterparty_id uuid,
  p_offer jsonb,
  p_request jsonb,
  p_note text default '',
  p_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_offer_id uuid;
  v_line jsonb;
  v_item_id uuid;
  v_quantity integer;
  v_owned integer;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  if p_counterparty_id is null or p_counterparty_id=v_user then raise exception 'invalid_counterparty'; end if;
  if not exists(select 1 from public.profiles where id=p_counterparty_id) then raise exception 'counterparty_not_found'; end if;
  if p_expires_at is not null and p_expires_at<=now() then raise exception 'invalid_expiry'; end if;
  if jsonb_typeof(p_offer)<>'array' or jsonb_array_length(p_offer)=0 then raise exception 'empty_offer'; end if;
  if jsonb_typeof(p_request)<>'array' or jsonb_array_length(p_request)=0 then raise exception 'empty_request'; end if;

  insert into public.avesso_trade_offers(proposer_id,counterparty_id,note,expires_at)
  values(v_user,p_counterparty_id,left(coalesce(p_note,''),280),p_expires_at)
  returning id into v_offer_id;

  for v_line in select * from jsonb_array_elements(p_offer)
  loop
    v_item_id := (v_line->>'item_id')::uuid;
    v_quantity := (v_line->>'quantity')::integer;
    if v_quantity<=0 then raise exception 'invalid_quantity'; end if;
    if not exists(select 1 from public.avesso_item_catalog c where c.id=v_item_id and c.active and c.tradable and not c.soulbound) then raise exception 'item_not_tradable'; end if;
    select quantity into v_owned from public.avesso_user_inventory where user_id=v_user and item_id=v_item_id for update;
    if coalesce(v_owned,0)<v_quantity then raise exception 'insufficient_inventory'; end if;
    if v_owned=v_quantity then delete from public.avesso_user_inventory where user_id=v_user and item_id=v_item_id;
    else update public.avesso_user_inventory set quantity=quantity-v_quantity where user_id=v_user and item_id=v_item_id; end if;
    insert into public.avesso_trade_lines(offer_id,side,item_id,quantity) values(v_offer_id,'offer',v_item_id,v_quantity);
    insert into public.avesso_trade_escrow(offer_id,item_id,quantity) values(v_offer_id,v_item_id,v_quantity);
  end loop;

  for v_line in select * from jsonb_array_elements(p_request)
  loop
    v_item_id := (v_line->>'item_id')::uuid;
    v_quantity := (v_line->>'quantity')::integer;
    if v_quantity<=0 then raise exception 'invalid_quantity'; end if;
    if not exists(select 1 from public.avesso_item_catalog c where c.id=v_item_id and c.active and c.tradable and not c.soulbound) then raise exception 'item_not_tradable'; end if;
    insert into public.avesso_trade_lines(offer_id,side,item_id,quantity) values(v_offer_id,'request',v_item_id,v_quantity);
  end loop;

  return v_offer_id;
end;
$$;

revoke all on function public.avesso_trade_create_offer(uuid,jsonb,jsonb,text,timestamptz) from public,anon;
grant execute on function public.avesso_trade_create_offer(uuid,jsonb,jsonb,text,timestamptz) to authenticated;

create or replace function public.avesso_trade_cancel_offer(p_offer_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_offer public.avesso_trade_offers%rowtype;
  v_row record;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  select * into v_offer from public.avesso_trade_offers where id=p_offer_id for update;
  if not found or v_offer.proposer_id<>v_user then raise exception 'offer_not_found'; end if;
  if v_offer.status<>'pending' then return false; end if;

  for v_row in select item_id,quantity from public.avesso_trade_escrow where offer_id=p_offer_id for update
  loop
    insert into public.avesso_user_inventory(user_id,item_id,quantity,acquisition_source,metadata)
    values(v_user,v_row.item_id,v_row.quantity,'trade_cancel',jsonb_build_object('offer_id',p_offer_id))
    on conflict(user_id,item_id) do update set quantity=public.avesso_user_inventory.quantity+excluded.quantity;
  end loop;

  delete from public.avesso_trade_escrow where offer_id=p_offer_id;
  update public.avesso_trade_offers set status='cancelled',updated_at=now() where id=p_offer_id;
  return true;
end;
$$;

revoke all on function public.avesso_trade_cancel_offer(uuid) from public,anon;
grant execute on function public.avesso_trade_cancel_offer(uuid) to authenticated;

create or replace function public.avesso_trade_reject_offer(p_offer_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_offer public.avesso_trade_offers%rowtype;
  v_row record;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  select * into v_offer from public.avesso_trade_offers where id=p_offer_id for update;
  if not found or v_offer.counterparty_id<>v_user then raise exception 'offer_not_found'; end if;
  if v_offer.status<>'pending' then return false; end if;

  for v_row in select item_id,quantity from public.avesso_trade_escrow where offer_id=p_offer_id for update
  loop
    insert into public.avesso_user_inventory(user_id,item_id,quantity,acquisition_source,metadata)
    values(v_offer.proposer_id,v_row.item_id,v_row.quantity,'trade_rejected',jsonb_build_object('offer_id',p_offer_id))
    on conflict(user_id,item_id) do update set quantity=public.avesso_user_inventory.quantity+excluded.quantity;
  end loop;

  delete from public.avesso_trade_escrow where offer_id=p_offer_id;
  update public.avesso_trade_offers set status='rejected',updated_at=now() where id=p_offer_id;
  return true;
end;
$$;

revoke all on function public.avesso_trade_reject_offer(uuid) from public,anon;
grant execute on function public.avesso_trade_reject_offer(uuid) to authenticated;

create or replace function public.avesso_trade_accept_offer(p_offer_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_offer public.avesso_trade_offers%rowtype;
  v_line record;
  v_owned integer;
begin
  if v_user is null then raise exception 'authentication_required'; end if;
  select * into v_offer from public.avesso_trade_offers where id=p_offer_id for update;
  if not found or v_offer.counterparty_id<>v_user then raise exception 'offer_not_found'; end if;
  if v_offer.status<>'pending' then return false; end if;
  if v_offer.expires_at is not null and v_offer.expires_at<=now() then raise exception 'offer_expired'; end if;

  for v_line in select item_id,quantity from public.avesso_trade_lines where offer_id=p_offer_id and side='request' order by item_id
  loop
    select quantity into v_owned from public.avesso_user_inventory where user_id=v_user and item_id=v_line.item_id for update;
    if coalesce(v_owned,0)<v_line.quantity then raise exception 'counterparty_inventory_changed'; end if;
  end loop;

  for v_line in select item_id,quantity from public.avesso_trade_lines where offer_id=p_offer_id and side='request' order by item_id
  loop
    select quantity into v_owned from public.avesso_user_inventory where user_id=v_user and item_id=v_line.item_id for update;
    if v_owned=v_line.quantity then delete from public.avesso_user_inventory where user_id=v_user and item_id=v_line.item_id;
    else update public.avesso_user_inventory set quantity=quantity-v_line.quantity where user_id=v_user and item_id=v_line.item_id; end if;
    insert into public.avesso_user_inventory(user_id,item_id,quantity,acquisition_source,metadata)
    values(v_offer.proposer_id,v_line.item_id,v_line.quantity,'trade_received',jsonb_build_object('offer_id',p_offer_id,'from_user',v_user))
    on conflict(user_id,item_id) do update set quantity=public.avesso_user_inventory.quantity+excluded.quantity;
  end loop;

  for v_line in select item_id,quantity from public.avesso_trade_escrow where offer_id=p_offer_id for update
  loop
    insert into public.avesso_user_inventory(user_id,item_id,quantity,acquisition_source,metadata)
    values(v_user,v_line.item_id,v_line.quantity,'trade_received',jsonb_build_object('offer_id',p_offer_id,'from_user',v_offer.proposer_id))
    on conflict(user_id,item_id) do update set quantity=public.avesso_user_inventory.quantity+excluded.quantity;
  end loop;

  delete from public.avesso_trade_escrow where offer_id=p_offer_id;
  update public.avesso_trade_offers set status='accepted',accepted_at=now(),updated_at=now() where id=p_offer_id;
  return true;
end;
$$;

revoke all on function public.avesso_trade_accept_offer(uuid) from public,anon;
grant execute on function public.avesso_trade_accept_offer(uuid) to authenticated;
