# Keep two-tier prelaunch catalog and checkout release gate

The /shop preview now presents **two** packages:

- **Basic $69**: one logo-only black metal NFC card, one digital Keep, and one included creator. Each additional speaker costs **$9**. At the end of creation a once-per-Keep opt-in offers engraved front personalization at **$14.99** (regularly **$30**).
- **Signature $99**: one engraved card and one digital Keep, with **all collaborators/voices included** at no additional charge.
- **Both tiers**: any number of additional cards linking to the **same Keep** for **$39 per card**. The first card is included. Each extra card inherits the chosen base product's engraving style, including the Basic paid engraving selection where applicable. Extra cards represent additional physical items, not additional digital Keep entitlements. Standard U.S. shipping is included in the base tier; taxes may be added when payment is enabled.
- **Deluxe is retired**; Stripe retains its historical product record (now inactive). Existing payment links for all tiers remain inactive.

Shared pricing calculation lives at `src/lib/keep-pricing.ts`. The editor holds selected options as a **draft quote** in `KeepProject.keepOrder`; choices are not proof of payment. The creator may change their selected tier as they create, but the production payment backend must ultimately verify the actual purchased tier, options and card quantities from a signed Stripe webhook, not from local storage, user-submitted project JSON or a query parameter.

## Critical release gate: purchase and fulfillment NOT live

`/shop` is a catalog preview, **not** an active checkout. Checkout remains **hard-disabled** even with Vercel environment variables. The creator can see order quotes and choose add-ons, but the app must not represent any of these as paid or fulfill any cards until verified orders exist.

The official Sites website remains a **separate project** and is not changed by this repository's `/shop` preview. The original staged purchase-first PR #24 has a conflicting payment backend and must stay draft until reconciled.

Before opening payment, implement and test:
1. Server-generated Stripe Checkout Sessions that build line items from verified server prices for the base tier plus, for Basic only, $9 x additional contributors and one $14.99 engraving. For both tiers, $39 x additional physical cards. Do not bill Signature for collaborators or engraving.
2. Stripe webhook signature validation, idempotent payment records, replay-safe event handling, discounts and refunds. Never grant creator access or mark orders paid from the redirect alone.
3. Associate the verified paid order and immutable line-item details with the Keep ID; reconcile order changes or additional speakers/cards added after initial checkout with a supplemental verified payment before fulfillment.
4. Database records for card quantity, individualized engraving fulfillment, one shared NFC viewing URL, shipping/tracking, and the admin fulfillment export. Every card needs a unique physical card identifier despite sharing the same Keep target.
5. Applicable tax registration and Stripe Tax configuration, United States shipping coverage and pricing for extra-card shipment weights, and complete end-to-end buy-to-creator-to-fulfillment tests.
6. Confirm the intended location for purchase in the customer journey: pre-creation tier payment vs post-creation add-on payment. Either way, no payable add-on should be provisioned from quote selections alone.

Do not switch on old Stripe Payment Links or the old Shopify route as a shortcut. Existing editor, drafts, published Keeps and NFC links must continue to work unchanged when payment is absent.
