-- AVESSO // Economia v1.1
-- Corrige a semântica do modo shadow.
-- Em shadow, recompensas são simuladas no ledger como transaction_type='shadow'
-- e NÃO alteram balance/lifetime_earned. O backfill histórico existente permanece earn.

alter table public.avesso_wallet_ledger
  drop constraint if exists avesso_wallet_ledger_transaction_type_check;

alter table public.avesso_wallet_ledger
  add constraint avesso_wallet_ledger_transaction_type_check
  check (
    transaction_type = any(array[
      'earn'::text,
      'spend'::text,
      'transfer_in'::text,
      'transfer_out'::text,
      'reversal'::text,
      'admin_adjustment'::text,
      'shadow'::text
    ])
  );

create or replace function private.award_avesso_reward(
  p_user_id uuid,
  p_rule_key text,
  p_source_type text,
  p_source_id text,
  p_metadata jsonb,
  p_idempotency_key text
)
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_rule public.avesso_reward_rules%rowtype;
  v_mode text;
  v_global_cap integer;
  v_rule_today integer := 0;
  v_global_today integer := 0;
  v_multiplier numeric := 1.00;
  v_award integer := 0;
  v_inserted bigint;
  v_tx_type text;
begin
  if p_user_id is null then return 0; end if;
  if not exists(select 1 from public.profiles p where p.id=p_user_id) then return 0; end if;
  if public.is_user_suspended(p_user_id) then return 0; end if;

  select s.mode,s.global_daily_cap
    into v_mode,v_global_cap
  from public.avesso_economy_settings s
  where s.id='global';

  if coalesce(v_mode,'off')='off' then return 0; end if;
  v_tx_type := case when v_mode='shadow' then 'shadow' else 'earn' end;

  select * into v_rule
  from public.avesso_reward_rules r
  where r.rule_key=p_rule_key and r.enabled;

  if not found or v_rule.base_amount<=0 then return 0; end if;

  insert into public.avesso_wallets(user_id)
  values(p_user_id)
  on conflict(user_id) do nothing;

  perform 1
  from public.avesso_wallets w
  where w.user_id=p_user_id
  for update;

  if exists(
    select 1
    from public.avesso_wallet_ledger l
    where l.idempotency_key=p_idempotency_key
  ) then return 0; end if;

  select coalesce(sum(l.amount),0)::integer
    into v_rule_today
  from public.avesso_wallet_ledger l
  where l.user_id=p_user_id
    and l.rule_key=p_rule_key
    and l.transaction_type=v_tx_type
    and l.created_at>=date_trunc('day',now());

  if v_rule.daily_cap>0 and v_rule_today>=v_rule.daily_cap then return 0; end if;

  if v_rule.counts_toward_daily_cap then
    select coalesce(sum(l.amount),0)::integer
      into v_global_today
    from public.avesso_wallet_ledger l
    join public.avesso_reward_rules r on r.rule_key=l.rule_key
    where l.user_id=p_user_id
      and l.transaction_type=v_tx_type
      and l.created_at>=date_trunc('day',now())
      and r.counts_toward_daily_cap;

    if v_global_cap>0 and v_global_today>=v_global_cap then return 0; end if;
  end if;

  if v_rule.multiplier_eligible then
    v_multiplier:=private.avesso_pulse_multiplier(p_user_id);
  end if;

  v_award:=round(v_rule.base_amount::numeric*v_multiplier)::integer;

  if v_rule.daily_cap>0 then
    v_award:=least(v_award,greatest(0,v_rule.daily_cap-v_rule_today));
  end if;

  if v_rule.counts_toward_daily_cap and v_global_cap>0 then
    v_award:=least(v_award,greatest(0,v_global_cap-v_global_today));
  end if;

  if v_award<=0 then return 0; end if;

  insert into public.avesso_wallet_ledger(
    user_id,transaction_type,rule_key,source_type,source_id,amount,idempotency_key,metadata
  )
  values(
    p_user_id,v_tx_type,p_rule_key,left(p_source_type,80),left(p_source_id,180),
    v_award,left(p_idempotency_key,260),coalesce(p_metadata,'{}'::jsonb)
  )
  on conflict(idempotency_key) do nothing
  returning id into v_inserted;

  if v_inserted is null then return 0; end if;

  if v_tx_type='earn' then
    update public.avesso_wallets
    set balance=balance+v_award,
        lifetime_earned=lifetime_earned+v_award,
        updated_at=now()
    where user_id=p_user_id;
  end if;

  return v_award;
end;
$$;

revoke all on function private.award_avesso_reward(uuid,text,text,text,jsonb,text)
from public, anon, authenticated;
