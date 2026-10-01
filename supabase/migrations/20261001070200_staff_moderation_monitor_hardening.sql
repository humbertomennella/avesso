-- AVESSO // Monitoramento público 24h
-- Um único caminho de alerta para conteúdo social público e perfis.

alter table public.moderation_alerts drop constraint if exists moderation_alerts_source_type_check;
alter table public.moderation_alerts
  add constraint moderation_alerts_source_type_check
  check(source_type in ('post','response','plaza','story','guestbook','profile','photo','photo_comment','story_comment'));

create or replace function public.scan_moderation_text(
  p_source_type text,p_source_id uuid,p_user_id uuid,p_text text
)
returns void language plpgsql security definer set search_path=public as $$
declare t record; normalized text:=lower(coalesce(p_text,'')); alert_severity text;
begin
  if length(trim(normalized))=0 then return; end if;
  for t in select id,term,severity from public.moderation_terms where enabled=true and char_length(trim(term))>=2 loop
    if position(lower(trim(t.term)) in normalized)>0 then
      alert_severity:=case t.severity when 'media' then 'normal' else t.severity end;
      if alert_severity not in ('baixa','normal','alta','critica') then alert_severity:='normal'; end if;
      insert into public.moderation_alerts(term_id,source_type,source_id,user_id,matched_term,excerpt,severity,status,updated_at)
      values(t.id,left(p_source_type,40),p_source_id,p_user_id,t.term,left(coalesce(p_text,''),500),alert_severity,'novo',now())
      on conflict(term_id,source_type,source_id) do update set
        excerpt=excluded.excerpt,severity=excluded.severity,user_id=excluded.user_id,
        status=case when public.moderation_alerts.status in ('resolvido','ignorado') then 'novo' else public.moderation_alerts.status end,
        updated_at=now();
    end if;
  end loop;
end $$;

create or replace function public.trg_scan_post_text() returns trigger language plpgsql security definer set search_path=public as $$
begin perform public.scan_moderation_text('post',new.id,new.author_id,new.body); return new; end $$;
create or replace function public.trg_scan_response_text() returns trigger language plpgsql security definer set search_path=public as $$
begin perform public.scan_moderation_text('response',new.id,new.author_id,new.body); return new; end $$;
create or replace function public.trg_scan_story_text() returns trigger language plpgsql security definer set search_path=public as $$
begin perform public.scan_moderation_text('story',new.id,new.author_id,new.body); return new; end $$;
create or replace function public.trg_scan_plaza_text() returns trigger language plpgsql security definer set search_path=public as $$
begin if new.user_id is not null then perform public.scan_moderation_text('plaza',new.id,new.user_id,new.body); end if; return new; end $$;
create or replace function public.trg_scan_guestbook_text() returns trigger language plpgsql security definer set search_path=public as $$
begin perform public.scan_moderation_text('guestbook',new.id,new.author_id,new.body); return new; end $$;
create or replace function public.trg_scan_profile_text() returns trigger language plpgsql security definer set search_path=public as $$
begin perform public.scan_moderation_text('profile',new.id,new.id,concat_ws(' ',new.display_name,new.handle,new.status_message,new.bio)); return new; end $$;
create or replace function public.trg_scan_photo_comment_text() returns trigger language plpgsql security definer set search_path=public as $$
begin perform public.scan_moderation_text('photo_comment',new.id,new.user_id,new.body); return new; end $$;
create or replace function public.trg_scan_story_comment_text() returns trigger language plpgsql security definer set search_path=public as $$
begin perform public.scan_moderation_text('story_comment',new.id,new.user_id,new.body); return new; end $$;
create or replace function public.trg_scan_profile_photo_text() returns trigger language plpgsql security definer set search_path=public as $$
begin perform public.scan_moderation_text('photo',new.id,new.user_id,new.caption); return new; end $$;

drop trigger if exists posts_moderation_scan on public.posts;
drop trigger if exists scan_post_text on public.posts;
create trigger scan_post_text after insert or update of body on public.posts for each row execute function public.trg_scan_post_text();

drop trigger if exists responses_moderation_scan on public.responses;
drop trigger if exists scan_response_text on public.responses;
create trigger scan_response_text after insert or update of body on public.responses for each row execute function public.trg_scan_response_text();

drop trigger if exists stories_moderation_scan on public.stories;
drop trigger if exists scan_story_text on public.stories;
create trigger scan_story_text after insert or update of body on public.stories for each row execute function public.trg_scan_story_text();

drop trigger if exists plaza_moderation_scan on public.plaza_messages;
drop trigger if exists scan_plaza_text on public.plaza_messages;
create trigger scan_plaza_text after insert or update of body on public.plaza_messages for each row execute function public.trg_scan_plaza_text();

drop trigger if exists profiles_moderation_scan on public.profiles;
drop trigger if exists scan_profile_text on public.profiles;
create trigger scan_profile_text after insert or update of display_name,handle,status_message,bio on public.profiles for each row execute function public.trg_scan_profile_text();

drop trigger if exists scan_guestbook_text on public.guestbook_entries;
create trigger scan_guestbook_text after insert or update of body on public.guestbook_entries for each row execute function public.trg_scan_guestbook_text();

drop trigger if exists photo_comments_moderation_scan on public.photo_comments;
create trigger photo_comments_moderation_scan after insert or update of body on public.photo_comments for each row execute function public.trg_scan_photo_comment_text();

drop trigger if exists story_comments_moderation_scan on public.story_comments;
create trigger story_comments_moderation_scan after insert or update of body on public.story_comments for each row execute function public.trg_scan_story_comment_text();

drop trigger if exists profile_photos_moderation_scan on public.profile_photos;
create trigger profile_photos_moderation_scan after insert or update of caption on public.profile_photos for each row execute function public.trg_scan_profile_photo_text();
