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

---

## Evening verified audit addendum — Nov 19, 2026 ET

### Completed
- PR #85: improved iPhone recording durability, recovery, and non-blocking caption transition; production Vercel READY.
- PR #86: neutral new-Keep occasion/engraving defaults, removed founder-specific customer copy, fixed Re-record crash caused by undefined state setters, and improved account page title/copy; production Vercel READY.
- Automated tests: 54 suites, 257 tests passed. Mobile and desktop Chromium smoke checks: public /, /app, /shop and /?create=1 returned 200 with no observed runtime page errors, missing images or horizontal overflow. These checks were anonymous and not a full iPhone Safari voice-recording test.
- Stripe Keep live catalog matches approved November 19 prices: Basic $79, Signature $99, engraving $19, extra voice $19, logo-only extra card $39, engraved extra card $49, Signature bundles $139/$179/$249. Three old Payment Links are inactive. Retired Deluxe $129 price deactivated; historical transactions were not altered.
- Supabase database ACTIVE_HEALTHY, Edge Functions ACTIVE. No clusters in Vercel server-runtime errors during the inspected 24h period (browser errors may not be captured there).

### Must resolve before opening real checkout
1. Checkout remains deliberately disabled in the Vercel shop and guarded Supabase checkout function. Stripe shows zero Checkout Sessions and no configured webhook endpoints; a finished price catalog is not a verified working checkout.
2. Stripe Tax Settings show active but zero tax registrations. Establish actual tax obligations and registrations, then verify before launch.
3. Draft PR #68 verified checkout, webhook and fulfillment, and draft PR #45 purchase-first account/admin workflow, are not yet safely merged. Do not issue paid creation entitlements without verified events.
4. Old public.keep_submit_engravings RPC still rejects all Basic engraving and recognizes a second engraved card only for retired Deluxe. This conflicts with the $19 Basic engraving and multi-card Signature offerings. Fulfillment currently has only engraving_1 and engraving_2 fields; support for individualized engraving on unlimited cards requires proper per-card data modeling and end-to-end QA.
5. OpenAI Sites is the canonical official marketing site but its private editor is NOT controlled by this repository or this audit. Published Shop/Buy Now destinations, package copy, login and mobile experience still need direct authorized Sites-browser verification.
6. Final Shotstack 1080p MP4 rendering and file-size/storage verification remain intentionally on hold, not signed off.
7. Supabase advisor flags three authenticated-callable SECURITY DEFINER RPCs, leaked-password protection disabled, and remote service-only tables with RLS but no direct policies; inspect and secure deliberately, not by removing protections. Approximately 30 existing TypeScript diagnostics remain despite Vite production readiness.

### Historical / low priority
- Inactive legacy Stripe Payment Links point to /start, a route that now returns 404. They must remain inactive; new verified checkout must use valid completion URLs.
- Favicon is explicitly an SVG and serves correctly; the optional favicon.ico path returns 404.
- Do not reset customer Keeps, drafts, orders or historical financial records as part of maintenance.
- No live customer payment was initiated in this audit.
