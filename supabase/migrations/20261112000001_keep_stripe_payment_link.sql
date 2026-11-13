-- Add Stripe Payment Link support without disrupting existing Shopify-era records.
-- New purchases are granted by signed, allowlisted Stripe webhook events only.
alter table public.keep_purchases
  alter column shopify_order_id drop not null,
  alter column shopify_line_item_id drop not null,
  alter column shopify_variant_id drop not null;

alter table public.keep_purchases
  add column if not exists payment_provider text not null default 'shopify'
    check (payment_provider in ('shopify', 'stripe')),
  add column if not exists stripe_checkout_session_id text unique,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists stripe_payment_link_id text,
  add column if not exists stripe_amount_total integer check (stripe_amount_total is null or stripe_amount_total >= 0),
  add column if not exists stripe_currency text,
  add column if not exists stripe_shipping_details jsonb,
  add column if not exists package_tier text
    check (package_tier is null or package_tier in ('basic', 'signature', 'deluxe')),
  add column if not exists included_card_count integer
    check (included_card_count is null or included_card_count in (1, 2));

create unique index if not exists keep_purchases_stripe_pi_uidx
  on public.keep_purchases(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create index if not exists keep_purchases_provider_status_idx
  on public.keep_purchases(payment_provider, status);

comment on table public.keep_purchases is
  'Provider-verified purchase entitlements. Exactly one Stripe checkout session or one Shopify line-item unit per Keep. Service role alone grants entitlements.';
comment on column public.keep_purchases.stripe_shipping_details is
  'Shipping destination supplied by Stripe Checkout; sensitive customer information, RLS protected.';


-- Record fully refunded or disputed Stripe PaymentIntents even if webhooks arrive out of order.
-- Clients cannot read or write this reconciliation table.
create table if not exists public.keep_stripe_reversals (
  payment_intent_id text primary key,
  reason text not null check (reason in ('refunded', 'disputed')),
  stripe_event_id text not null,
  recorded_at timestamptz not null default now()
);
alter table public.keep_stripe_reversals enable row level security;
revoke all on public.keep_stripe_reversals from anon, authenticated;


comment on column public.keep_purchases.package_tier is
  'Package variant for product fulfillment: Basic logo-only, Signature engraved, or Deluxe two engraved cards.';
comment on column public.keep_purchases.included_card_count is
  'Number of physical cards included at purchase (one for Basic/Signature, two for Deluxe). Each Stripe purchase unlocks one digital Keep.';
