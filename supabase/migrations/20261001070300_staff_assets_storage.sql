-- AVESSO // Assets administráveis
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'avesso-admin-assets','avesso-admin-assets',true,10485760,
  array['image/png','image/jpeg','image/webp','image/gif','image/svg+xml']
)
on conflict(id) do update set
  public=excluded.public,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists avesso_admin_assets_public_read on storage.objects;
create policy avesso_admin_assets_public_read
on storage.objects for select
using(bucket_id='avesso-admin-assets');

drop policy if exists avesso_admin_assets_owner_insert on storage.objects;
create policy avesso_admin_assets_owner_insert
on storage.objects for insert to authenticated
with check(
  bucket_id='avesso-admin-assets'
  and public.staff_can('owner')
  and (storage.foldername(name))[1]=(select auth.uid())::text
);

drop policy if exists avesso_admin_assets_owner_update on storage.objects;
create policy avesso_admin_assets_owner_update
on storage.objects for update to authenticated
using(bucket_id='avesso-admin-assets' and public.staff_can('owner'))
with check(bucket_id='avesso-admin-assets' and public.staff_can('owner'));

drop policy if exists avesso_admin_assets_owner_delete on storage.objects;
create policy avesso_admin_assets_owner_delete
on storage.objects for delete to authenticated
using(bucket_id='avesso-admin-assets' and public.staff_can('owner'));
