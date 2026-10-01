-- Índices auxiliares para as FKs introduzidas pelos Stories.
create index if not exists story_reactions_user_idx on public.story_reactions(user_id);
create index if not exists story_comments_user_idx on public.story_comments(user_id);
create index if not exists story_notifications_actor_idx on public.story_notifications(actor_id);
create index if not exists story_notifications_story_idx on public.story_notifications(story_id);