
-- AVESSO: endurece o bucket de imagens dos recados.
drop policy if exists avesso_recados_insert_self on storage.objects;
create policy avesso_recados_insert_friends
on storage.objects
for insert
to authenticated
with check (
  bucket_id='avesso-recados'
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

drop policy if exists avesso_recados_delete_self on storage.objects;
create policy avesso_recados_delete_author_or_wall_owner
on storage.objects
for delete
to authenticated
using (
  bucket_id='avesso-recados'
  and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or (storage.foldername(name))[2]=(select auth.uid())::text
  )
);
