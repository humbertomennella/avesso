drop policy if exists post_reactions_update_self on public.post_reactions;
create policy post_reactions_update_self on public.post_reactions for update to authenticated
using (user_id=(select auth.uid()))
with check (user_id=(select auth.uid()) and not public.is_user_suspended((select auth.uid())));

drop policy if exists photo_reactions_update_self on public.photo_reactions;
create policy photo_reactions_update_self on public.photo_reactions for update to authenticated
using (user_id=(select auth.uid()))
with check (user_id=(select auth.uid()) and not public.is_user_suspended((select auth.uid())));

drop policy if exists story_reactions_update_self on public.story_reactions;
create policy story_reactions_update_self on public.story_reactions for update to authenticated
using (user_id=(select auth.uid()))
with check (user_id=(select auth.uid()) and not public.is_user_suspended((select auth.uid())));

drop policy if exists direct_message_reactions_update_self on public.direct_message_reactions;
create policy direct_message_reactions_update_self on public.direct_message_reactions for update to authenticated
using (user_id=(select auth.uid()))
with check (
  user_id=(select auth.uid())
  and not public.is_user_suspended((select auth.uid()))
  and char_length(reaction) between 1 and 32
  and exists(
    select 1 from public.direct_messages m
    where m.id=direct_message_reactions.message_id
      and m.deleted_at is null
      and m.message_kind<>'deleted'
      and (m.sender_id=(select auth.uid()) or m.recipient_id=(select auth.uid()))
  )
);

create or replace function public.virar_post(p_post_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  actor uuid := (select auth.uid());
  src public.posts;
  original_post_id uuid;
  original_author_id uuid;
  new_id uuid;
begin
  if actor is null then raise exception 'unauthenticated' using errcode='42501'; end if;
  if public.is_user_suspended(actor) then raise exception 'suspended' using errcode='42501'; end if;
  select * into src from public.posts where id=p_post_id and visibility='publico'::post_visibility;
  if not found then raise exception 'post_not_found'; end if;
  original_post_id:=coalesce(src.reshare_post_id,src.id);
  original_author_id:=coalesce(src.reshare_author_id,src.author_id);
  if public.is_blocked_pair(original_author_id,actor) then raise exception 'blocked' using errcode='42501'; end if;
  insert into public.posts(
    author_id,recipient_id,body,image_url,media_url,media_kind,visibility,
    reshare_post_id,reshare_photo_id,reshare_author_id
  )
  values(
    actor,null,src.body,src.image_url,src.media_url,src.media_kind,'publico',
    original_post_id,null,original_author_id
  )
  returning id into new_id;
  return new_id;
end;
$$;

create or replace function public.virar_foto(p_photo_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public
as $$
declare
  actor uuid := (select auth.uid());
  photo public.profile_photos;
  owner_handle text;
  new_id uuid;
  post_body text;
begin
  if actor is null then raise exception 'unauthenticated' using errcode='42501'; end if;
  if public.is_user_suspended(actor) then raise exception 'suspended' using errcode='42501'; end if;
  select * into photo from public.profile_photos where id=p_photo_id;
  if not found then raise exception 'photo_not_found'; end if;
  if public.is_blocked_pair(photo.user_id,actor) then raise exception 'blocked' using errcode='42501'; end if;
  select handle into owner_handle from public.profiles where id=photo.user_id;
  post_body:=coalesce(nullif(trim(photo.caption),''),'Imagem do Canto de @'||owner_handle||' virada para o feed.');
  if char_length(post_body)<12 then post_body:=post_body||' · do Canto de @'||owner_handle; end if;
  insert into public.posts(
    author_id,recipient_id,body,visibility,reshare_post_id,reshare_photo_id,reshare_author_id
  )
  values(actor,null,left(post_body,420),'publico',null,photo.id,photo.user_id)
  returning id into new_id;
  return new_id;
end;
$$;
