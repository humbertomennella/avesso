-- AVESSO Economia v1.1 // Etapa B: telemetria shadow real

create or replace function private.record_avesso_activity_heartbeat(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_settings public.avesso_economy_settings%rowtype;
  v_session public.avesso_activity_sessions%rowtype;
  v_delta integer:=0;
  v_target_blocks integer:=0;
  v_reward integer:=0;
  v_day text;
begin
  if p_user_id is null or public.is_user_suspended(p_user_id) then return 0; end if;
  select * into v_settings from public.avesso_economy_settings where id='global';
  if not found or v_settings.mode='off' then return 0; end if;

  select * into v_session
  from public.avesso_activity_sessions s
  where s.user_id=p_user_id and s.ended_at is null
  for update;

  if found and (
    v_session.last_heartbeat_at<now()-interval '5 minutes'
    or (v_session.started_at at time zone 'UTC')::date<>(now() at time zone 'UTC')::date
  ) then
    update public.avesso_activity_sessions set ended_at=now(),updated_at=now() where id=v_session.id;
    v_session.id:=null;
  end if;

  if v_session.id is null then
    insert into public.avesso_activity_sessions(user_id,started_at,last_active_at,last_heartbeat_at)
    values(p_user_id,now(),now(),now())
    returning * into v_session;
    return 0;
  end if;

  v_delta:=least(60,greatest(0,extract(epoch from (now()-v_session.last_heartbeat_at))::integer));
  if v_delta<20 then return 0; end if;

  update public.avesso_activity_sessions
  set last_active_at=now(),last_heartbeat_at=now(),qualified_seconds=qualified_seconds+v_delta,updated_at=now()
  where id=v_session.id
  returning * into v_session;

  v_target_blocks:=floor(v_session.qualified_seconds::numeric/v_settings.presence_block_seconds)::integer;
  if v_target_blocks>v_session.rewarded_blocks then
    v_day:=to_char(now() at time zone 'UTC','YYYY-MM-DD');
    v_reward:=private.award_avesso_reward(
      p_user_id,'presence_block','activity_session',v_session.id::text,
      jsonb_build_object('block',v_session.rewarded_blocks+1),
      'presence_block:'||p_user_id::text||':'||v_day||':'||(v_session.rewarded_blocks+1)::text
    );
    if v_reward>0 then
      update public.avesso_activity_sessions
      set rewarded_blocks=rewarded_blocks+1,updated_at=now()
      where id=v_session.id;
    end if;
  end if;
  return v_reward;
end;
$$;
revoke all on function private.record_avesso_activity_heartbeat(uuid) from public,anon,authenticated;

create or replace function public.avesso_economy_heartbeat()
returns integer
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_user uuid := (select auth.uid());
begin
  if v_user is null then raise exception 'unauthenticated' using errcode='42501'; end if;
  return private.record_avesso_activity_heartbeat(v_user);
end;
$$;
revoke all on function public.avesso_economy_heartbeat() from public,anon;
grant execute on function public.avesso_economy_heartbeat() to authenticated;

create or replace function private.trg_avesso_plaza_shadow_session()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_own_count integer:=0;
  v_first timestamptz;
  v_other_exists boolean:=false;
  v_bucket text;
begin
  if new.user_id is null or new.character_id is not null or new.message_kind<>'chat' then return new; end if;

  select count(*)::integer,min(pm.created_at)
    into v_own_count,v_first
  from public.plaza_messages pm
  where pm.user_id=new.user_id
    and pm.character_id is null
    and pm.message_kind='chat'
    and pm.created_at between new.created_at-interval '30 minutes' and new.created_at;

  if v_own_count<3 or v_first>new.created_at-interval '15 minutes' then return new; end if;

  select exists(
    select 1 from public.plaza_messages pm
    where pm.user_id is not null
      and pm.user_id<>new.user_id
      and pm.character_id is null
      and pm.message_kind='chat'
      and pm.created_at between v_first and new.created_at
  ) into v_other_exists;
  if not v_other_exists then return new; end if;

  v_bucket:=to_char(new.created_at at time zone 'UTC','YYYY-MM-DD')||':'||floor(extract(epoch from new.created_at)/1800)::bigint::text;
  perform private.award_avesso_reward(
    new.user_id,'plaza_session','plaza_session',new.id::text,
    jsonb_build_object('messages',v_own_count,'window_start',v_first),
    'plaza_session:'||new.user_id::text||':'||v_bucket
  );
  return new;
end;
$$;
revoke all on function private.trg_avesso_plaza_shadow_session() from public,anon,authenticated;
drop trigger if exists avesso_plaza_shadow_session on public.plaza_messages;
create trigger avesso_plaza_shadow_session
after insert on public.plaza_messages
for each row execute function private.trg_avesso_plaza_shadow_session();

create or replace function private.trg_avesso_direct_shadow_conversation()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
declare
  v_forward integer:=0;
  v_reverse integer:=0;
  v_friend boolean:=false;
  v_pair text;
  v_day text;
  v_a uuid;
  v_b uuid;
begin
  if new.sender_id is null or new.recipient_id is null or new.deleted_at is not null then return new; end if;
  if new.message_kind='deleted' then return new; end if;

  select exists(
    select 1 from public.friendships f
    where f.status='accepted' and (
      (f.requester_id=new.sender_id and f.addressee_id=new.recipient_id)
      or (f.requester_id=new.recipient_id and f.addressee_id=new.sender_id)
    )
  ) into v_friend;
  if not v_friend then return new; end if;

  select count(*)::integer into v_forward
  from public.direct_messages d
  where d.sender_id=new.sender_id and d.recipient_id=new.recipient_id
    and d.deleted_at is null and d.message_kind<>'deleted'
    and d.created_at between new.created_at-interval '30 minutes' and new.created_at;

  select count(*)::integer into v_reverse
  from public.direct_messages d
  where d.sender_id=new.recipient_id and d.recipient_id=new.sender_id
    and d.deleted_at is null and d.message_kind<>'deleted'
    and d.created_at between new.created_at-interval '30 minutes' and new.created_at;

  if v_forward<2 or v_reverse<2 then return new; end if;

  if new.sender_id::text<new.recipient_id::text then
    v_a:=new.sender_id;v_b:=new.recipient_id;
  else
    v_a:=new.recipient_id;v_b:=new.sender_id;
  end if;
  v_pair:=v_a::text||':'||v_b::text;
  v_day:=to_char(new.created_at at time zone 'UTC','YYYY-MM-DD');

  perform private.award_avesso_reward(
    new.sender_id,'direct_conversation','direct_pair',v_pair,
    jsonb_build_object('peer_id',new.recipient_id,'window_minutes',30),
    'direct_conversation:'||new.sender_id::text||':'||v_pair||':'||v_day
  );
  perform private.award_avesso_reward(
    new.recipient_id,'direct_conversation','direct_pair',v_pair,
    jsonb_build_object('peer_id',new.sender_id,'window_minutes',30),
    'direct_conversation:'||new.recipient_id::text||':'||v_pair||':'||v_day
  );
  return new;
end;
$$;
revoke all on function private.trg_avesso_direct_shadow_conversation() from public,anon,authenticated;
drop trigger if exists avesso_direct_shadow_conversation on public.direct_messages;
create trigger avesso_direct_shadow_conversation
after insert on public.direct_messages
for each row execute function private.trg_avesso_direct_shadow_conversation();

create index if not exists plaza_messages_user_created_shadow_idx
on public.plaza_messages(user_id,created_at desc) where user_id is not null;

create index if not exists direct_messages_pair_created_shadow_idx
on public.direct_messages(sender_id,recipient_id,created_at desc) where deleted_at is null;
