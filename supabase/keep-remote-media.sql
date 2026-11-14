-- A guest's photos and short videos share the same expiring private invite
-- as their recorded voice. No public table or Storage access is granted.
alter table public.keep_remote_invites
  add column if not exists pending_media jsonb not null default '{}'::jsonb,
  add column if not exists media_upload_attempts integer not null default 0,
  add column if not exists media_email_sent_at timestamptz;
create table if not exists public.keep_remote_media (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.keep_remote_invites(id) on delete cascade,
  kind text not null check (kind in ('image','video')),
  file_path text not null unique,
  original_name text not null,
  content_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 41943040),
  duration_seconds numeric check (duration_seconds is null or (duration_seconds > 0 and duration_seconds <= 90.5)),
  uploaded_at timestamptz not null default now()
);
create index if not exists keep_remote_media_invite_idx
  on public.keep_remote_media(invite_id,uploaded_at);
alter table public.keep_remote_media enable row level security;
revoke all on public.keep_remote_media from public,anon,authenticated;
grant all on public.keep_remote_media to service_role;
comment on table public.keep_remote_media is
  'Guest-submitted photo/video moments for an owner to review and import; accessible only via keep-remote-voices Edge Function.';
