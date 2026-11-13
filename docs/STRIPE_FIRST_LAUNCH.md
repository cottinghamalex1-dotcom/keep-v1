# Stripe objects now created in the Keep account (November 13, 2026)

- Account: `acct_1JQdAcB5i8TaAgYD` — display name verified as Keep.
- Product: `prod_Vcanm4OJMmYA3Z`, **Keep — Signature Card** (physical card and digital experience), tax code `txcd_99999999` (general tangible goods; confirm bundled offer classification with tax adviser).
- One-time Price: `price_1UbLcIB5i8TaAgYDZIWzpiYJ` — USD $99, tax exclusive.
- Stripe live Payment Link: `plink_1UbLd8B5i8TaAgYDO97wCkDB`; public URL `https://buy.stripe.com/cNi14m2MJ5Zo9bD3FZ9ws00`.
- **Payment Link is INACTIVE** — never enable until signed webhook, customer account handoff, GA registration, and shipping testing pass.
- Payment Link has quantity fixed at 1, promotions disabled, US shipping address required, no shipping fee, Stripe Tax automatic enabled, redirects to `https://keep-v1.vercel.app/start` after checkout (not live yet).
- Stripe Tax settings `active`, but **there are zero tax registrations**. State tax registration with Georgia DOR must be completed by the owner before `PostTaxRegistrations` may be used. Stripe does not register with Georgia DOR.
- Vercel Preview branch environment variables configured:
  - `VITE_KEEP_STRIPE_PAYMENT_LINK_URL` = link above
  - `VITE_KEEP_STRIPE_CHECKOUT_READY` = `false`
  Neither is set in production. Production creator app remains unchanged.
- The private Sites website has NOT yet been published with the Stripe checkout link.
- No Shopify money or store change performed during Stripe launch.

---

# Keep — Stripe-first purchase flow (draft implementation)

## Product and launch position

- One **Signature Keep** for **$99 USD** including standard shipping within the United States.
- One Stripe Payment Link — **not a second sales website**.
- The official **OpenAI Sites** website remains the public marketing storefront; Vercel is the Keep creator.
- Shopify is retained as an inactive fallback until a complete Stripe pilot succeeds. Do not route customer CTAs to Shopify.
- No purchases should be accepted until the production Stripe Payment Link, signed webhooks, entitlements, shipping details and post-purchase onboarding have been tested.
- Existing production Vercel creator must continue working while this is staged on feature PR #24.

## Steps for the Stripe account owner

1. In the existing Stripe Dashboard, create one product **Keep — Signature Card**, with a **one-time $99.00 USD price**.
2. Create a **Payment Link** from that exact price. Disable **Adjustable quantity**, **Promotion codes**, and any discount mechanism; the initial launch supports **one card per Checkout Session**.
3. **Collect customer email and shipping address**, restrict shipping destination countries to the **United States**, and add a **standard shipping option for $0**. Tax should be configured for jurisdictions where Keep is registered/required to collect; test the tax result at checkout.
4. Configure post-payment redirect to the *actual deployed* Keep creator URL: `https://keep-v1.vercel.app/start`. The customer uses the same email to sign in or create an account.
5. In Stripe Developers → Webhooks, add the endpoint
   `https://lwkzhpwugtosbidxvdcr.supabase.co/functions/v1/keep-stripe-webhook`.
   Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded` and `charge.dispute.created`.
6. Get the exact Payment Link **ID** beginning with `plink_` and the webhook endpoint **signing secret** beginning with `whsec_`. Configure them in Supabase Edge Function Secrets **privately**, not in chat or frontend:
   - `KEEP_STRIPE_PAYMENT_LINK_ID=plink_...` — exact allowlisted $99 link
   - `STRIPE_WEBHOOK_SECRET=whsec_...` — webhook endpoint signing secret (not API secret key)
   - `KEEP_STRIPE_EXPECTED_MODE=live` — defaults to live; use `test` only in a separate test environment
7. Apply SQL migration `20261112000001_keep_stripe_payment_link.sql` and then deploy Edge `keep-stripe-webhook`, checking `verify_jwt=false` (Stripe signs payloads; it does not use Supabase JWT).
8. In Vercel preview and then production, set
   - `VITE_KEEP_STRIPE_PAYMENT_LINK_URL=https://buy.stripe.com/...` (public link, safe for browser)
   - `VITE_KEEP_STRIPE_CHECKOUT_READY=true` **only after** verified end-to-end testing.
   Secret keys MUST NOT begin with `VITE_`.
9. In the official OpenAI Sites page, update *all* purchase CTAs to the validated Stripe Payment Link. Update shop content to purchase → create → approve → ship; remove Shopify links and old `Create a Keep for free` text.
10. Review a $99 test-mode payment, duplicate Stripe deliveries, missing email, US shipping, refund/dispute, checkout success without payment, signed-in claim, AI gate, final approval, and a sample NFC card. **Do not accept real payments** until all steps pass.

## Server-side trust boundary

- A public Stripe success URL never grants entitlement. Only a webhook with valid timestamped Stripe HMAC signature is accepted.
- The webhook checks the exact allowlisted Payment Link ID; $99 USD product subtotal; paid status; $0 shipping charge; no discounts; US shipping address; verified Stripe event mode.
- Exactly one `stripe_checkout_session_id` earns one unused row in `keep_purchases`; retries do not create duplicates.
- Refunds and disputes are recorded even if delivery order is reversed; fully refunded or disputed payments revoke unused/reserved/approved paid access. Partial refunds must be manually reviewed.
- The Keep creator requires a confirmed Supabase email account matching the paid checkout email. Only trusted service-role code grants and reserves purchases.
- RLS prevents clients from altering entitlements; physical shipping details are stored only in the RLS-protected database for an eventual fulfillment workflow.

## Honest scope and remaining release blockers

- The repository code is staged in a draft PR; **Stripe is not connected to this chat yet**, secrets are not configured, and no Payment Link has been created or activated.
- The additive Stripe migration and webhook are **not deployed** to production.
- The existing Shopify checkout and migration code remain present as unused fallback. Do not enable the old `VITE_KEEP_SHOPIFY_PRODUCT_URL`.
- Stripe Payment Links do **not** provide printable labels, tracking, refund orchestration, postal fulfillment, creator notifications, or customer support automatically. Those must be provided by the operator or an integration.
- The existing `keep-ai` and `keep-publish` staged paid checks should be reviewed and deployed only at cutover. Implement per-account AI abuse limits before broad public launch.
- For a test-mode payment the `KEEP_STRIPE_EXPECTED_MODE` setting needs `test`, but a separate Supabase test environment is recommended to prevent test purchases from granting production access.
- If a pending or paid Stripe event has a missing US address, unexpected amount or unsupported payment method, the webhook returns an error and must be investigated rather than granting Keep access.
- A successful Stripe refund/dispute does not physically recall shipped cards. Operators still need a fulfillment and customer-support workflow.

Reference: https://docs.stripe.com/payment-links and https://docs.stripe.com/webhooks/signature
