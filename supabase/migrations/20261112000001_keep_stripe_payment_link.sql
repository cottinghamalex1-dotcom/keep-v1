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
  add column if not exists stripe_shipping_details jsonb;

create unique index if not exists keep_purchases_stripe_pi_uidx
  on public.keep_purchases(stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create index if not exists keep_purchases_provider_status_idx
  on public.keep_purchases(payment_provider, status);

comment on table public.keep_purchases is
  'Provider-verified purchase entitlements. Exactly one Stripe checkout session or one Shopify line-item unit per Keep. Service role alone grants entitlements.';
comment on column public.keep_purchases.stripe_shipping_details is
  'Shipping destination supplied by Stripe Checkout; sensitive customer information, RLS protected.';
