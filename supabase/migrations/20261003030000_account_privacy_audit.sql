create table if not exists public.account_privacy_events (
  id bigint generated always as identity primary key,
  subject_hash text not null,
  action text not null check (action in ('export','delete')),
  outcome text not null check (outcome in ('started','success','failure','blocked')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists account_privacy_events_created_at_idx on public.account_privacy_events (created_at desc);
create index if not exists account_privacy_events_subject_hash_idx on public.account_privacy_events (subject_hash, created_at desc);

alter table public.account_privacy_events enable row level security;
revoke all on table public.account_privacy_events from anon, authenticated;
grant select, insert, update on table public.account_privacy_events to service_role;
grant usage, select on sequence public.account_privacy_events_id_seq to service_role;

comment on table public.account_privacy_events is 'Registro minimizado de exportações e exclusões de conta. Guarda apenas hash do sujeito, resultado e metadados operacionais; acesso exclusivo ao service_role.';
