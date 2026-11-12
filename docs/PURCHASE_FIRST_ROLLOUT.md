# Keep purchase-first checkout and fulfillment rollout

## Customer journey
1. Customer discovers the Keep brand and views real product photos, pre-rendered example Keeps, and a clear “Choose a Keep” CTA on the public website.
2. Customer chooses a physical card and pays in Shopify; no AI or custom video processing before purchase.
3. Shopify sends a signed `orders/paid` webhook to the Keep commerce edge function.
4. The customer signs in with the *verified email used at checkout* and visits `/start` or their `/app` account.
5. `/?create=1` reserves exactly one paid line-item unit and initializes a Keep. No purchase = redirected to `/shop`.
6. Customer uses the existing editor, AI interview, media upload, and preview. Drafts are automatically saved; `/?resume=1` restores progress.
7. The final **Approve my Keep** action publishes the creation and transitions its purchase from `reserved` to `approved`.
8. The fulfillment operator sees approved purchases in Supabase `public.keep_purchases`, personalizes/encodes/tests the NFC card, and ships the physical gift. Shipping state updates and email notifications are a separate fulfillment integration.
9. Recipient taps the NFC card to watch the privately linked finished Keep.

## What's ready
- `/shop`: premium purchase-first product explanation and CTA with no unconfigured checkout.
- `/start`: signed-in paid-purchase checker and guided creation handoff.
- Draft Signature Keep product in the connected Shopify trial store, with a **provisional** $99 price.
- `keep_purchases`: signed-order records, a single reserved Keep per unit, and production statuses; RLS blocks customer writes.
- `keep-commerce`: Shopify HMAC validation, shop allowlisting, duplicate delivery handling, and verified Supabase creator authorization.
- Server-side paid checks for AI actions and publishing are written but deliberately not activated in production until launch readiness.

## Required configuration before accepting payments
- Upgrade Shopify from trial and finish taxes, shipping, return policies, store payments and checkout settings.
- Confirm Signature Keep pricing, card personalization options, SKUs, and shipping cost. Publish the Shopify product when ready.
- Set Supabase Edge function secrets *privately*:
  - `SHOPIFY_WEBHOOK_SECRET` for webhook HMAC (not a storefront/API key).
  - `KEEP_SHOPIFY_SHOP_DOMAIN=jn2cmt-se.myshopify.com`.
  - `KEEP_SHOPIFY_VARIANT_ID=68097993081152` (numeric ID, not the Shopify GID).
- Register HTTPS Shopify webhook subscriptions (signed with this secret):
  - `orders/paid` → `https://lwkzhpwugtosbidxvdcr.supabase.co/functions/v1/keep-commerce`
  - `orders/cancelled` → same endpoint
  - `refunds/create` → same endpoint
  - Verify Shopify's actual webhook payloads for each topic, refund idempotency, and reconciliation.
- In Vercel, set `VITE_KEEP_SHOPIFY_PRODUCT_URL` to the real public Shopify product or cart URL, **not** the draft product admin URL.
- Update the Shopify thank-you page / order confirmation email to link to `https://keep-v1.vercel.app/start`; test paid, missed-email, duplicate-payment, cancellation and refund cases.
- Deploy updated `keep-ai` and `keep-publish` functions at cutover, after configuring Shopify and end-to-end verification; these otherwise would block legacy creator sessions.
- Point all “Create a Keep” CTAs in the separate official OpenAI Sites website to the live Vercel `/shop`. The Vercel repo is not the standalone Sites project.
- Test new buyer checkout to account verification, creation, approval and NFC fulfillment end-to-end before merging the feature branch into production.

## Important current limitations / safeguards
- A Shopify checkout-success URL, query string, client-side flags, and unverified order IDs must **never** grant paid access.
- A customer account is required after checkout; passwordless SSO is not yet wired. Existing Supabase email/password sign-in is reused.
- Refund events currently revoke all line-item creation statuses for an order, which is conservative for partial refunds; before launch, implement matching refundable line items and quantities to avoid revoking unaffected cards.
- `public.keep_purchases` is the **database fulfillment queue**, not yet an operator UI, automated printer/engraving service, carrier integration, or shipping-notification system.
- A purchased card enters production only after approval; do not promise or mark shipment automatically.
- Existing free drafts may remain accessible for editing during migration, but new generation/publishing must be paid at production cutover; plan any grandfathering separately.
- The example-image section of `/shop` is illustrative; actual demo films and authentic product photos remain to be added before public launch.
- Purchase products and webhooks aren't public yet; review branch keeps the existing production creator available while the store is on trial.
- Add per-order AI action limits and media retention policy to control usage even for verified customers.
- The Supabase security adviser also recommends enabling leaked-password protection in Auth settings.
