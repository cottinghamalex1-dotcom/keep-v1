-- Keep the contributor's original file intact; persist the non-destructive
-- framing choices beside it. Older shares have NULL (default framing).
alter table public.keep_remote_media
  add column if not exists framing jsonb;
comment on column public.keep_remote_media.framing is
  'Validated contributor-selected focusX, focusY (0-100), and zoom (1.03-1.35) for the vertical film.';
