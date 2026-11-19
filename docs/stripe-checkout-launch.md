# Keep — Stripe Checkout launch checklist (November 18, 2026)

Checkout is **closed by default**. Do not set \`VITE_KEEP_STRIPE_CHECKOUT_READY=true\` until every item below passes.

## Package catalog and amounts

| Item | Stripe live price | Amount |
| --- | --- | ---: |
| Basic, 1 voice + logo card | \`price_1Ud7cMB5i8TaAgYDiHS6FTDB\` | $79 |
| Signature, 2 voices + engraving | \`price_1UbLcIB5i8TaAgYDZIWzpiYJ\` | $99 |
| Additional person | \`price_1Ud7cOB5i8TaAgYDrZlbxBwO\` | $19 each |
| Basic included-card engraving | \`price_1UdXxJB5i8TaAgYD3ZjOqS9Z\` | $19 |
| Additional logo-only card | \`price_1Uc7dXB5i8TaAgYDPQCWADAu\` | $39 each |
| Additional engraved card | \`price_1Ud7crB5i8TaAgYDT1qDTuB3\` | $49 each |
| Signature Duo (2 total engraved cards) | \`price_1UdXxLB5i8TaAgYD4EQywoeq\` | $139, base included |
| Signature Family (3 total engraved cards) | \`price_1UdXxMB5i8TaAgYDN8UCbGIj\` | $179, base included |
| Signature Five (5 total engraved cards) | \`price_1UdXxOB5i8TaAgYDLQ2zCBAg\` | $249, base included |
| Signature additional bundled engraved card | \`price_1UdY2eB5i8TaAgYDhz6dcGI5\` | $40, server-validated Signature only |

Shop routes customers to \`/?create=1&package=basic|signature\`. At the final card step, the complete cart including all voices, card quantities and engraving goes to the hosted Stripe Checkout Session. Tax is calculated by Stripe Tax, and standard U.S. shipping is $0. Customers cannot select another country.

## Secure configuration — never commit or paste secret values

In **Supabase > KEEP Production > Edge Functions > Secrets**, configure:
- \`STRIPE_SECRET_KEY\` — secret key for the correct Stripe mode; use test first.
- \`STRIPE_WEBHOOK_SECRET\` — the signing secret generated for the webhook endpoint below.
- \`KEEP_SITE_URL=https://keep-v1.vercel.app\`.
- Later, after verified test payments: \`KEEP_REQUIRE_STRIPE_PAYMENT=true\` (server-side publish gate).
- In test mode, all ten Stripe Price IDs must be explicitly supplied via:
  \`STRIPE_PRICE_BASIC\`, \`STRIPE_PRICE_SIGNATURE\`, \`STRIPE_PRICE_EXTRA_VOICE\`,
  \`STRIPE_PRICE_BASIC_ENGRAVING\`, \`STRIPE_PRICE_EXTRA_CARD\`,
  \`STRIPE_PRICE_EXTRA_ENGRAVED_CARD\`, \`STRIPE_PRICE_SIGNATURE_DUO\`, \`STRIPE_PRICE_SIGNATURE_FAMILY_THREE\`,
  \`STRIPE_PRICE_SIGNATURE_FIVE\`, \`STRIPE_PRICE_SIGNATURE_BUNDLE_EXTRA\`.
  The live Stripe Price IDs must not be used with a test secret key.

In **Stripe > Developers > Webhooks** register:
- URL: \`https://lwkzhpwugtosbidxvdcr.supabase.co/functions/v1/keep-stripe-commerce\`
- Events: \`checkout.session.completed\`, \`checkout.session.async_payment_succeeded\`, \`charge.refunded\`
- Store the endpoint's **signing secret** only in Supabase Secrets, not client source.

In **Vercel > keep-v1 > Environment Variables**, only after completed testing:
- \`VITE_KEEP_STRIPE_CHECKOUT_READY=true\` (production), then redeploy.
- Keep this flag unset/false while configuring and testing.
- Because this flag is bundled into frontend JS at build time, updating it without a new deployment is not sufficient.

## Stripe Tax (launch blocker)

Stripe Tax settings are active but **no tax registrations** were found in the connected live account on 2026-11-18. Confirm where Keep is actually registered to collect tax; add only legitimate registrations. Test delivery addresses and calculated tax for a registered jurisdiction; Stripe does not collect tax for jurisdictions without active registrations. Do not infer tax registration from a company address.

## Backend release

- Supabase migration: \`20261118_stripe_checkout_fulfillment.sql\` — purchase/fulfillment columns, unique Stripe Checkout ID, multi-card fulfillment.
- Edge: \`keep-stripe-commerce\` — host checkout, independently verify paid session and all Stripe line items, reserve one creation per paid base package, approve fulfillment, reject incorrect signatures, handle refunds.
- Edge: \`keep-publish\` — guards paid entitlements when \`KEEP_REQUIRE_STRIPE_PAYMENT=true\` and strips purchasing options from public recipient responses.
- Keep orders are created and approved only after **verified payment**, not simply a successful browser redirect.
- Extra physical cards share the same digital Keep link; they do not grant extra digital creations.
- Preserve existing Shopify purchase records and fulfillment data for compatibility.
- Do not enable frontend checkout without the server-side publish enforcement flag.

## Required test matrix before live activation

- Automated: \`npm test\` and \`npm run build\` succeed on feature branch.
- 1 Basic = $79, no engraving, one voice; 1 Signature = $99, two voices, engraving.
- Basic 3 contributors: $79 + 2 × $19 = $117; plus engraving $19 = $136.
- Signature 4 contributors = $99 + 2 × $19 = $137.
- Basic 6 total cards (5 extra logo): $79 + 5 × $39 = $274.
- Basic 10 total cards (9 extra engraved): $79 + 9 × $49 = $520.
- Signature 3 total engraved cards = $179 (Signature Family; includes base package).
- Test declines/cancel back navigation (no entitlement).
- Test a paid Stripe test-mode session with 1 card and a multiple-card package; verify email, shipping, tax, total, 1 purchase row, 1 fulfillment row, correct quantities.
- Test webhook retry: **no duplicated** entitlement or fulfillment rows.
- Test invalid webhook signature and user tampering with item count and price: no entitlement.
- Test refunds: existing paid/reserved/approved non-shipped order moves to refunded; no automatic shipment.
- Test another user attempting to claim the same receipt: rejected.
- Test user editing an already paid cart: no second automatic full-price charge.
- Test paid publication -> approval -> admin fulfillment -> NFT/NFC writing/testing flags -> shipment.
- Confirm a real live checkout only after test mode tests pass and tax collection is confirmed; use a documented/refundable low-cost owner-approved live test transaction, then reconcile.

## Current operational state

Implemented in a feature branch, with checkout **not opened to customers**. A build + sandbox test are required before merge/production enablement. No claim of completed live payment or active sales is made by the code alone.
