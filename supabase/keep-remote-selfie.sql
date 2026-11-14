-- Optional remote selfie clips use the contributor's existing expiring voice link.
-- A front-camera clip may cover the whole narration (up to five minutes).
alter table public.keep_remote_media
  add column if not exists purpose text not null default 'moment',
  add column if not exists paragraph_index integer;
alter table public.keep_remote_media drop constraint if exists keep_remote_media_purpose_check;
alter table public.keep_remote_media
  add constraint keep_remote_media_purpose_check
  check(purpose in ('moment','selfie'));
alter table public.keep_remote_media drop constraint if exists keep_remote_media_duration_seconds_check;
alter table public.keep_remote_media
  add constraint keep_remote_media_duration_seconds_check
  check(
    (purpose='moment' and (duration_seconds is null or (duration_seconds>0 and duration_seconds<=90.5)))
    or (purpose='selfie' and duration_seconds>0 and duration_seconds<=300 and paragraph_index is not null and paragraph_index>=0 and paragraph_index<=99)
  );
create index if not exists keep_remote_media_selfie_lookup on public.keep_remote_media(invite_id,purpose,paragraph_index);
