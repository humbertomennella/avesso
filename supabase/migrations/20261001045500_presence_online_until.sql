-- AVESSO: presença online com expiração curta.
alter table public.profiles
  add column if not exists online_until timestamptz;

-- Sessões antigas não ficam eternamente online após esta migração.
update public.profiles
set online_until = null
where online_until is null;
