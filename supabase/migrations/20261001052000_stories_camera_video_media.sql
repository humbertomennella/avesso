-- Stories agora aceitam foto, vídeo e captura direta da câmera.
alter table public.stories
  add column if not exists media_type text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'stories_media_type_check'
      and conrelid = 'public.stories'::regclass
  ) then
    alter table public.stories
      add constraint stories_media_type_check
      check (media_type is null or media_type in ('image','video'));
  end if;
end $$;

update public.stories
set media_type = 'image'
where image_path is not null
  and media_type is null;

update storage.buckets
set file_size_limit = 31457280,
    allowed_mime_types = array[
      'image/jpeg','image/png','image/webp','image/gif',
      'video/webm','video/mp4','video/quicktime'
    ]::text[]
where id = 'avesso-stories';
