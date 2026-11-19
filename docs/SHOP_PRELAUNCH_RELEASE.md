# Keep launch pricing and storefront release gate — November 19, 2026

## Approved package catalog

| Offering | Price | Included |
|---|---:|---|
| Basic Keep | $79 | One logo-only matte-black NFC card, one private digital memory film, one voice, standard U.S. shipping |
| Signature Keep | $99 | Everything in Basic, with engraved included card and two voices (together or remote) |
| Basic included-card engraving | $19 | One engraving upgrade, charged only on Basic |
| Additional contributor voice | $19 per person | After Basic's first voice or Signature's two included voices |
| Additional plain NFC card | $39 | Same finished Keep link; card has logo only |
| Additional engraved NFC card | $49 | Same finished Keep link; no discount outside Signature matching-card bundles |
| Signature Duo — two engraved cards total | $139 | Signature $99 plus one engraved extra card; saves $9 versus $148 individually |
| Signature Family — three engraved cards total | $179 | Signature $99 plus two engraved extra cards; saves $18 versus $197 individually |
| Signature Five — five engraved cards total | $249 | Signature $99 plus four engraved extra cards; saves $46 versus $295 individually |

Signature engraved extra cards not exactly at the above bundle counts follow the shared rule in `src/lib/keep-pricing.ts`: 1–3 extras cost $40 per card; four extras cost $150 combined; additional engraved extras beyond four cost $40 each. No maximum quantity. Bundle discounts only apply to Signature with engraved extra cards and never double-discount the included card.

The two package displays intentionally use the simple screenshot-approved value story: Basic "$79 / A meaningful gift, made personal"; Signature "$99 / Make it even more personal" and "The complete gift for just $20 more." Signature is marked **Recommended · Best value**, not "Most popular" until sales data validates that claim. Avoid unsupported original/retail strikethroughs. Do not call this a sale or introductory discount without a substantiated reference offer.

## Shared calculator and customer journey

`src/lib/keep-pricing.ts` computes the same draft totals for the /shop calculator and creator flow. The editor presents Signature whenever an extra voice or Basic engraving makes the upgrade useful; it also offers clickable matching-card bundles in the final card step. Existing draft selections remain editable and do not constitute proof of payment. The included card is never billed again as an extra. Engraving the included Basic card is separate from choosing engraved extras.

## Stripe live catalog, not checkout activation

| Item | Active live Stripe price ID |
|---|---|
| Basic | `price_1Ud7cMB5i8TaAgYDiHS6FTDB` |
| Signature | `price_1UbLcIB5i8TaAgYDZIWzpiYJ` |
| Additional voice | `price_1Ud7cOB5i8TaAgYDrZlbxBwO` |
| Basic engraving $19 | `price_1UdXxJB5i8TaAgYD3ZjOqS9Z` |
| Plain extra card | `price_1Uc7dXB5i8TaAgYDPQCWADAu` |
| Engraved extra card | `price_1Ud7crB5i8TaAgYDT1qDTuB3` |
| Signature bundled additional engraved card ($40, restricted to verified Signature orders) | `price_1UdY2eB5i8TaAgYDhz6dcGI5` |
| Signature Duo | `price_1UdXxLB5i8TaAgYD4EQywoeq` |
| Signature Family three | `price_1UdXxMB5i8TaAgYDN8UCbGIj` |
| Signature Five | `price_1UdXxOB5i8TaAgYDLQ2zCBAg` |

The previous $9/$14.99 engraving, $9 voice and $69 Basic prices were deactivated for new purchases. Historical payment records are not deleted. Existing Stripe Payment Links remain inactive.

**Do not use the bundle prices as additional line items alongside a paid Signature base:** each bundle price already includes the $99 base card. Verified server-side quote construction must choose exactly one Signature base **or** one Signature bundle line item, plus any qualifying paid voices and extras. For Signature engraved-card quantities that do not map to fixed bundle prices, the server must calculate the matching amount securely, using appropriate Stripe Price IDs or a verified dynamic price mechanism.

## Checkout remains intentionally disabled pending verified fulfillment

The Vercel storefront uses `checkoutEnabled = false`. The draft PR #68 (`feature/stripe-checkout-20261118`) has a staged checkout, payment verification and fulfillment backend, but it is not production-ready. Update its allowlist and tests to this approved price matrix. Only enable customer payments after verifying:
1. Signed checkout requests and exact itemized totals, including bundle prices and supplemental changes.
2. Webhook signing, replay safety, paid-order association, refunds, and no client-side entitlements.
3. Fulfillment for each individual card with one shared Keep viewing URL, and admin tracking.
4. Tax registration, shipping across the intended service area and end-to-end payment-to-creation testing.
5. Vercel build, preview QA, mobile display, package switching and old-price-link audit.

The official ChatGPT/OpenAI Sites website is a separate content project from this Vercel repository; updating this app storefront does **not** directly edit that separate Site. Mirror the approved two-card layout and offers there through its native editor before declaring all website surfaces synchronized.
