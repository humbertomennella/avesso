-- AVESSO // verificacoes de Mercado + Trocas
-- Somente leitura e excecoes de validacao.

DO $$
DECLARE
  v_mode text;
  v_rls_missing bigint;
  v_missing_policy bigint;
  v_missing_index bigint;
  v_fn text;
BEGIN
  SELECT mode INTO v_mode
  FROM public.avesso_economy_settings
  WHERE id='global';
  IF v_mode <> 'shadow' THEN
    RAISE EXCEPTION 'economia deveria continuar em shadow, esta %',v_mode;
  END IF;

  SELECT count(*) INTO v_rls_missing
  FROM pg_class c
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public'
    AND c.relname IN ('avesso_market_listings','avesso_market_escrow','avesso_trade_offers','avesso_trade_lines','avesso_trade_escrow')
    AND c.relrowsecurity=false;
  IF v_rls_missing <> 0 THEN
    RAISE EXCEPTION 'tabelas de mercado/troca sem RLS: %',v_rls_missing;
  END IF;

  IF has_table_privilege('anon','public.avesso_market_listings','SELECT') THEN
    RAISE EXCEPTION 'anon nao deve ler o mercado';
  END IF;
  IF has_table_privilege('authenticated','public.avesso_market_listings','INSERT') THEN
    RAISE EXCEPTION 'cliente nao pode inserir listing diretamente';
  END IF;
  IF has_table_privilege('authenticated','public.avesso_market_escrow','SELECT') THEN
    RAISE EXCEPTION 'cliente nao deve ler escrow do mercado';
  END IF;
  IF has_table_privilege('authenticated','public.avesso_trade_escrow','SELECT') THEN
    RAISE EXCEPTION 'cliente nao deve ler escrow de troca';
  END IF;

  SELECT count(*) INTO v_missing_policy
  FROM (values
    ('avesso_market_escrow','avesso_market_escrow_client_deny'),
    ('avesso_trade_escrow','avesso_trade_escrow_client_deny')
  ) as expected(tablename,policyname)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname='public'
      AND p.tablename=expected.tablename
      AND p.policyname=expected.policyname
  );
  IF v_missing_policy <> 0 THEN
    RAISE EXCEPTION 'policies explicitas de escrow ausentes: %',v_missing_policy;
  END IF;

  SELECT count(*) INTO v_missing_index
  FROM (values
    ('avesso_market_listings_item_idx'),
    ('avesso_market_listings_buyer_idx'),
    ('avesso_market_escrow_item_idx'),
    ('avesso_trade_lines_item_idx'),
    ('avesso_trade_escrow_item_idx')
  ) as expected(indexname)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_indexes i
    WHERE i.schemaname='public' AND i.indexname=expected.indexname
  );
  IF v_missing_index <> 0 THEN
    RAISE EXCEPTION 'indices de mercado/troca ausentes: %',v_missing_index;
  END IF;

  IF has_function_privilege('anon','public.avesso_market_buy(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'anon nao pode executar compra';
  END IF;
  IF NOT has_function_privilege('authenticated','public.avesso_market_buy(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'authenticated precisa executar RPC de compra';
  END IF;
  IF has_function_privilege('anon','public.avesso_trade_accept_offer(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'anon nao pode aceitar troca';
  END IF;

  SELECT pg_get_functiondef('public.avesso_market_buy(uuid)'::regprocedure) INTO v_fn;
  IF position('economy_not_live' in v_fn)=0
     OR position('avesso_economy_settings' in v_fn)=0
     OR position('live' in v_fn)=0 THEN
    RAISE EXCEPTION 'compra nao esta protegida pelo modo live';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid='public.avesso_market_listings'::regclass
      AND conname='avesso_market_price_ledger_range'
  ) THEN
    RAISE EXCEPTION 'limite de preco compativel com ledger ausente';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.avesso_item_catalog
    WHERE item_type='badge' AND (tradable=true OR soulbound=false)
  ) THEN
    RAISE EXCEPTION 'badge soulbound apareceu como negociavel';
  END IF;
END $$;
