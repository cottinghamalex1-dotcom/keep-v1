# Keep sandbox film lab — full-length acceptance check

This is a private **preview-only** test built on the current production Keep app. It does not enable live Stripe checkout or replace the existing recipient player.

## Prerequisite

The active Supabase project is `lwkzhpwugtosbidxvdcr`. In **Supabase Dashboard > Edge Functions > Secrets** configure:
- `SHOTSTACK_API_KEY`: the **sandbox** key from Shotstack. Do not paste it into ChatGPT or commit it to GitHub.
- `SHOTSTACK_ENV`: `stage`

A read-only backend GET probe checks whether the stage key authenticates. The preview film lab displays that status, and **disables the render button** unless authenticated. The key stays server-side. Do not use a production Shotstack key for this test.

## End-to-end sandbox test

1. Open the branch's Vercel preview of `/?create=1`. Sign into your own Keep test account.
2. Create a full-length Keep (~2–3 minutes) using an interview or written message, record one or two voices, upload 25+ photos and a short video, add music and captions, preview, publish to a test NFC link.
3. On the same preview host, visit `/render-test`. The Keep Film Lab checks the Shotstack sandbox connection.
4. Select the published test Keep. Click **Render sandbox MP4** exactly once and follow real stage job status to **ready**. Do not retry an already-active job.
5. Watch the **actual MP4** on iPhone Safari and desktop. Scrub in both directions; test fullscreen, pause, resume, and overall audio volume. Check dark title/dedication, timing of voice/captions, photo fades, silent video clip, music fade/ducking/loop, and complete farewell.
6. Inspect `keep_render_jobs` for the matching revision, and verify the private `keep-media` MP4 is signed and accessible. The stored revision must match the current published project; do not expose raw storage URLs.
7. Test an older previously published Keep. The existing viewer and permanent NFC link must remain functional.
8. Record observed issues. Do not enable production Shotstack until a verified full-length MP4 passes; do not promote the preview merely because CI is green.

## Deployment

Preview only for `feature/keep-film-lab-current-app-20261119`. `VITE_KEEP_SHOTSTACK_ENABLED=true` is scoped to that preview branch. The production Vercel app must not inherit the flag. This lab is separately protected from the full Shotstack editor Done/saving integration in PR #64.

## Payment and official Site

Live Stripe checkout remains disabled. Customers will eventually buy on the **OpenAI Site**, with Secure Stripe Checkout and a verified purchase-to-creator handoff to the Vercel app. No user should shop on the Vercel `/shop` route.
