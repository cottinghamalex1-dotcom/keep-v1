# Keep two-tier prelaunch catalog and checkout release gate

The /shop preview now presents **two** packages:

- **Basic $79 (retail $109)**: one logo-only black metal NFC card, one digital Keep, and one included voice. Additional voices are **$19/person (retail $39)**. A once-per-Keep completion pop-up offers opt-in engraving on the included card for **$9 (retail $20)**.
- **Signature $99 (retail $129)**: one engraved card, one digital Keep, and **two included voices**. The third and each subsequent voice are **$19/person (retail $39)**.
- **Both tiers**: extra cards link to the same Keep. Choose logo-only for **$39/card** or engraved for **$49/card (retail $99)**, independently of the included card's finish. No fixed extra-card limit. The included card is never charged as an extra. Standard U.S. shipping remains included in the base tier; taxes may be added at checkout.

- **Deluxe is retired**; Stripe retains its historical product record (now inactive). Existing payment links for all tiers remain inactive.

Shared pricing calculation lives at `src/lib/keep-pricing.ts`. The editor holds selected options as a **draft quote** in `KeepProject.keepOrder`; choices are not proof of payment. The creator may change their selected tier as they create, but the production payment backend must ultimately verify the actual purchased tier, options and card quantities from a signed Stripe webhook, not from local storage, user-submitted project JSON or a query parameter.

## Critical release gate: purchase and fulfillment NOT live

`/shop` is a catalog preview, **not** an active checkout. Checkout remains **hard-disabled** even with Vercel environment variables. The creator can see order quotes and choose add-ons, but the app must not represent any of these as paid or fulfill any cards until verified orders exist.

The official Sites website is a **separate project**; its two-tier catalog and calculator were updated alongside this release. The original staged purchase-first PR #24 has a conflicting payment backend and must stay draft until reconciled.

Before opening payment, implement and test:
1. Server-generated Stripe Checkout Sessions using verified prices: Basic $79 / Signature $99; $19 per voice beyond one / two respectively; Basic included-card engraving $9; extra logo-only cards $39 or engraved cards $49. Charge engraving once only on Basic, and never charge the included card as an extra. Draft selections are not entitlements.
2. Stripe webhook signature validation, idempotent payment records, replay-safe event handling, discounts and refunds. Never grant creator access or mark orders paid from the redirect alone.
3. Associate the verified paid order and immutable line-item details with the Keep ID; reconcile order changes or additional speakers/cards added after initial checkout with a supplemental verified payment before fulfillment.
4. Database records for card quantity, individualized engraving fulfillment, one shared NFC viewing URL, shipping/tracking, and the admin fulfillment export. Every card needs a unique physical card identifier despite sharing the same Keep target.
5. Applicable tax registration and Stripe Tax configuration, United States shipping coverage and pricing for extra-card shipment weights, and complete end-to-end buy-to-creator-to-fulfillment tests.
6. Confirm the intended location for purchase in the customer journey: pre-creation tier payment vs post-creation add-on payment. Either way, no payable add-on should be provisioned from quote selections alone.

Do not switch on old Stripe Payment Links or the old Shopify route as a shortcut. Existing editor, drafts, published Keeps and NFC links must continue to work unchanged when payment is absent.

## Stripe catalog aligned on November 18, 2026

These live-mode catalog records are ready for the future verified checkout integration. No payment links were enabled, no payments were collected, and draft selections still do not grant paid entitlements.

| Item | Current price ID | Amount |
| --- | --- | --- |
| Basic | `price_1Ud7cMB5i8TaAgYDiHS6FTDB` | $79 |
| Signature | `price_1UbLcIB5i8TaAgYDZIWzpiYJ` | $99 |
| Additional voice | `price_1Ud7cOB5i8TaAgYDrZlbxBwO` | $19 |
| Basic engraving | `price_1Ud7cPB5i8TaAgYD25IenYbo` | $9 |
| Extra logo-only card | `price_1Uc7dXB5i8TaAgYDPQCWADAu` | $39 |
| Extra engraved card | `price_1Ud7crB5i8TaAgYDT1qDTuB3` | $49 |

Existing historical prices remain for history; do not use them for new checkout sessions. Product default prices, descriptions, voice allowances and retail-reference metadata were updated. The separate legacy Shopify listing is not the current app's payment path.
