-- Faz o feed respeitar as permissões/RLS do usuário que consulta a view.
alter view public.feed_attention set (security_invoker = true);