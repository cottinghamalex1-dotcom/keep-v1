-- Stripe payments join Keep's existing one-entitlement-per-Keep ledger.
-- The legacy Shopify identity columns remain for backward compatibility.
alter table public.keep_purchases
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists package_tier text not null default 'signature',
  add column if not exists included_card_count integer not null default 1,
  add column if not exists stripe_shipping_details jsonb not null default '{}'::jsonb,
  add column if not exists voice_count integer not null default 1,
  add column if not exists extra_logo_cards integer not null default 0,
  add column if not exists extra_engraved_cards integer not null default 0,
  add column if not exists basic_engraving_upgrade boolean not null default false,
  add column if not exists stripe_subtotal_cents integer,
  add column if not exists stripe_total_cents integer,
  add column if not exists stripe_tax_cents integer;

create unique index if not exists keep_purchases_stripe_checkout_session_unique
  on public.keep_purchases (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
create index if not exists keep_purchases_stripe_payment_intent_idx
  on public.keep_purchases (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

alter table public.keep_fulfillment
  add column if not exists voice_count integer not null default 1,
  add column if not exists extra_logo_cards integer not null default 0,
  add column if not exists extra_engraved_cards integer not null default 0,
  add column if not exists included_card_engraved boolean not null default false,
  add column if not exists engraving_required boolean not null default true,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_total_cents integer,
  add column if not exists stripe_tax_cents integer;

-- Multiple extra cards share a Keep's NFC URL, but each must be counted for packing.
alter table public.keep_fulfillment drop constraint if exists keep_fulfillment_card_count_check;
alter table public.keep_fulfillment
  add constraint keep_fulfillment_card_count_check check (card_count >= 1 and card_count <= 10001);

-- Logo-only Basic cards do not need a laser-engraving checkbox to ship.
alter table public.keep_fulfillment drop constraint if exists keep_fulfillment_shipping_checks;
alter table public.keep_fulfillment
  add constraint keep_fulfillment_shipping_checks check (
    not shipped or ((not engraving_required or engraved) and nfc_written and nfc_tested and packed)
  );

create or replace function public.keep_fulfillment_on_purchase()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  tier text := coalesce(new.package_tier, 'signature');
  cards integer := coalesce(new.included_card_count, 1);
  shipping jsonb := coalesce(new.stripe_shipping_details, '{}'::jsonb);
  order_ref text := coalesce(nullif(new.stripe_checkout_session_id, ''), nullif(new.shopify_order_id, ''), new.id::text);
  needs_engraving boolean := tier in ('signature', 'deluxe') or new.basic_engraving_upgrade or coalesce(new.extra_engraved_cards, 0) > 0;
begin
  if tier not in ('basic', 'signature', 'deluxe') then tier := 'signature'; end if;
  insert into public.keep_fulfillment (
    purchase_id, order_reference, package_tier, card_count,
    shipping_email, shipping_name, shipping_address1, shipping_address2,
    shipping_city, shipping_region, shipping_postal_code, shipping_country,
    voice_count, extra_logo_cards, extra_engraved_cards,
    included_card_engraved, engraving_required, stripe_checkout_session_id,
    stripe_total_cents, stripe_tax_cents
  ) values (
    new.id, order_ref, tier, cards,
    new.purchaser_email, shipping->>'name', shipping#>>'{address,line1}', shipping#>>'{address,line2}',
    shipping#>>'{address,city}', shipping#>>'{address,state}', shipping#>>'{address,postal_code}', shipping#>>'{address,country}',
    new.voice_count, new.extra_logo_cards, new.extra_engraved_cards,
    (tier <> 'basic' or new.basic_engraving_upgrade), needs_engraving, new.stripe_checkout_session_id,
    new.stripe_total_cents, new.stripe_tax_cents
  ) on conflict (purchase_id) do nothing;
  return new;
end;
$$;

comment on column public.keep_purchases.stripe_checkout_session_id is
  'Only a Stripe-signature-verified, paid Checkout Session may populate this ID.';
comment on column public.keep_fulfillment.extra_engraved_cards is
  'Additional engraved physical cards, separate from the single included card.';
