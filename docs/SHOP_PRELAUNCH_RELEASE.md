# Keep prelaunch catalog

`/shop` is an optional catalog preview, not an active purchasing experience. The Basic $69 (one logo card), Signature $99 (one custom-engraved card), and Deluxe $129 (two custom-engraved cards) packages can be viewed, but checkout is **intentionally hard-disabled** even if someone changes a Vercel environment variable. No purchase entitlement is granted.

The existing official Sites storefront remains a separate project. The original staged purchase-first PR #24 includes a conflicting payment backend and must stay draft until Stripe webhook verification, database fields, per-card engraving, shipping/fulfillment, tax registration and real purchase-to-creator tests pass. Do not activate Stripe Payment Links or the old Shopify route while these prerequisites remain incomplete.

The digital Keep editor, existing saved Keeps and NFC viewing links are deliberately unchanged by this prelaunch catalog release.
