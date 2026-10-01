-- AVESSO: links de YouTube/Spotify e edição de mídia no Meu Canto.

alter table public.posts
  drop constraint if exists posts_media_kind_check;

alter table public.posts
  add constraint posts_media_kind_check
  check (media_kind is null or media_kind in ('audio','video','youtube','spotify'));

alter table public.profile_media
  alter column storage_path drop not null;

alter table public.profile_media
  drop constraint if exists profile_media_media_kind_check;

alter table public.profile_media
  add constraint profile_media_media_kind_check
  check (media_kind in ('audio','video','youtube','spotify'));

drop policy if exists profile_media_update_self on public.profile_media;
create policy profile_media_update_self on public.profile_media
for update to authenticated
using (user_id=(select auth.uid()))
with check (user_id=(select auth.uid()));

grant update on public.profile_media to authenticated;
