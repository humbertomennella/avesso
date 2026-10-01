-- AVESSO // sincronização de apagar mensagens
alter table public.direct_messages
  add column if not exists deleted_at timestamptz;

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
