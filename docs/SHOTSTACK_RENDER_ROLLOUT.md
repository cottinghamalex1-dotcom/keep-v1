# Shotstack render rollout — intentionally inactive until QA

**Current status:** Code is in this feature branch. Keep's production published-player behavior is unchanged. The Shotstack credential was not present, so NO real MP4 render was completed or verified.

## Technical sequence

1. Editor **Finish & share** publishes the validated Keep to its permanent token (existing behavior).
2. With feature flag enabled, success screen calls the authenticated \`keep-render\` Supabase Edge Function once per published project revision.
3. Edge authenticates owner, rejects invalid source paths, signs private photo/video/voice objects for the renderer, creates a revision-keyed database job, then sends the edit JSON to Shotstack.
4. Shotstack combines a **dark personal dedication**, 1080 × 1920 / 30 fps scenes, captions synchronized to voice, music bed with fades/ducking/loops, and a **dark farewell** into one H.264-compatible MP4.
5. Client polls *actual* provider status, not a simulated percent. On provider success, the Edge Function streams the MP4 into private \`keep-media\` storage, verifies storage access and marks the exact revision \`ready\`. Provider failure preserves existing viewing.
6. \`keep-publish\` resolve signs that private MP4 only if its revision hash equals the current published project. Recipient Watch prefers the complete single MP4, with native fullscreen/scrub controls and automatic legacy fallback on video load failure. Listen, Read, gallery, and the permanent token do not change.
7. Every Watch replay begins with the **A Keep for…** cover, then the dark film dedication and farewell, then the separate completion page.

## Activate in this order

- [ ] Obtain a **Shotstack sandbox API key**; save as \`SHOTSTACK_API_KEY\` under Supabase **Edge Functions > Secrets**, never in GitHub, client code, or chat. Add \`SHOTSTACK_ENV=stage\`.
- [ ] Apply migration \`supabase/keep-render-jobs.sql\` once; confirm RLS allows creator SELECT but forbids browser writes.
- [ ] Deploy new function \`supabase/functions/keep-render\` to the correct Supabase project. Keep authorization/JWT checks enabled. Test auth rejections.
- [ ] Deploy updated \`supabase/functions/keep-publish\` (with schema.ts) so it can resolve the ready revision MP4.
- [ ] From a test creator account, run a full **sandbox** render with real private images, 10-second video, music and narration. Confirm \`keep_render_jobs.status=ready\` only after MP4 is uploaded and a private signed URL works.
- [ ] Inspect and listen to the actual output end-to-end on iPhone Safari and Chrome: opening title remains readable, music precedes voice, captions start with narration, video is muted, no black gaps, photo focus/zoom correct, music loops and ducks, final letter/farewell and transition feel intentional.
- [ ] Verify the source files are still private, expiring provider URLs are NOT used as permanent links, older Keeps play as before, and republishing never serves a stale revision.
- [ ] Verify expected costs, sandbox rate limits, provider API errors, retry/idempotency, mobile autoplay behavior and stream-to-storage limits for **full 2–3 minute MP4s**. Edge streaming ingestion must be confirmed at production file size; move ingestion to a dedicated worker if Edge limits are reached.
- [ ] Set Vercel \`VITE_KEEP_SHOTSTACK_ENABLED=true\` in preview and run end-to-end tests; production must remain false until verified.
- [ ] Configure separate Shotstack production key, \`SHOTSTACK_ENV=production\`, and only then promote the guarded feature.

## Stop/rollback

Unset \`VITE_KEEP_SHOTSTACK_ENABLED\` and redeploy frontend; the existing Keep viewer/links remain functional. A render failure must not invalidate a token, replace a published manifest, or claim an MP4 is ready. The render backend has no authority to change the original recording or photos.

**Important:** GitHub/Vercel CI passing validates the frontend/test code, NOT Shotstack's remote rendering or a full-length MP4. No API key or verified output was available during this change.
