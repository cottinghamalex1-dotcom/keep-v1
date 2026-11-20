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

---

## Launch readiness execution order — November 20, 2026

**Product decision:** Finish the phone-first creation and viewing experience and the separate OpenAI Sites storefront before buying hardware or making fulfillment promises. Stripe live payments remain off until the whole paid-order path is verified. Freeze nonessential feature additions while fixing failures.

### Phase 1 — Complete the creative MVP (release gate: all must pass on a real iPhone in Safari)
- [ ] Create a new Keep from blank and explicitly select occasion, recipient, relationship, and intention.
- [ ] Finish the AI interview for Birthday, Anniversary, Thank You and a sensitive remembrance scenario; confirm 8–10 relevant questions, original spoken wording, 2–3 minute target without fabricated memories.
- [ ] Finish "I know what I want to say": typed text and uploaded document; confirm editing, teleprompter, and re-record.
- [ ] Record a full narration; tap Finish; see persisted voice on return, refresh and sign-in; handle microphone denial and interrupted uploads without data loss.
- [ ] Add ~30 real phone photos and 1–2 short videos; verify compression, upload progress, ordering, playback and no black frames.
- [ ] Use caption sync, manual correction, music with beginning/end fades and audio volume balance; verify Watch, Listen & Read, Read.
- [ ] Verify 2 contributors: in-person and remote invite with remote uploaded media; creator approval, duplicate prevention and expiring invite behavior.
- [ ] Finish & share: same persistent private Keep URL, mobile NFC-compatible recipient viewing page, portrait/landscape and back/forward navigation; old drafts and Keeps still open after a reload.
- [ ] Establish a reliable 1080p rendered MP4 pipeline. Current Shotstack/Supabase size gate remains blocked; use a tested paid service tier or documented storage workaround rather than silently producing lower resolution or calling the old preview a final render.
- [ ] Test failure modes: low cellular bandwidth, recording interruptions, expired auth, storage full, upload retry, duplicate Finish clicks, and empty media/voice. Account must never mark unsaved work as complete.

### Phase 2 — Official OpenAI Sites storefront (separate private editor; requires authorized Sites editing session)
- [ ] Verify the actual published URL, not Vercel's /shop internal catalog. Keep the existing Site; no replacement or second public storefront.
- [ ] Hero: Keep logo, "Some things are worth keeping.", "Give them words they'll never forget.", premium physical card imagery, honest Buy Now/launch CTA.
- [ ] Exact two-tier copy: Basic $79 / Signature $99 (two voices, engraving); $19 engraving upgrade on Basic, $19 additional voices, $39/$49 extra cards; accurate Signature $139/$179/$249 matching-card bundles.
- [ ] Remove obsolete Deluxe/old pricing/payment links, duplicate menu items, unsubstantiated crossed-out prices/savings and overpromising delivery dates.
- [ ] Header and menu: logo left, Buy Now top right, small Menu label; navigation Shop, How it Works on page, Our Story, FAQs, Contact, Log in.
- [ ] Build a product-focused "How it works" section with physical card tap, private creation and phone playback; show only verified claims. No AI-generated people photography.
- [ ] Phone-first design test on iPhone Safari, Android Chrome, tablet, desktop; use sparse QR handoff where it helps.
- [ ] Validate every CTA, menu item, footer link, Login link to /app, accessible image, responsive design, terms/privacy and contact address.
- [ ] When payments are ready, connect the Sites Buy Now action to verified Stripe checkout, not to inactive Payment Links or an unpaid /?create=1 shortcut.

### Phase 3 — Verified commerce and fulfillment handoff
- [ ] Confirm the company's tax residence/nexus and add required Stripe Tax registration(s); verify tax for a representative address before live charge.
- [ ] Test new Stripe checkout with exact authoritative server-side cart totals in TEST mode: Basic, Signature, engraving, 2–3 voices, extra card styles, $139/$179/$249 bundles and cancellation/refund cases.
- [ ] Configure signed Stripe webhook, idempotent purchase recording, ownership, account provisioning/login, paywall, delivery details and error recovery.
- [ ] Replace retired Deluxe-centric engraving fulfillment with individual ordered-card records and true per-card customization; test 1/2/3/5+ card scenarios, common private link, admin order spreadsheet.
- [ ] Only enable LIVE checkout after successful test purchase, database association, card production approval and verified link redemption.

### Phase 4 — Physical production / shipping and public release
- [ ] Choose NFC metal cards proven to scan on current iPhone/Android, test engraving depth/contrast/durability and writing/locking NFC URLs.
- [ ] Buy and test a suitable laser engraver and appropriate ventilation/safety equipment; test one logo-only card, engraved card and card with custom opening message.
- [ ] Select premium card sleeve/box, insert explaining the tap, label printer/shipping supplies; test handling, inserts, weight, return address and mailing.
- [ ] Run a family/friend pilot with real 2–3 minute Keeps from purchase through recorded MP4, card programming and delivered gift; collect specific defects and fix critical failures.
- [ ] Prepare launch customer support, refund/returns and privacy pages, fulfillment lead times, analytics, error monitoring and order tracking.

**Definition of launch-ready:** A first-time customer can visit the official Site on a phone, purchase the correct package, receive a verified account entitlement, create and save a full Keep, return later, finish and preview a private playable 1080p film, approve the card, and receive an accurately personalized NFC product with working support and no manual repair to order records.

**Current hard blockers as of the audit:** official Sites not directly verified, full iPhone filmed run-through incomplete, final rendered MP4 unverified, checkout disabled/no configured webhooks, no Stripe Tax registrations, and Deluxe-era engraving code inconsistent with approved card packages.
