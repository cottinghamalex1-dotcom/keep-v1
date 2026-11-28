-- Store the pre-recording interview and original script on the already-private invite.
-- Existing recordings, invite tokens and draft data remain untouched.
alter table public.keep_remote_invites add column if not exists creative_story jsonb;
alter table public.keep_remote_invites add column if not exists creative_base_parts jsonb;
