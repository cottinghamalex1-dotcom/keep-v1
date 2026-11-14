-- Keep's verified-purchase fulfillment queue, support inbox and owner-only operator access.
-- Purchase rows remain write-protected; checkout webhooks must create them.
create schema if not exists keep_private;
revoke all on schema keep_private from PUBLIC, anon, authenticated;

create table if not exists keep_private.admin_allowlist (
  email text primary key,
  created_at timestamptz not null default now(),
  constraint admin_email_normalized check (email = lower(trim(email)))
);
revoke all on keep_private.admin_allowlist from PUBLIC, anon, authenticated;

create or replace function public.keep_is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    join keep_private.admin_allowlist a on a.email = lower(u.email)
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
  )
$$;
revoke all on function public.keep_is_admin() from PUBLIC, anon;
grant execute on function public.keep_is_admin() to authenticated;

create table if not exists public.keep_fulfillment (
  purchase_id uuid primary key references public.keep_purchases(id) on delete cascade,
  order_reference text not null,
  package_tier text not null default 'signature'
    check (package_tier in ('basic','signature','deluxe')),
  card_count integer not null default 1 check (card_count between 1 and 10),
  engraving_1 text not null default '' check (char_length(engraving_1) <= 80),
  engraving_2 text not null default '' check (char_length(engraving_2) <= 80),
  recipient_name text,
  shipping_name text,
  shipping_email text,
  shipping_address1 text,
  shipping_address2 text,
  shipping_city text,
  shipping_region text,
  shipping_postal_code text,
  shipping_country text,
  engraving_approved boolean not null default false,
  engraved boolean not null default false,
  nfc_written boolean not null default false,
  nfc_tested boolean not null default false,
  packed boolean not null default false,
  shipped boolean not null default false,
  shipping_carrier text,
  tracking_number text,
  card_url text,
  issue_flag boolean not null default false,
  admin_notes text not null default '',
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint keep_fulfillment_shipping_checks check (
    not shipped or (engraved and nfc_written and nfc_tested and packed)
  )
);
create index if not exists keep_fulfillment_work_queue
on public.keep_fulfillment (shipped, created_at desc);
alter table public.keep_fulfillment enable row level security;
revoke all on public.keep_fulfillment from anon, authenticated;
grant select, update on public.keep_fulfillment to authenticated;
create policy "owner sees own card details" on public.keep_fulfillment
for select to authenticated using (
  exists (
    select 1 from public.keep_purchases p
    where p.id = purchase_id and p.owner_id = (select auth.uid())
  )
);
create policy "operator reads fulfillment" on public.keep_fulfillment
for select to authenticated using ((select public.keep_is_admin()));
create policy "operator updates fulfillment" on public.keep_fulfillment
for update to authenticated using ((select public.keep_is_admin()))
with check ((select public.keep_is_admin()));

create policy "operator reads verified purchases" on public.keep_purchases
for select to authenticated using ((select public.keep_is_admin()));
create policy "operator reads Keep links" on public.keeps
for select to authenticated using ((select public.keep_is_admin()));

create or replace function public.keep_fulfillment_on_purchase()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  tier text := coalesce(to_jsonb(new)->>'package_tier','signature');
  cards integer := coalesce(nullif(to_jsonb(new)->>'included_card_count','')::integer,1);
  shipping jsonb := coalesce(to_jsonb(new)->'stripe_shipping_details','{}'::jsonb);
  order_ref text := coalesce(
    nullif(to_jsonb(new)->>'stripe_checkout_session_id',''),
    nullif(new.shopify_order_id,''),
    new.id::text
  );
begin
  if tier not in ('basic','signature','deluxe') then tier := 'signature'; end if;
  insert into public.keep_fulfillment (
    purchase_id, order_reference, package_tier, card_count, shipping_email,
    shipping_name, shipping_address1, shipping_address2, shipping_city,
    shipping_region, shipping_postal_code, shipping_country
  ) values (
    new.id, order_ref, tier, least(greatest(cards,1),10), new.purchaser_email,
    shipping->>'name', shipping#>>'{address,line1}', shipping#>>'{address,line2}',
    shipping#>>'{address,city}', shipping#>>'{address,state}',
    shipping#>>'{address,postal_code}', shipping#>>'{address,country}'
  ) on conflict (purchase_id) do nothing;
  return new;
end
$$;
revoke all on function public.keep_fulfillment_on_purchase() from PUBLIC, anon, authenticated;
drop trigger if exists keep_purchase_fulfillment_queue on public.keep_purchases;
create trigger keep_purchase_fulfillment_queue
after insert on public.keep_purchases
for each row execute function public.keep_fulfillment_on_purchase();
insert into public.keep_fulfillment (purchase_id,order_reference,shipping_email)
select id,shopify_order_id,purchaser_email from public.keep_purchases
on conflict (purchase_id) do nothing;

create or replace function public.keep_fulfillment_update_stamp()
returns trigger language plpgsql set search_path = ''
as $$
begin
  new.updated_at = now();
  new.updated_by = (select auth.uid());
  return new;
end
$$;
drop trigger if exists keep_fulfillment_stamp on public.keep_fulfillment;
create trigger keep_fulfillment_stamp before update on public.keep_fulfillment
for each row execute function public.keep_fulfillment_update_stamp();

-- A confirmed sign-in claims only rows already inserted by trusted payment processing.
create or replace function public.keep_claim_purchases()
returns integer language plpgsql security definer set search_path = ''
as $$
declare verified_email text; claimed integer;
begin
  select lower(email) into verified_email from auth.users
    where id = (select auth.uid()) and email_confirmed_at is not null;
  if verified_email is null then return 0; end if;
  update public.keep_purchases
     set owner_id = (select auth.uid()), updated_at = now()
   where owner_id is null
     and lower(purchaser_email) = verified_email
     and status in ('paid','reserved','approved','in_production','shipped');
  get diagnostics claimed = row_count;
  return claimed;
end
$$;
revoke all on function public.keep_claim_purchases() from PUBLIC, anon;
grant execute on function public.keep_claim_purchases() to authenticated;

-- Customers only submit text for their own paid card, not shipping or paid status.
create or replace function public.keep_submit_engravings(
  p_purchase_id uuid, p_first text, p_second text default ''
)
returns void language plpgsql security definer set search_path = ''
as $$
declare tier text; card_total integer; purchase_status text;
begin
  select f.package_tier,f.card_count,p.status into tier,card_total,purchase_status
  from public.keep_fulfillment f join public.keep_purchases p on p.id=f.purchase_id
  where p.id=p_purchase_id and p.owner_id=(select auth.uid());
  if not found or purchase_status not in ('paid','reserved','approved') then
    raise exception 'This order is not eligible for personalization';
  end if;
  if tier='basic' then raise exception 'Basic cards have standard Keep branding'; end if;
  if char_length(trim(coalesce(p_first,''))) > 80
     or char_length(trim(coalesce(p_second,''))) > 80 then
    raise exception 'Engraving must fit within 80 characters per card';
  end if;
  if (tier <> 'deluxe' or card_total < 2) and length(trim(coalesce(p_second,'')))>0 then
    raise exception 'This package includes one personalized card';
  end if;
  update public.keep_fulfillment
  set engraving_1=trim(coalesce(p_first,'')),
      engraving_2=case when tier='deluxe' then trim(coalesce(p_second,'')) else '' end,
      engraving_approved=false
  where purchase_id=p_purchase_id and not engraved;
  if not found then raise exception 'This order has entered production'; end if;
end
$$;
revoke all on function public.keep_submit_engravings(uuid,text,text) from PUBLIC, anon;
grant execute on function public.keep_submit_engravings(uuid,text,text) to authenticated;

create table if not exists public.keep_support_tickets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  purchase_id uuid references public.keep_purchases(id) on delete set null,
  subject text not null check (char_length(subject) between 5 and 160),
  description text not null check (char_length(description) between 10 and 5000),
  status text not null default 'open' check (status in ('open','in_progress','resolved')),
  priority text not null default 'normal' check (priority in ('normal','urgent')),
  admin_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists keep_support_work_queue on public.keep_support_tickets(status,created_at desc);
alter table public.keep_support_tickets enable row level security;
revoke all on public.keep_support_tickets from anon, authenticated;
grant select, insert, update on public.keep_support_tickets to authenticated;
create policy "support owner submits" on public.keep_support_tickets
for insert to authenticated with check (
  owner_id = (select auth.uid()) and status='open'
  and priority='normal' and admin_notes=''
  and (purchase_id is null or exists (
    select 1 from public.keep_purchases p where p.id=purchase_id and p.owner_id=(select auth.uid())
  ))
);
create policy "support owner reads" on public.keep_support_tickets
for select to authenticated using (owner_id=(select auth.uid()));
create policy "support operator reads" on public.keep_support_tickets
for select to authenticated using ((select public.keep_is_admin()));
create policy "support operator updates" on public.keep_support_tickets
for update to authenticated using ((select public.keep_is_admin()))
with check ((select public.keep_is_admin()));

comment on table public.keep_fulfillment is 'Only signed-webhook purchase records seed this physical-card work queue; admin access is checked in Postgres.';
comment on table public.keep_support_tickets is 'Customer support cases with owner-only creation and operator triage.';
