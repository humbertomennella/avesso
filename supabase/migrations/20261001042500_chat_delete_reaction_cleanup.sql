-- AVESSO // limpeza de reações ao apagar mensagem
create or replace function public.delete_direct_message(p_message_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_path text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select attachment_path into v_path
  from public.direct_messages
  where id = p_message_id
    and sender_id = v_uid
    and deleted_at is null;

  if not found then
    raise exception 'message not deletable';
  end if;

  delete from public.direct_message_reactions
  where message_id = p_message_id;

  update public.direct_messages
  set body = '',
      message_kind = 'deleted',
      attachment_path = null,
      attachment_name = null,
      attachment_type = null,
      attachment_size = null,
      edited_at = null,
      deleted_at = now()
  where id = p_message_id
    and sender_id = v_uid;

  return v_path;
end;
$$;

revoke all on function public.delete_direct_message(uuid) from public;
grant execute on function public.delete_direct_message(uuid) to authenticated;

drop policy if exists direct_message_reactions_insert_self on public.direct_message_reactions;
create policy direct_message_reactions_insert_self
on public.direct_message_reactions for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and char_length(reaction) between 1 and 32
  and exists (
    select 1
    from public.direct_messages m
    where m.id = direct_message_reactions.message_id
      and m.deleted_at is null
      and m.message_kind <> 'deleted'
      and (m.sender_id = (select auth.uid()) or m.recipient_id = (select auth.uid()))
  )
);

drop policy if exists direct_message_reactions_update_self on public.direct_message_reactions;
create policy direct_message_reactions_update_self
on public.direct_message_reactions for update
to authenticated
using (user_id = (select auth.uid()))
with check (
  user_id = (select auth.uid())
  and char_length(reaction) between 1 and 32
  and exists (
    select 1
    from public.direct_messages m
    where m.id = direct_message_reactions.message_id
      and m.deleted_at is null
      and m.message_kind <> 'deleted'
      and (m.sender_id = (select auth.uid()) or m.recipient_id = (select auth.uid()))
  )
);