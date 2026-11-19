# OpenAI Sites ↔ Keep creator app: launch integration and release audit
Date: 2026-11-19

## Architecture — one public storefront, one application
- **OpenAI Sites** is the canonical customer-facing marketing website and product/package selection.
- **Vercel** (the `keep-v1` GitHub project) is the interactive Keep creation, recording, editing, viewing and authenticated account application. `/shop` is a non-promoted internal staging/catalog route, **not a second customer acquisition storefront**.
- **Stripe** handles paid checkout; **Supabase** handles user identity, verified purchase association, private memories, published Keeps, and fulfillment state.
- The public site must link to the Vercel app only for relevant actions: **Log in / Continue editing** → `https://keep-v1.vercel.app/app`; **Create a Keep** (after verified purchase handoff) → `https://keep-v1.vercel.app/?create=1`. The latter remains a prelaunch demonstration link until secure payment-to-creator handoff is activated.
- Avoid any duplicate checkout/cart/catalog page being promoted at `keep-v1.vercel.app/shop`. Do not remove `/shop` until app navigation, internal support links and any preview tests are moved to the official Sites route.
- Future branded `app.` subdomain can replace `keep-v1.vercel.app` after ownership and DNS configuration. Do not invent or redirect to a nonexistent custom domain.

## Exact public-facing package display (approved)
**Basic Keep — $79**
“A meaningful gift, made personal.”
- 1 matte-black NFC card
- 1 voice
- Your finished memory film
- Standard U.S. shipping
Fine print: “Engraving and additional voices available.”

**Signature Keep — $99** — label **Recommended · Best value** (not “Most popular” without sales evidence).
“Make it even more personal.”
- Everything in Basic
- Personalized engraving included
- 2 voices included
- Create together or remotely
Closing value copy: “The complete gift for just $20 more.”

Each package includes a small realistic matte-black Keep card representation. On desktop use two aligned, legible pricing cards, with Signature subtly visually dominant; on mobile, display Signature prominently without hiding Basic. No unsupported crossed-out original prices, discount or savings claims.

## Add-ons and matching-card bundles (consistent with live Stripe catalog)
- Basic engraving on included card **$19**; at that point offer **Signature for $99**, only $1 more than Basic with engraving.
- Additional contributor voice **$19** after Basic's first or Signature's second.
- Additional logo-only card **$39**; additional engraved card **$49**.
- Signature matching personalized engraved card bundles: **2 cards total $139; 3 total $179; 5 total $249** (each price already includes the $99 Signature card and its two included voices).
- Signature matching engraved extras for other quantities follow the shared `src/lib/keep-pricing.ts` calculator. Every card links to the SAME finished Keep.
- Do not show upgrade options prematurely. Ask for voices when adding contributors; engraving near card personalization; matching-card bundle at finishing/physical cards.
- Site cart totals and Stripe server checkout must agree. Do not make the site charge an independent Bundle price *plus* $99 Signature.

## Navigation and mobile handoff
- Keep logo left, hamburger right; editorial full-height menu with Shop/Packages, How it Works (on-page section), Our Story, FAQs, Contact, Log in.
- Homepage hero: “Some things are worth keeping.” with “Give them words they’ll never forget.” and Buy Now CTA once payment is ready.
- Strategic, sparse phone-first suggestions for media selection and recording; offer a QR handoff to continue on a smartphone from desktop.
- For guests who have never purchased, explain the purchase-first account step instead of implying checkout/account entitlement is already enforced.
- Do not enable unsupported backend-dependent functions or advertise an active paid checkout.

## Current GitHub release audit — November 19
**Merged and production-deployed:** PRs #55–63, #65–67, #69–75: interview guidance, quality-first media, playback fixes, cinematic experience, fullscreen, remote capture, teleprompter improvements, faster uploads, QR phone handoff, site menu/catalog improvements, and approved pricing. PR #64 is an exception; it remains open.
**Safe UI restored from open PR #64 in separate release:** grouped “Who is this Keep for?” categories (including Parent and In-Law), legacy Mom/Dad/custom draft continuity, neutral loading for ordinary navigation, detailed Keep restoration only when truly restoring a Keep, direct dashboard entry from plain `/`. No Shotstack functions are enabled by these changes.
**Still intentionally unreleased:**
- #64 Shotstack MP4 final rendering, saving interstitial, persistent scrubbable rendered-video viewer; requires real full-length sandbox MP4 and private video playback/ingestion QA before merge.
- #68 server-side verified Stripe checkout and fulfillment; price/quote code staged, live checkout intentionally locked pending test-mode purchase, tax and webhook verification.
- #45 customer purchase-first login, admin/support studio; draft, includes obsolete Deluxe assumptions, must rebase to two-tier pricing and secure payment verification.
- #24 historical Basic $69 / Signature $99 / Deluxe $129 three-tier purchase flow; superseded, never merge into launch.

## Operations
This repository does not control the private **OpenAI Sites** project's editor. Synchronize the official Site through its native editor or authorized browser workflow; **a change to Vercel /shop does not update OpenAI Sites**. Do not mark Sites copy as deployed without direct verification of the Sites preview and published URL.

Preflight: verify on iPhone Safari that all relationship group buttons appear, the chosen state works, older drafts reopen, home/account/My Keeps show a neutral loader, edit/resume shows personal restoration, no broken payment links are offered, and official Site and Stripe content agree before public launch.
