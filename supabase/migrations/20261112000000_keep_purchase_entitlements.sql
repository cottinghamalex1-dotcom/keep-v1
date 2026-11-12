-- A paid Shopify line-item unit buys exactly one new Keep.
-- Never allow browser clients to grant or mutate their own purchase entitlements.
create table if not exists public.keep_purchases (
  id uuid primary key default gen_random_uuid(),
  shopify_order_id text not null,
  shopify_line_item_id text not null,
  unit_index integer not null check (unit_index >= 0 and unit_index < 25),
  shopify_variant_id text not null,
  purchaser_email text not null,
  owner_id uuid references auth.users(id) on delete set null,
  keep_id uuid unique references public.keeps(id) on delete set null,
  status text not null default 'paid'
    check (status in ('paid', 'reserved', 'approved', 'in_production', 'shipped', 'refunded', 'cancelled')),
  paid_at timestamptz not null,
  approved_at timestamptz,
  shipped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shopify_order_id, shopify_line_item_id, unit_index)
);
create index if not exists keep_purchases_owner_idx on public.keep_purchases(owner_id, status);
create index if not exists keep_purchases_email_idx on public.keep_purchases(lower(purchaser_email), status);
create index if not exists keep_purchases_fulfillment_idx on public.keep_purchases(status, approved_at) where status in ('approved', 'in_production');
alter table public.keep_purchases enable row level security;
revoke all on public.keep_purchases from anon, authenticated;
grant select on public.keep_purchases to authenticated;
drop policy if exists "Owners can view purchased Keeps" on public.keep_purchases;
create policy "Owners can view purchased Keeps" on public.keep_purchases
  for select to authenticated
  using (owner_id = (select auth.uid()));
comment on table public.keep_purchases is 'Shopify-verified, one-per-card purchase and fulfillment status. Only trusted server handlers may write.';
