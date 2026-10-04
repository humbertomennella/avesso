create or replace function public.avesso_shadow_economy_summary(p_days integer default 7)
returns table(day date,rule_key text,simulated_entries bigint,simulated_avs bigint,distinct_users bigint)
language plpgsql
security definer
set search_path to ''
as $$
begin
  if not public.is_staff(30) then raise exception 'forbidden' using errcode='42501'; end if;
  p_days:=least(90,greatest(1,coalesce(p_days,7)));
  return query
  select (l.created_at at time zone 'UTC')::date,
         l.rule_key,
         count(*)::bigint,
         coalesce(sum(l.amount),0)::bigint,
         count(distinct l.user_id)::bigint
  from public.avesso_wallet_ledger l
  where l.transaction_type='shadow'
    and l.created_at>=now()-make_interval(days=>p_days)
  group by 1,2
  order by 1 desc,2;
end;
$$;
revoke all on function public.avesso_shadow_economy_summary(integer) from public,anon;
grant execute on function public.avesso_shadow_economy_summary(integer) to authenticated;

create or replace function public.avesso_shadow_economy_users(p_days integer default 7)
returns table(user_id uuid,handle text,simulated_entries bigint,simulated_avs bigint)
language plpgsql
security definer
set search_path to ''
as $$
begin
  if not public.is_staff(30) then raise exception 'forbidden' using errcode='42501'; end if;
  p_days:=least(90,greatest(1,coalesce(p_days,7)));
  return query
  select p.id,p.handle,count(l.id)::bigint,coalesce(sum(l.amount),0)::bigint
  from public.profiles p
  join public.avesso_wallet_ledger l on l.user_id=p.id
  where l.transaction_type='shadow'
    and l.created_at>=now()-make_interval(days=>p_days)
  group by p.id,p.handle
  order by coalesce(sum(l.amount),0) desc;
end;
$$;
revoke all on function public.avesso_shadow_economy_users(integer) from public,anon;
grant execute on function public.avesso_shadow_economy_users(integer) to authenticated;
