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

do $$
declare
  v_user uuid;
  v_other uuid;
  v_item uuid;
  v_before integer;
  v_after integer;
begin
  select id into v_user from public.profiles order by id limit 1;
  select id into v_other from public.profiles where id <> v_user order by id limit 1;
  select id into v_item from public.avesso_item_catalog where active and not tradable limit 1;

  if v_user is null or v_other is null or v_item is null then
    raise exception 'test_fixture_missing';
  end if;

  perform set_config('request.jwt.claims', jsonb_build_object(
    'sub',v_user::text,'role','authenticated','aud','authenticated'
  )::text, true);

  begin
    perform public.avesso_market_buy('00000000-0000-0000-0000-000000000000');
    raise exception 'market_buy_should_be_blocked_in_shadow';
  exception when others then
    if sqlerrm <> 'economy_not_live' then raise; end if;
  end;

  select count(*) into v_before from public.avesso_trade_offers where proposer_id=v_user;

  begin
    perform public.avesso_trade_create_offer(
      v_other,
      jsonb_build_array(jsonb_build_object('item_id',v_item::text,'quantity',1)),
      jsonb_build_array(jsonb_build_object('item_id',v_item::text,'quantity',1)),
      'test',
      null
    );
    raise exception 'trade_should_reject_non_tradable_item';
  exception when others then
    if sqlerrm <> 'item_not_tradable' then raise; end if;
  end;

  select count(*) into v_after from public.avesso_trade_offers where proposer_id=v_user;
  if v_before <> v_after then
    raise exception 'failed_trade_left_persistent_offer';
  end if;

  begin
    perform public.avesso_market_create_listing(v_item,1,1,null);
    raise exception 'market_should_reject_non_tradable_item';
  exception when others then
    if sqlerrm <> 'item_not_tradable' then raise; end if;
  end;
end
$$;
