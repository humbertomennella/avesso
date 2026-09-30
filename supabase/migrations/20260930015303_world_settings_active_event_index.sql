-- Index auxiliar para a FK de evento ativo.
create index world_settings_active_event_idx
on public.world_settings(active_event_id)
where active_event_id is not null;
