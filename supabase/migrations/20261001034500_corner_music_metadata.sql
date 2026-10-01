-- AVESSO: metadados da trilha automática do Canto.
alter table public.profiles
  add column if not exists corner_music_title text,
  add column if not exists corner_music_provider text;

alter table public.profiles
  drop constraint if exists profiles_corner_music_title_length_check,
  drop constraint if exists profiles_corner_music_provider_length_check;

alter table public.profiles
  add constraint profiles_corner_music_title_length_check
    check (corner_music_title is null or char_length(corner_music_title) <= 220),
  add constraint profiles_corner_music_provider_length_check
    check (corner_music_provider is null or char_length(corner_music_provider) <= 40);
