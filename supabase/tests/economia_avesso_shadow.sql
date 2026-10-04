-- AVESSO // verificações da economia shadow
-- Execute em ambiente de teste/staging. O bloco financeiro usa rollback.

DO $$
DECLARE
  v_mode text;
  v_profiles bigint;
  v_wallets bigint;
  v_posts bigint;
  v_backfill bigint;
  v_mismatches bigint;
  v_duplicates bigint;
BEGIN
  SELECT mode INTO v_mode FROM public.avesso_economy_settings WHERE id='global';
  IF v_mode <> 'shadow' THEN RAISE EXCEPTION 'economia deveria estar em shadow, está %',v_mode; END IF;

  SELECT count(*) INTO v_profiles FROM public.profiles;
  SELECT count(*) INTO v_wallets FROM public.avesso_wallets;
  IF v_profiles <> v_wallets THEN RAISE EXCEPTION 'wallet/profile mismatch: %/%',v_wallets,v_profiles; END IF;

  SELECT count(*) INTO v_posts FROM public.posts;
  SELECT count(*) INTO v_backfill FROM public.avesso_wallet_ledger WHERE rule_key='legacy_post_backfill';
  IF v_posts <> v_backfill THEN RAISE EXCEPTION 'backfill/post mismatch: %/%',v_backfill,v_posts; END IF;

  SELECT count(*) INTO v_mismatches FROM private.avesso_economy_shadow_audit WHERE balance<>ledger_net;
  IF v_mismatches<>0 THEN RAISE EXCEPTION 'wallets divergentes do ledger: %',v_mismatches; END IF;

  SELECT count(*) INTO v_duplicates
  FROM (SELECT idempotency_key FROM public.avesso_wallet_ledger GROUP BY idempotency_key HAVING count(*)>1) d;
  IF v_duplicates<>0 THEN RAISE EXCEPTION 'idempotency duplicada: %',v_duplicates; END IF;

  IF has_table_privilege('authenticated','public.avesso_wallets','INSERT') THEN RAISE EXCEPTION 'authenticated não pode inserir wallet'; END IF;
  IF has_table_privilege('authenticated','public.avesso_wallet_ledger','INSERT') THEN RAISE EXCEPTION 'authenticated não pode inserir ledger'; END IF;
  IF has_table_privilege('authenticated','public.avesso_economy_settings','SELECT') THEN RAISE EXCEPTION 'settings shadow não devem estar expostos'; END IF;
  IF has_table_privilege('authenticated','public.avesso_reward_rules','SELECT') THEN RAISE EXCEPTION 'rules shadow não devem estar expostas'; END IF;
END $$;

BEGIN;
DO $$
DECLARE
  v_user uuid;
  v_before bigint;
  v_after bigint;
  v_first integer;
  v_duplicate integer;
  v_reversal integer;
BEGIN
  SELECT id INTO v_user FROM public.profiles ORDER BY created_at LIMIT 1;
  IF v_user IS NULL THEN RETURN; END IF;

  SELECT balance INTO v_before FROM public.avesso_wallets WHERE user_id=v_user;
  v_first:=private.award_avesso_reward(v_user,'post_created','shadow_test','probe','{}'::jsonb,'test:shadow:idempotency');
  v_duplicate:=private.award_avesso_reward(v_user,'post_created','shadow_test','probe','{}'::jsonb,'test:shadow:idempotency');

  IF v_first<=0 THEN RAISE EXCEPTION 'primeira recompensa não foi creditada'; END IF;
  IF v_duplicate<>0 THEN RAISE EXCEPTION 'idempotência falhou: %',v_duplicate; END IF;

  v_reversal:=private.reverse_avesso_reward(v_user,'test:shadow:idempotency','test');
  IF v_reversal<>v_first THEN RAISE EXCEPTION 'reversão incorreta: %/%',v_reversal,v_first; END IF;

  SELECT balance INTO v_after FROM public.avesso_wallets WHERE user_id=v_user;
  IF v_before<>v_after THEN RAISE EXCEPTION 'saldo não voltou ao original: %/%',v_before,v_after; END IF;
END $$;
ROLLBACK;
