-- AVESSO: privacidade e presença "ouvindo agora".
alter table public.profiles
  add column if not exists listening_visible boolean not null default false,
  add column if not exists now_playing_title text,
  add column if not exists now_playing_artist text,
  add column if not exists now_playing_source text,
  add column if not exists now_playing_url text,
  add column if not exists now_playing_updated_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_now_playing_title_length_check,
  drop constraint if exists profiles_now_playing_artist_length_check,
  drop constraint if exists profiles_now_playing_source_length_check,
  drop constraint if exists profiles_now_playing_url_length_check;

alter table public.profiles
  add constraint profiles_now_playing_title_length_check
    check (now_playing_title is null or char_length(now_playing_title) <= 180),
  add constraint profiles_now_playing_artist_length_check
    check (now_playing_artist is null or char_length(now_playing_artist) <= 180),
  add constraint profiles_now_playing_source_length_check
    check (now_playing_source is null or char_length(now_playing_source) <= 80),
  add constraint profiles_now_playing_url_length_check
    check (now_playing_url is null or char_length(now_playing_url) <= 1000);
