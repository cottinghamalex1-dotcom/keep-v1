-- Remote collaborative voice recording. Private by default: only the
-- keep-remote-voices Edge Function may access invitations and submissions.
-- Public contributor links use high-entropy hashed bearer tokens, never RLS.
create table if not exists public.keep_remote_invites (
  id uuid primary key default gen_random_uuid(),
  keep_id uuid not null references public.keeps(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  contributor_id text not null,
  contributor_name text not null,
  creator_name text not null,
  recipient_name text not null,
  occasion text,
  script_parts jsonb not null check (jsonb_typeof(script_parts) = 'array'),
  token_hash text not null unique,
  pending_uploads jsonb not null default '{}'::jsonb,
  upload_attempts integer not null default 0 check (upload_attempts >= 0),
  email_sent_at timestamptz,
  expires_at timestamptz not null default (now() + interval '30 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(keep_id, contributor_id)
);
create index if not exists keep_remote_invites_owner_idx
  on public.keep_remote_invites(owner_id, keep_id);
create table if not exists public.keep_remote_recordings (
  invite_id uuid not null references public.keep_remote_invites(id) on delete cascade,
  paragraph_index integer not null check(paragraph_index >= 0 and paragraph_index <= 99),
  text_fingerprint text not null,
  file_path text not null,
  content_type text not null,
  size_bytes bigint not null check(size_bytes > 0 and size_bytes <= 20971520),
  duration_seconds numeric not null check(duration_seconds > 0 and duration_seconds <= 600),
  uploaded_at timestamptz not null default now(),
  primary key(invite_id,paragraph_index),
  unique(file_path)
);
create index if not exists keep_remote_recordings_invite_idx
  on public.keep_remote_recordings(invite_id);

alter table public.keep_remote_invites enable row level security;
alter table public.keep_remote_recordings enable row level security;
revoke all on table public.keep_remote_invites from public, anon, authenticated;
revoke all on table public.keep_remote_recordings from public, anon, authenticated;
grant all on table public.keep_remote_invites to service_role;
grant all on table public.keep_remote_recordings to service_role;
comment on table public.keep_remote_invites is
  'Private expiring per-speaker audio invitations. Raw invite tokens are never stored.';
comment on table public.keep_remote_recordings is
  'Verified private uploads belonging to invited speaking parts; owner-only via Edge Function.';
