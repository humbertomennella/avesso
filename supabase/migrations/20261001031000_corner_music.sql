-- AVESSO: trilha invisível configurável para o Meu Canto.
alter table public.profiles
  add column if not exists corner_music_url text,
  add column if not exists corner_music_enabled boolean not null default false;

alter table public.profiles
  drop constraint if exists profiles_corner_music_url_length_check;

alter table public.profiles
  add constraint profiles_corner_music_url_length_check
  check (corner_music_url is null or char_length(corner_music_url) <= 1000);
