-- AVESSO // Economia shadow v1 — hardening pós-advisors
-- Mantém settings e regras inacessíveis ao cliente durante o modo sombra.

create index if not exists avesso_wallet_ledger_rule_idx
on public.avesso_wallet_ledger(rule_key);

drop policy if exists avesso_economy_settings_client_deny on public.avesso_economy_settings;
create policy avesso_economy_settings_client_deny
on public.avesso_economy_settings for select to authenticated
using (false);

drop policy if exists avesso_reward_rules_client_deny on public.avesso_reward_rules;
create policy avesso_reward_rules_client_deny
on public.avesso_reward_rules for select to authenticated
using (false);
