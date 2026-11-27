-- Private milestones; never exposed through the recipient resolver or public REST.
create table public.keep_first_experiences (
  keep_id uuid primary key references public.keeps(id) on delete cascade,
  first_experienced_at timestamptz not null default now()
);
create table public.keep_delivery_events (
  purchase_id uuid primary key references public.keep_purchases(id) on delete cascade,
  keep_id uuid not null references public.keeps(id) on delete cascade,
  delivered_at timestamptz not null,
  confirmed_at timestamptz not null default now(),
  confirmation_source text not null check (confirmation_source in ('carrier_verified_operator')),
  email_state text not null default 'pending' check (email_state in ('pending','sending','sent','failed','unconfigured','unknown')),
  email_attempted_at timestamptz,
  email_sent_at timestamptz
);
create index keep_delivery_events_keep_id_idx on public.keep_delivery_events(keep_id);
alter table public.keep_first_experiences enable row level security;
alter table public.keep_delivery_events enable row level security;
revoke all on public.keep_first_experiences, public.keep_delivery_events from anon, authenticated, public;
grant select, insert, update, delete on public.keep_first_experiences, public.keep_delivery_events to service_role;
