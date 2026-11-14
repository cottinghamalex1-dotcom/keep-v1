# Keep: finished-film rendering after Done

## Product decision

**Done means freeze an exact edit revision and begin producing a real, single-file video.** The editor can continue using the current responsive preview, but the recipient's **Watch** experience must prefer a fully rendered private **MP4 (H.264 video + AAC audio)**. The MP4 is not optional simulated progress: a completed render must be verified and durably stored before the new version becomes shareable.

Keep's current production flow (`src/routes/index.tsx` -> `publishKeep` -> Supabase `keep-publish` -> `KeepPlayer`) saves media sources and a JSON edit manifest. It **does not render** an MP4. The new `buildKeepRenderPlan` module in this branch is the deterministic foundation; it does not yet generate, upload, or serve video.

## User experience

1. User taps **Done** in the editor. Freeze a revision hash and validate that photos/videos, caption cues, final voice recording and selected soundtrack are present. Do not create a final link for a new revision until it is ready.
2. Show a premium **Preparing your Keep** screen with honest stages: saving moments, mixing sound, rendering film, final quality check. Report *actual* server job progress, not a fake percentage. Let the user leave and resume, and preserve the draft on failure.
3. Upload private sources once (reuse selfie videos referenced twice), queue rendering, and persist a status record. Retry transient failures without duplicating billable jobs. Only one active job per revision.
4. When the MP4 has uploaded and passed verification, atomically mark the exact revision **ready** and update its permanent link. Revisions must not overwrite the last good video until the new one succeeds.
5. Recipients selecting **Watch** see one standard video element with native seeking, buffering, pause and resume. Preserve Keep's personalized opening/reveal UI and separate **Listen** and **Read** experiences. Legacy published Keeps continue playing through the existing dynamic player until migrated.
6. Preserve the purchase/paywall entitlement checks: no unpurchased full playback or premature share just because rendering completed. Decide when to charge for abandoned renders before enabling high-volume production.

## Rendering contract

`src/lib/keep-render-plan.ts` expresses one master clock; a dedicated trusted **server-side render worker** must consume it.

- Portrait **1080 × 1920**, **30 fps**, MP4 H.264 + AAC; encode for iOS Safari/Android/Desktop compatibility and HTTP range-seekable playback (`+faststart`).
- Narration starts **2.8 seconds** into the film, after a music-only opening; hold the first real photo/video during the opening. No black title card.
- Picture boundaries match `sceneBoundary` and `sceneDuration` for the complete voice recording. The last moment stays visible through the music ending (currently 4.5 seconds after narration). No blank canvas between clips.
- Render photo motion (pan/zoom/left/right), selected visual grade, focus/crop, configured transitions, and selfies; short video clips must be decoded/transcoded before composing. Mute source-video sound: its recorded audio has already been incorporated into the final voice track.
- Burn captions into frames according to recorded timing **plus the 2.8-second lead**. Match the selected font/size/position, honor line count, display nothing before speech or across silent gaps, and ensure all cues end on time. Never assume text playback timing from character count.
- Loop the chosen licensed audio file seamlessly for long Keeps. Mix the original recorded voice once; honor voice/music volumes, user mute, voice-tone treatment, ducking under the voice, and the exact fade-envelope timings from `keep-audio.ts`. Music rises again after the final words and fades before the last frame. Do **not** fade out an MP3's built-in ending mid-sentence.
- Retain original drafts and original source files for edits. Never delete the last successful MP4 while rendering a replacement.

## Production components to implement

**Renderer:** Use an async worker with a full video toolchain (e.g. Remotion + FFmpeg running on AWS Lambda, a dedicated worker, or a managed video compositor). **Do not** put a 2–3 minute render inside a Supabase Edge Function or rely on foreground iPhone `MediaRecorder`; both jeopardize reliability. A paid provider/compute target and its credentials must be explicitly configured, reviewed and tested first.

**Backend:** authenticated, rate-limited `render/start` plus `render/status` (and server-only completion callback). Validate ownership and input paths server-side; generate short-lived signed source URLs only for the worker. Keep renderer secrets and service-role keys out of browser bundles. Use a durable job row keyed by `(keep_id, revision_hash)` with queued/processing/ready/failed status, rendering provider ID, retry count, error, and verified private MP4 path. Verify output size, codec, resolution, duration, and playback. The callback must reject stale revisions and be idempotent. Restrict RLS to owner and internal worker; private objects have no public list/read.

**Publication:** only publish the new revision after verified video upload; do not mutate an existing `published_project` until its new MP4 is ready. An already-shared NFC URL must keep working during an update. Signed video URL issuance belongs in the existing token-resolve endpoint. Do not put raw storage paths or auth tokens in page source or share links.

**Frontend:** Done starts the job exactly once and routes to progress. A resumed session polls status with bounded backoff; provide clear retry, no repeated charge on refresh, and a graceful network-disconnected state. When ready, the recipient Watch mode receives `renderedVideoUrl` and plays only that URL; Listen and Read still use the separate recorded voice and transcript. A previous legacy Keep without an MP4 uses the existing player.

**Cost control:** Managed rendering is metered. At example public pay-as-you-go pricing of about $0.20 per minute, a 2–3 minute Keep can cost roughly $0.40–$0.60 before storage/traffic. Obtain business approval for provider/billing and connect credentials before activation.

## Release gates

Do not label this feature live, nor switch the Done behavior, until all are verified:
- [ ] A 2–3 minute Keep with 30–45 photos, at least two videos and selfie clip renders to a valid single MP4.
- [ ] No blank/black frames, frozen video frames, skipped photos or visible transition seams at every scene boundary.
- [ ] No voice before music, no duplicate voice, loop glitch, sudden volume spike, clipping, or music ending while speech continues.
- [ ] Every caption cue begins/ends at the correct spoken timestamp, including pauses and final words.
- [ ] Direct playback + seek + pause/resume succeeds on iPhone Safari, Chrome Android, desktop Safari/Chrome, and weak mobile data.
- [ ] Killing the browser mid-render does not cancel server job; returning to My Keeps shows exact progress or finished film.
- [ ] Failed jobs preserve drafts, files and the last working NFC/viewing link; retries cannot publish stale revisions.
- [ ] An unauthorized user cannot read a draft or rendered video by guessing a storage path; recipient tokens only expose the published, paid revision.
- [ ] Tests and build pass, Supabase access policies and secrets are reviewed, production staging is played end to end, then the verified deployment is promoted.

## Current branch scope

This branch intentionally adds **only** the deterministic render-plan helper and regression tests. It does **not** activate rendering or claim that Done now produces an MP4. Wiring the worker and storage, plus provider configuration, remains blocking work before a real release.
