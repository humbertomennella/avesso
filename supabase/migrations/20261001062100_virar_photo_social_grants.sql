grant select on public.site_settings to anon, authenticated;
grant select on public.user_moderation to authenticated;
grant select, insert, update, delete on public.photo_comments to authenticated;
