-- Applied to the linked project for per-creation editing. Existing owner-only RLS applies.
alter table public.keeps add column if not exists draft_project jsonb;
comment on column public.keeps.draft_project is 'Private editable project snapshot. Published playback continues to use published_project.';

begin;
update public.keep_drafts set project = jsonb_set(project, '{publicationId}', to_jsonb(gen_random_uuid()::text)) where coalesce((project->>'active')::boolean,false) and nullif(project->>'publicationId','') is null;
insert into public.keeps(id,owner_id,recipient_name,occasion,draft_project,updated_at)
select (project->>'publicationId')::uuid,owner_id,coalesce(nullif(project->>'recipientName',''),'someone special'),project->>'occasion',project,updated_at
from public.keep_drafts where coalesce((project->>'active')::boolean,false)
on conflict(id) do update set draft_project=excluded.draft_project where keeps.owner_id=excluded.owner_id and keeps.draft_project is null;
commit;
