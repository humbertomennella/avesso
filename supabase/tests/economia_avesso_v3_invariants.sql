-- AVESSO Economia v3: invariants for market/trade hardening.
do $$
declare
  v_count integer;
  v_mode text;
  v_def text;
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema='private' and table_name='avesso_economy_item_events'
  ) then
    raise exception 'audit_table_missing';
  end if;

  if has_table_privilege('authenticated','private.avesso_economy_item_events','SELECT') then
    raise exception 'audit_table_exposed_to_authenticated';
  end if;

  select mode into v_mode from public.avesso_economy_settings where id='global';
  if coalesce(v_mode,'') <> 'shadow' then
    raise exception 'economy_mode_changed:%',v_mode;
  end if;

  select count(*) into v_count
  from public.avesso_item_catalog
  where active and tradable and soulbound;
  if v_count <> 0 then
    raise exception 'catalog_contains_tradable_soulbound_items:%',v_count;
  end if;

  select count(*) into v_count
  from pg_proc p
  join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and p.proname in (
      'avesso_market_create_listing','avesso_market_cancel_listing','avesso_market_expire_listing','avesso_market_buy',
      'avesso_trade_create_offer','avesso_trade_accept_offer','avesso_trade_cancel_offer','avesso_trade_expire_offer','avesso_trade_reject_offer'
    )
    and p.prosecdef
    and pg_get_functiondef(p.oid) not like '%SET search_path TO ''''%';
  if v_count <> 0 then
    raise exception 'economy_security_definer_without_empty_search_path:%',v_count;
  end if;

  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public' and p.proname='avesso_market_buy'
  limit 1;
  if position('lifetime_earned=lifetime_earned+v_listing.price_saldo' in coalesce(v_def,'')) = 0 then
    raise exception 'market_buy_missing_seller_lifetime_earned_update';
  end if;

  if not has_function_privilege('authenticated','public.avesso_market_expire_listing(uuid)','EXECUTE') then
    raise exception 'market_expire_not_executable_by_authenticated';
  end if;

  if not has_function_privilege('authenticated','public.avesso_trade_expire_offer(uuid)','EXECUTE') then
    raise exception 'trade_expire_not_executable_by_authenticated';
  end if;
end
$$;