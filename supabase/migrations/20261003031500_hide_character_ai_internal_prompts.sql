drop policy if exists character_ai_profiles_public_read on public.character_ai_profiles;
revoke select on table public.character_ai_profiles from anon, authenticated;

comment on table public.character_ai_profiles is 'Configuração interna dos personagens de IA. Prompts e regras não são expostos ao cliente; acesso operacional via service_role e rotinas administrativas autorizadas.';
