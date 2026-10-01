alter table public.profiles
  add column if not exists now_playing_manual boolean not null default false;