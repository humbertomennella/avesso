
-- Harden private chat attachment storage: only accepted friends can exchange attachment bytes.
drop policy if exists avesso_chat_select_participants on storage.objects;
create policy avesso_chat_select_participants on storage.objects
for select to authenticated using (
  bucket_id='avesso-chat'
  and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or (storage.foldername(name))[2]=(select auth.uid())::text
  )
  and exists (
    select 1 from public.friendships f
    where f.status='accepted'
      and (
        (f.requester_id::text=(storage.foldername(name))[1] and f.addressee_id::text=(storage.foldername(name))[2])
        or
        (f.requester_id::text=(storage.foldername(name))[2] and f.addressee_id::text=(storage.foldername(name))[1])
      )
  )
);

drop policy if exists avesso_chat_insert_sender on storage.objects;
create policy avesso_chat_insert_sender on storage.objects
for insert to authenticated with check (
  bucket_id='avesso-chat'
  and (storage.foldername(name))[1]=(select auth.uid())::text
  and exists (
    select 1 from public.friendships f
    where f.status='accepted'
      and (
        (f.requester_id=(select auth.uid()) and f.addressee_id::text=(storage.foldername(name))[2])
        or
        (f.addressee_id=(select auth.uid()) and f.requester_id::text=(storage.foldername(name))[2])
      )
  )
);
