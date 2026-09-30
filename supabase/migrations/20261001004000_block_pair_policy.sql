
-- AVESSO: bloqueio bidirecional verificável dentro de políticas sem expor
-- para o cliente quem bloqueou quem.

create or replace function public.is_blocked_pair(a uuid,b uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists(
    select 1 from public.blocks
    where (blocker_id=a and blocked_id=b)
       or (blocker_id=b and blocked_id=a)
  );
$$;

revoke all on function public.is_blocked_pair(uuid,uuid) from public;
grant execute on function public.is_blocked_pair(uuid,uuid) to authenticated;

drop policy if exists friendships_requester_insert on public.friendships;
create policy friendships_requester_insert
on public.friendships
for insert
to authenticated
with check (
  requester_id = (select auth.uid())
  and requester_id <> addressee_id
  and status='pending'
  and not public.is_blocked_pair(requester_id,addressee_id)
);

drop policy if exists direct_messages_read_friends on public.direct_messages;
create policy direct_messages_read_friends
on public.direct_messages
for select
to authenticated
using (
  ((select auth.uid())=sender_id or (select auth.uid())=recipient_id)
  and exists (
    select 1 from public.friendships f
    where f.status='accepted'
      and (
        (f.requester_id=direct_messages.sender_id and f.addressee_id=direct_messages.recipient_id)
        or
        (f.requester_id=direct_messages.recipient_id and f.addressee_id=direct_messages.sender_id)
      )
  )
  and not public.is_blocked_pair(sender_id,recipient_id)
);

drop policy if exists direct_messages_send_friends on public.direct_messages;
create policy direct_messages_send_friends
on public.direct_messages
for insert
to authenticated
with check (
  sender_id=(select auth.uid())
  and exists (
    select 1 from public.friendships f
    where f.status='accepted'
      and (
        (f.requester_id=direct_messages.sender_id and f.addressee_id=direct_messages.recipient_id)
        or
        (f.requester_id=direct_messages.recipient_id and f.addressee_id=direct_messages.sender_id)
      )
  )
  and not public.is_blocked_pair(sender_id,recipient_id)
);
