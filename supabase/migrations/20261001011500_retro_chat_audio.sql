
-- AVESSO Messenger: temas retrô, wallpaper de conversa e mensagens de voz.

alter table public.profiles
  add column if not exists chat_wallpaper text not null default 'none';

alter table public.profiles
  drop constraint if exists profiles_chat_theme_check;

alter table public.profiles
  alter column chat_theme set default 'bbs_cyan';

update public.profiles
set chat_theme = case chat_theme
  when 'aqua' then 'bbs_cyan'
  when 'acid' then 'acid_terminal'
  when 'violet' then 'arcade_violet'
  when 'coral' then 'error_coral'
  when 'midnight' then 'midnight_modem'
  when 'graphite' then 'graphite_dos'
  else chat_theme
end
where chat_theme in ('aqua','acid','violet','coral','midnight','graphite');

alter table public.profiles
  add constraint profiles_chat_theme_check
  check (chat_theme in (
    'bbs_cyan',
    'acid_terminal',
    'arcade_violet',
    'error_coral',
    'midnight_modem',
    'graphite_dos',
    'phosphor_green',
    'dos_amber',
    'janela_95',
    'magenta_crt'
  ));

alter table public.profiles
  drop constraint if exists profiles_chat_wallpaper_check;

alter table public.profiles
  add constraint profiles_chat_wallpaper_check
  check (chat_wallpaper in (
    'none',
    'cidade-56k',
    'praça-3am',
    'torre-kpi',
    'arquivo-morto',
    'jardim-glitch',
    'servidor-submerso',
    'terapia-do-algoritmo',
    'erro-bonito',
    'lua-de-cache',
    'humano-nao-encontrado'
  ));

alter table public.direct_messages
  drop constraint if exists direct_messages_message_kind_check;

alter table public.direct_messages
  add constraint direct_messages_message_kind_check
  check (message_kind in ('text','image','file','audio','attention'));

update storage.buckets
set allowed_mime_types = array[
  'image/jpeg','image/png','image/webp','image/gif',
  'application/pdf','text/plain',
  'application/zip','application/x-zip-compressed',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'audio/webm','audio/ogg','audio/mp4','audio/mpeg',
  'audio/wav','audio/x-wav','audio/aac','audio/x-m4a'
]
where id='avesso-chat';
