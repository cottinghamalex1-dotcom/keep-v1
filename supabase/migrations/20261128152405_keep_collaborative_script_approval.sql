-- Preserve legacy invitations; only newly shared collaborative reviews require approval.
alter table public.keep_remote_invites add column if not exists script_review_required boolean not null default false;
alter table public.keep_remote_invites add column if not exists script_approved_at timestamptz;
