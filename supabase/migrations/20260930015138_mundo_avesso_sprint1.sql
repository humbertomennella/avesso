-- Mundo do AVESSO — Sprint 1
-- Fundação de personagens, preferências e eventos.
-- Mudanças aditivas: não altera conteúdo existente.

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9_]{2,40}$'),
  name text not null check (char_length(name) between 2 and 60),
  role text not null,
  bio text not null default '',
  accent_color text not null default '#d8ff3e' check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  avatar_key text,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.character_dialogues (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references public.characters(id) on delete cascade,
  context text not null check (context ~ '^[a-z0-9_]{2,50}$'),
  body text not null check (char_length(body) between 2 and 420),
  weight integer not null default 1 check (weight between 1 and 100),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.user_world_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  participation_mode text not null default 'world' check (participation_mode in ('observer','world','chaos')),
  allow_post_interference boolean not null default false,
  allow_profile_interference boolean not null default false,
  allow_character_visits boolean not null default true,
  reduce_motion boolean not null default false,
  updated_at timestamptz not null default now()
);

create table public.world_events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9_]{2,60}$'),
  title text not null check (char_length(title) between 2 and 120),
  description text not null default '',
  event_type text not null default 'global' check (event_type in ('micro','local','global','season')),
  status text not null default 'draft' check (status in ('draft','scheduled','active','paused','completed','cancelled')),
  starts_at timestamptz,
  ends_at timestamptz,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table public.world_settings (
  id text primary key default 'global' check (id = 'global'),
  world_events_enabled boolean not null default true,
  world_interventions_enabled boolean not null default false,
  active_event_id uuid references public.world_events(id) on delete set null,
  message text not null default 'AVESSO.SYS // mundo online',
  updated_at timestamptz not null default now()
);

create index character_dialogues_lookup_idx on public.character_dialogues(character_id,context) where enabled;
create index world_events_status_time_idx on public.world_events(status,starts_at,ends_at);

create trigger user_world_preferences_set_updated_at
before update on public.user_world_preferences
for each row execute function public.set_updated_at();

create trigger world_settings_set_updated_at
before update on public.world_settings
for each row execute function public.set_updated_at();

create or replace function public.handle_new_world_preferences()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_world_preferences(user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_world_preferences() from public,anon,authenticated;

create trigger on_profile_world_preferences_created
after insert on public.profiles
for each row execute function public.handle_new_world_preferences();

insert into public.user_world_preferences(user_id)
select id from public.profiles
on conflict (user_id) do nothing;

insert into public.world_settings(id,world_events_enabled,world_interventions_enabled,message)
values ('global',true,false,'AVESSO.SYS // mundo online. 404 ainda não recebeu a chave.')
on conflict (id) do nothing;

insert into public.characters(slug,name,role,bio,accent_color,avatar_key,is_active) values
('algo','ALGO','algoritmo em recuperação','Passou anos otimizando cliques. Agora tenta descobrir como priorizar gente sem transformar ninguém em KPI.','#22d9ee','algo',true),
('npc','NPC','figurante em promoção','Passou tempo demais esperando alguém apertar E para conversar.','#d8ff3e','npc',false),
('404','404','sabotador do sistema','O problema não foi encontrado. Ele encontrou você.','#ff5c4d','404',false),
('rei_engajamento','Rei do Engajamento','antagonista corporativo','Transformou amizade em funil e depois estranhou o churn.','#9b7cff','rei_engajamento',false),
('pessoa_le_tudo','Pessoa que Lê Tudo','quebra da quarta parede','Sabe que existe uma interface, um designer e alguém olhando para a tela.','#f5f3e8','pessoa_le_tudo',false);

insert into public.character_dialogues(character_id,context,body,weight)
select id,'feed_default','O feed está funcional. Isso me deixa desconfortável.',3 from public.characters where slug='algo'
union all
select id,'feed_default','Estou tentando organizar pessoas sem transformá-las em gráfico. Ambiente de trabalho hostil.',2 from public.characters where slug='algo'
union all
select id,'feed_loading','Ordenando por necessidade de atenção. Meu emprego anterior chamaria isso de bug.',3 from public.characters where slug='algo'
union all
select id,'feed_loading','Consultando o feed. Nenhuma dancinha foi usada como critério.',2 from public.characters where slug='algo'
union all
select id,'feed_attention','Encontrei alguém falando sozinho. Pela primeira vez o algoritmo vai interromper a pessoa certa.',3 from public.characters where slug='algo'
union all
select id,'feed_attention','Esta publicação recebeu pouca atenção. Finalmente um número que serve para alguma coisa.',3 from public.characters where slug='algo'
union all
select id,'feed_empty','Nada urgente aqui. Aproveite antes que inventem um KPI para isso.',3 from public.characters where slug='algo'
union all
select id,'feed_empty','O feed acabou. Sim, ele acaba. Respire, a economia continua funcionando.',2 from public.characters where slug='algo'
union all
select id,'feed_error','Eu tropecei no banco. Não espalhe. Algoritmos também têm reputação.',3 from public.characters where slug='algo'
union all
select id,'profile','Chamaram isso de perfil. Prefiro Canto. Perfil parece currículo com autoestima.',3 from public.characters where slug='algo'
union all
select id,'profile','Seu Canto está sob sua responsabilidade. 404 ainda não recebeu autorização de reforma.',2 from public.characters where slug='algo';

alter table public.characters enable row level security;
alter table public.character_dialogues enable row level security;
alter table public.user_world_preferences enable row level security;
alter table public.world_events enable row level security;
alter table public.world_settings enable row level security;

create policy characters_active_read
on public.characters for select
to anon,authenticated
using (is_active);

create policy character_dialogues_active_read
on public.character_dialogues for select
to anon,authenticated
using (
  enabled
  and exists (
    select 1 from public.characters c
    where c.id = character_id and c.is_active
  )
);

create policy world_preferences_owner_read
on public.user_world_preferences for select
to authenticated
using ((select auth.uid()) = user_id);

create policy world_preferences_owner_insert
on public.user_world_preferences for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy world_preferences_owner_update
on public.user_world_preferences for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy world_events_active_read
on public.world_events for select
to anon,authenticated
using (
  status = 'active'
  and (starts_at is null or starts_at <= now())
  and (ends_at is null or ends_at > now())
);

create policy world_settings_read
on public.world_settings for select
to anon,authenticated
using (true);

grant select on public.characters,public.character_dialogues,public.world_events,public.world_settings to anon,authenticated;
grant select,insert,update on public.user_world_preferences to authenticated;

alter publication supabase_realtime add table public.world_events,public.world_settings;
