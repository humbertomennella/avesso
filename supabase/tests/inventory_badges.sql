-- AVESSO // verificações de Inventário + Badges
-- Seguro para execução em staging/produção: somente leitura e exceções de validação.

DO $$
DECLARE
  v_mode text;
  v_seeded bigint;
  v_missing_inventory bigint;
  v_invalid_equipment bigint;
  v_rls_missing bigint;
  v_trigger_count bigint;
BEGIN
  SELECT mode INTO v_mode
  FROM public.avesso_economy_settings
  WHERE id='global';
  IF v_mode <> 'shadow' THEN
    RAISE EXCEPTION 'economia deveria continuar em shadow, está %',v_mode;
  END IF;

  SELECT count(*) INTO v_seeded
  FROM public.badges
  WHERE slug IN ('primeira_dobra','presenca_real','voz_da_praca','cumplice_de_verdade')
    AND active=true;
  IF v_seeded <> 4 THEN
    RAISE EXCEPTION 'catálogo inicial de badges incompleto: %/4',v_seeded;
  END IF;

  SELECT count(*) INTO v_missing_inventory
  FROM public.user_badges ub
  JOIN public.avesso_item_catalog c ON c.badge_id=ub.badge_id
  LEFT JOIN public.avesso_user_inventory i
    ON i.user_id=ub.user_id AND i.item_id=c.id
  WHERE i.user_id IS NULL;
  IF v_missing_inventory <> 0 THEN
    RAISE EXCEPTION 'badges sem item sincronizado no inventário: %',v_missing_inventory;
  END IF;

  SELECT count(*) INTO v_invalid_equipment
  FROM public.avesso_user_equipment e
  LEFT JOIN public.user_badges ub
    ON ub.user_id=e.user_id AND ub.badge_id=e.primary_badge_id
  WHERE e.primary_badge_id IS NOT NULL AND ub.user_id IS NULL;
  IF v_invalid_equipment <> 0 THEN
    RAISE EXCEPTION 'equipamentos apontando para badge não possuído: %',v_invalid_equipment;
  END IF;

  SELECT count(*) INTO v_rls_missing
  FROM pg_class c
  JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public'
    AND c.relname IN ('avesso_item_catalog','avesso_user_inventory','avesso_user_equipment')
    AND c.relrowsecurity=false;
  IF v_rls_missing <> 0 THEN
    RAISE EXCEPTION 'tabelas do inventário sem RLS: %',v_rls_missing;
  END IF;

  IF has_table_privilege('anon','public.avesso_item_catalog','SELECT') THEN
    RAISE EXCEPTION 'anon não deve ler catálogo econômico';
  END IF;
  IF has_table_privilege('anon','public.avesso_user_inventory','SELECT') THEN
    RAISE EXCEPTION 'anon não deve ler inventário';
  END IF;
  IF has_table_privilege('authenticated','public.avesso_user_inventory','INSERT') THEN
    RAISE EXCEPTION 'cliente autenticado não pode inserir inventário';
  END IF;
  IF has_table_privilege('authenticated','public.avesso_item_catalog','INSERT') THEN
    RAISE EXCEPTION 'cliente autenticado não pode inserir catálogo';
  END IF;
  IF NOT has_table_privilege('authenticated','public.avesso_user_equipment','UPDATE') THEN
    RAISE EXCEPTION 'usuário autenticado precisa poder atualizar o próprio equipamento via RLS';
  END IF;

  SELECT count(*) INTO v_trigger_count
  FROM pg_trigger
  WHERE tgrelid='public.user_badges'::regclass
    AND tgname='avesso_user_badges_inventory_sync'
    AND NOT tgisinternal;
  IF v_trigger_count <> 1 THEN
    RAISE EXCEPTION 'trigger de sincronização de badge ausente ou duplicado: %',v_trigger_count;
  END IF;
END $$;
