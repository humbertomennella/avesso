-- AVESSO // Economia v1 — heartbeat shadow seguro
-- O cliente nunca envia user_id, segundos ou valor de recompensa.

-- Substitui a versão preparatória com parâmetro explícito por uma função
-- que resolve o usuário exclusivamente via auth.uid().
drop function if exists private.record_avesso_activity_heartbeat(uuid);

create or replace function private.record_avesso_activity_heartbeat()
returns integer
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_settings public.avesso_economy_settings%rowtype;
  v_session public.avesso_activity_sessions%rowtype;
  v_delta integer:=0;
  v_target_blocks integer:=0;
  v_reward integer:=0;
  v_day text;
  v_day_blocks integer:=0;
  v_next_block integer:=0;
begin
  if v_user_id is null or public.is_user_suspended(v_user_id) then return 0; end if;

  select * into v_settings
  from public.avesso_economy_settings
  where id='global';
  if not found or v_settings.mode='off' then return 0; end if;

  select * into v_session
  from public.avesso_activity_sessions s
  where s.user_id=v_user_id and s.ended_at is null
  for update;

  if found and (
    v_session.last_heartbeat_at<now()-interval '5 minutes'
    or (v_session.started_at at time zone 'UTC')::date<>(now() at time zone 'UTC')::date
  ) then
    update public.avesso_activity_sessions
    set ended_at=now(),updated_at=now()
    where id=v_session.id;
    v_session.id:=null;
  end if;

  if v_session.id is null then
    insert into public.avesso_activity_sessions(user_id,started_at,last_active_at,last_heartbeat_at)
    values(v_user_id,now(),now(),now())
    returning * into v_session;
    return 0;
  end if;

  -- O relógio do banco é a autoridade. Chamadas rápidas/duplicadas de outras abas
  -- não conseguem inventar minutos: no máximo 60 s são qualificados por heartbeat.
  v_delta:=least(60,greatest(0,extract(epoch from (now()-v_session.last_heartbeat_at))::integer));

  update public.avesso_activity_sessions
  set last_active_at=now(),
      last_heartbeat_at=now(),
      qualified_seconds=qualified_seconds+v_delta,
      updated_at=now()
  where id=v_session.id
  returning * into v_session;

  v_target_blocks:=floor(v_session.qualified_seconds::numeric/v_settings.presence_block_seconds)::integer;

  if v_target_blocks>v_session.rewarded_blocks then
    v_day:=to_char(now() at time zone 'UTC','YYYY-MM-DD');

    -- O número do bloco é diário e vem do ledger. Assim, reabrir uma sessão
    -- no mesmo dia não reutiliza "bloco 1" e não trava a progressão.
    select count(*)::integer into v_day_blocks
    from public.avesso_wallet_ledger l
    where l.user_id=v_user_id
      and l.rule_key='presence_block'
      and l.transaction_type='earn'
      and l.created_at>=date_trunc('day',now());

    v_next_block:=v_day_blocks+1;

    v_reward:=private.award_avesso_reward(
      v_user_id,
      'presence_block',
      'activity_session',
      v_session.id::text,
      jsonb_build_object(
        'session_block',v_session.rewarded_blocks+1,
        'daily_block',v_next_block
      ),
      'presence_block:'||v_user_id::text||':'||v_day||':'||v_next_block::text
    );

    -- Mesmo se o teto diário já tiver sido atingido, não fica tentando o mesmo
    -- bloco indefinidamente a cada minuto.
    update public.avesso_activity_sessions
    set rewarded_blocks=greatest(rewarded_blocks,v_target_blocks),updated_at=now()
    where id=v_session.id;
  end if;

  return v_reward;
end;
$$;

revoke all on function private.record_avesso_activity_heartbeat() from public,anon,authenticated;

-- A API só recebe acesso a esta função privada específica. Nenhuma tabela do
-- schema private é exposta e não existe parâmetro de user_id para falsificar.
grant usage on schema private to authenticated;
grant execute on function private.record_avesso_activity_heartbeat() to authenticated;

-- Wrapper RPC exposto via public, mas SECURITY INVOKER. A parte privilegiada
-- permanece no schema private e resolve auth.uid() por conta própria.
create or replace function public.avesso_economy_heartbeat()
returns integer
language sql
security invoker
set search_path=''
as $$
  select private.record_avesso_activity_heartbeat();
$$;

revoke all on function public.avesso_economy_heartbeat() from public,anon;
grant execute on function public.avesso_economy_heartbeat() to authenticated;
