
-- AVESSO: preferências de chat, mudo e bloqueio com efeito real no social.

alter table public.profiles
  add column if not exists chat_theme text not null default 'aqua';

alter table public.profiles
  drop constraint if exists profiles_chat_theme_check;

alter table public.profiles
  add constraint profiles_chat_theme_check
  check (chat_theme in ('aqua','acid','violet','coral','midnight','graphite'));

create table if not exists public.mutes (
  muter_id uuid not null references public.profiles(id) on delete cascade,
  muted_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id),
  check (muter_id <> muted_id)
);

alter table public.mutes enable row level security;

drop policy if exists mutes_owner_all on public.mutes;
create policy mutes_owner_all
on public.mutes
for all
to authenticated
using (muter_id = (select auth.uid()))
with check (muter_id = (select auth.uid()));

grant select, insert, delete on public.mutes to authenticated;

-- Uma política única para pedidos de amizade. Bloqueio agora significa bloqueio,
-- não "talvez ainda consiga mandar solicitação se insistir no botão".
drop policy if exists friendships_insert_self on public.friendships;
drop policy if exists friendships_requester_insert on public.friendships;

create policy friendships_requester_insert
on public.friendships
for insert
to authenticated
with check (
  requester_id = (select auth.uid())
  and requester_id <> addressee_id
  and status = 'pending'
  and not exists (
    select 1 from public.blocks b
    where (b.blocker_id = requester_id and b.blocked_id = addressee_id)
       or (b.blocker_id = addressee_id and b.blocked_id = requester_id)
  )
);

-- Mensagens diretas também respeitam bloqueio em qualquer direção.
drop policy if exists direct_messages_read_friends on public.direct_messages;
drop policy if exists direct_messages_send_friends on public.direct_messages;

create policy direct_messages_read_friends
on public.direct_messages
for select
to authenticated
using (
  ((select auth.uid()) = sender_id or (select auth.uid()) = recipient_id)
  and exists (
    select 1 from public.friendships f
    where f.status='accepted'
      and (
        (f.requester_id=direct_messages.sender_id and f.addressee_id=direct_messages.recipient_id)
        or
        (f.requester_id=direct_messages.recipient_id and f.addressee_id=direct_messages.sender_id)
      )
  )
  and not exists (
    select 1 from public.blocks b
    where (b.blocker_id=direct_messages.sender_id and b.blocked_id=direct_messages.recipient_id)
       or (b.blocker_id=direct_messages.recipient_id and b.blocked_id=direct_messages.sender_id)
  )
);

create policy direct_messages_send_friends
on public.direct_messages
for insert
to authenticated
with check (
  sender_id = (select auth.uid())
  and exists (
    select 1 from public.friendships f
    where f.status='accepted'
      and (
        (f.requester_id=direct_messages.sender_id and f.addressee_id=direct_messages.recipient_id)
        or
        (f.requester_id=direct_messages.recipient_id and f.addressee_id=direct_messages.sender_id)
      )
  )
  and not exists (
    select 1 from public.blocks b
    where (b.blocker_id=direct_messages.sender_id and b.blocked_id=direct_messages.recipient_id)
       or (b.blocker_id=direct_messages.recipient_id and b.blocked_id=direct_messages.sender_id)
  )
);
