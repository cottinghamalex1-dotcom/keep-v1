-- Stage-only migration: apply when Shotstack credentials and validation are ready.
-- Each published edit revision is rendered at most once; existing MP4s are not deleted.
create table if not exists public.keep_render_jobs (
  id uuid primary key default gen_random_uuid(),
  keep_id uuid not null references public.keeps(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  revision_hash text not null check (revision_hash ~ '^[0-9a-f]{64}$'),
  status text not null default 'queued' check (status in ('queued','rendering','ready','failed')),
  provider text not null default 'shotstack' check (provider = 'shotstack'),
  provider_render_id text unique,
  render_path text,
  expected_duration_seconds numeric not null check (expected_duration_seconds > 0),
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (keep_id, revision_hash)
);
create index if not exists keep_render_jobs_owner_idx
  on public.keep_render_jobs (owner_id, created_at desc);
create index if not exists keep_render_jobs_keep_idx
  on public.keep_render_jobs (keep_id, created_at desc);
alter table public.keep_render_jobs enable row level security;
revoke all on public.keep_render_jobs from anon;
grant select on public.keep_render_jobs to authenticated;
create policy "Creators view only their own render status" on public.keep_render_jobs
  for select to authenticated using ((select auth.uid()) = owner_id);
-- No direct client-side insert/update/delete: trusted Edge Function uses service-role.
