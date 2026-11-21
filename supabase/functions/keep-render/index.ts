import { createClient } from "npm:@supabase/supabase-js@2";
import { buildShotstackEdit, type ShotstackSources } from "./shotstack.ts";

const endpoint = Deno.env.get("SUPABASE_URL")!;
const admin = createClient(endpoint, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization,apikey,content-type",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};
const reply = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "private, no-store" },
});
const fail = (error: string, status = 400) => reply({ error }, status);
const uuid = (s: unknown): s is string => typeof s === "string" && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(s);
const t = (v: number) => Math.round(v * 1000) / 1000;
const MUSIC: Record<string, string> = {
  Intentional: "intentional", "Warm + Nostalgic": "warm-nostalgic", Joyful: "joyful",
  Cinematic: "cinematic", Romantic: "romantic", Hopeful: "hopeful",
  Playful: "playful", Reflective: "reflective", Acoustic: "acoustic", Piano: "piano",
};
const providerBase = () => "https://api.shotstack.io/edit/" +
  (Deno.env.get("SHOTSTACK_ENV") === "production" ? "v1" : "stage");
const providerCall = async (path: string, init: RequestInit = {}) => {
  const secret = Deno.env.get("SHOTSTACK_API_KEY");
  if (!secret) throw new Error("Shotstack has not been configured in server secrets.");
  const result = await fetch(providerBase() + path, {
    ...init,
    headers: { "x-api-key": secret, "Content-Type": "application/json" },
  });
  if (!result.ok) throw new Error("Shotstack could not process this render request.");
  return await result.json();
};
const hashOf = async (project: unknown) => Array.from(new Uint8Array(await crypto.subtle.digest(
  "SHA-256", new TextEncoder().encode(JSON.stringify(project)),
))).map(n => n.toString(16).padStart(2, "0")).join("");

/** Server-only equivalent of Keep's canonical render-plan clock. */
function planFromProject(p: Record<string, unknown>) {
  const moments = p.memories as Array<Record<string, unknown>>;
  const voiceDuration = Number(p.voiceDuration);
  if (!Array.isArray(moments) || moments.length < 1 || moments.length > 300 ||
    !Number.isFinite(voiceDuration) || voiceDuration <= 0 || voiceDuration > 7200)
    throw new Error("This Keep has no valid recording or photos.");
  const lengths = moments.map(m => Number(m.displayDurationSec) > 0 ? Math.max(0.6, Number(m.displayDurationSec)) : 7);
  const total = lengths.reduce((a,b) => a + b, 0);
  const lead = 2.8, tail = 4.5;
  let cursor = 0;
  const scenes = moments.map((m, i) => {
    const activeStartSec = i === 0 ? 0 : lead + cursor;
    cursor += lengths[i]! / total * voiceDuration;
    const activeEndSec = i === moments.length - 1 ? lead + voiceDuration + tail : lead + cursor;
    const transitionIn = i === 0 || m.transition === "cut" ? 0 : 0.3;
    const transitionOut = i === moments.length - 1 || moments[i + 1]?.transition === "cut" ? 0 : 0.3;
    return {
      sourcePath: String(m.storagePath ?? ""), kind: String(m.kind) as "image" | "video",
      startSec: t(Math.max(0, activeStartSec - transitionIn)), endSec: t(activeEndSec + transitionOut),
      activeStartSec: t(activeStartSec), activeEndSec: t(activeEndSec),
      dissolveInSec: transitionIn, dissolveOutSec: transitionOut,
      videoStartSec: Number(m.videoStartSec ?? 0), muted: true as const,
      motion: String(m.motion ?? ["in", "left", "out", "right"][i % 4]) as "in" | "out" | "left" | "right",
      focusX: Number(m.focusX ?? 50), focusY: Number(m.focusY ?? 50),
      zoom: Number(m.zoom ?? 1), visualStyle: String(p.visualStyle ?? "Natural"),
    };
  });
  const cues = Array.isArray(p.captionCues) ? p.captionCues as Array<Record<string, unknown>> : [];
  const captions = p.captionStyle === "None" ? [] : cues.flatMap(cue => {
    const start = Math.max(0, Math.min(voiceDuration, Number(cue.start)));
    const end = Math.max(0, Math.min(voiceDuration, Number(cue.end)));
    return end > start && String(cue.text ?? "").trim() ?
      [{ text: String(cue.text).trim(), startSec: t(lead + start), endSec: t(lead + end) }] : [];
  });
  return {
    durationSec: t(lead + voiceDuration + tail),
    voice: { sourcePath: String(p.voicePath), startSec: lead, endSec: t(lead + voiceDuration),
      volume: Number(p.voiceVolume ?? 60) / 100, muted: Boolean((p.audioMix as Record<string, unknown> | undefined)?.voiceMuted) },
    music: { balance: String(p.voiceMusicBalance ?? "Balanced"), volume: Number(p.musicVolume ?? 60) / 100,
      muted: Boolean((p.audioMix as Record<string, unknown> | undefined)?.musicMuted) },
    scenes, captions, captionStyle: String(p.captionStyle ?? "Reel"),
    captionPosition: p.captionPosition === "top" ? "top" as const : p.captionPosition === "middle" ? "middle" as const : "bottom" as const,
  };
}
type Job = { id: string; status: string; provider_render_id: string | null; revision_hash: string;
  expected_duration_seconds: number; render_path: string | null; error_message: string | null };
const publicStatus = (job: Job) => ({ id: job.id, status: job.status, error: job.error_message ?? undefined });
/** Only the authenticated creator may receive this short-lived private test URL. */
async function ownerStatus(job: Job) {
  if (job.status !== "ready" || !job.render_path) return publicStatus(job);
  const { data, error } = await admin.storage.from("keep-media").createSignedUrl(job.render_path, 1800);
  return { ...publicStatus(job), ...(error || !data?.signedUrl ? {} : { videoUrl: data.signedUrl }) };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  // Read-only sandbox credential check. Does not submit or charge for a render,
  // and never returns the API key or private project information.
  if (req.method === "GET") {
    const key = Deno.env.get("SHOTSTACK_API_KEY");
    if (!key) return reply({ sandbox: "not_configured" }, 503);
    try {
      const probe = await fetch("https://api.shotstack.io/edit/stage/models", {
        headers: { "x-api-key": key, "Accept": "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      return reply({ sandbox: probe.ok ? "authenticated" : "authentication_failed" }, probe.ok ? 200 : 503);
    } catch {
      return reply({ sandbox: "unreachable" }, 503);
    }
  }
  if (req.method !== "POST") return fail("Method not allowed.", 405);
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return fail("Sign in before rendering.", 401);
  const { data: userResult, error: userError } = await admin.auth.getUser(auth.slice(7));
  const owner = userResult?.user?.id;
  if (userError || !owner) return fail("This session has expired.", 401);
  let request: Record<string, unknown>;
  try { request = await req.json(); } catch { return fail("Invalid request."); }
  if (!uuid(request.keepId)) return fail("Invalid Keep ID.");
  const keepId = request.keepId;
  const { data: keep } = await admin.from("keeps").select("id,owner_id,published_project")
    .eq("id", keepId).eq("owner_id", owner).maybeSingle();
  if (!keep?.published_project || Object.keys(keep.published_project).length === 0)
    return fail("Publish the Keep before rendering.", 404);
  const project = keep.published_project as Record<string, unknown>;
  const paths = [...(Array.isArray(project.memories) ? project.memories.map((m: Record<string, unknown>) => String(m.storagePath)) : []), String(project.voicePath ?? "")];
  const prefix = owner + "/publications/" + keepId + "/";
  if (paths.length < 2 || paths.some(p => !p.startsWith(prefix) || !/^[-a-zA-Z0-9/]+$/.test(p)))
    return fail("The Keep sources could not be validated.", 403);
  const revision = await hashOf(project);
  const { data: found } = await admin.from("keep_render_jobs").select("*")
    .eq("keep_id", keepId).eq("owner_id", owner).eq("revision_hash", revision).maybeSingle();
  const job = found as Job | null;
  if (request.action === "status") {
    if (!job) return reply({ status: "not_started" });
    if (job.status === "ready" || job.status === "failed" || !job.provider_render_id)
      return reply(await ownerStatus(job));
    try {
      const result = await providerCall("/render/" + encodeURIComponent(job.provider_render_id));
      const shot = result?.response;
      if (shot?.status === "failed") {
        await admin.from("keep_render_jobs").update({
          status: "failed", error_message: "Shotstack could not complete the film.", updated_at: new Date().toISOString(),
        }).eq("id", job.id);
        return reply({ id: job.id, status: "failed", error: "Rendering failed; your existing Keep remains available." });
      }
      if (shot?.status !== "done") return reply({ id: job.id, status: "rendering", providerStatus: String(shot?.status || "queued") });
      if (typeof shot.url !== "string" || !shot.url.startsWith("https://"))
        throw new Error("The finished video was not available.");
      if (Math.abs(Number(shot.duration) - Number(job.expected_duration_seconds)) > 3)
        throw new Error("The finished film duration did not match this Keep.");
      const head = await fetch(shot.url, { method: "HEAD" });
      // Supabase Pro: permit full-resolution films while staying below the 500 MB bucket limit.
      const MAX_MP4_BYTES = 450_000_000;
      const length = Number(head.headers.get("content-length"));
      if (head.ok && length > MAX_MP4_BYTES) {
        throw new Error("The 1080p MP4 is " + (length / 1_000_000).toFixed(1) + " MB, above the 450 MB storage safety limit. No upload was attempted.");
      }
      const video = await fetch(shot.url);
      const actualLength = Number(video.headers.get("content-length"));
      if (actualLength > MAX_MP4_BYTES) {
        await video.body?.cancel();
        throw new Error("The 1080p MP4 is " + (actualLength / 1_000_000).toFixed(1) + " MB, above the 450 MB storage safety limit. No upload was attempted.");
      }
      if (!video.ok || !video.body) throw new Error("The finished video could not be retrieved.");
      const path = owner + "/publications/" + keepId + "/renders/" + revision + ".mp4";
      // Streaming upload avoids intentionally buffering entire movies in the Edge Function.
      const { error } = await admin.storage.from("keep-media").upload(path, video.body, {
        upsert: false, contentType: "video/mp4", cacheControl: "3600",
      });
      if (error && !/already exists|duplicate/i.test(error.message))
        throw new Error("The finished video could not be stored: " + error.message);
      const { data: verified, error: verifyError } = await admin.storage.from("keep-media").createSignedUrl(path, 60);
      if (verifyError || !verified?.signedUrl) throw new Error("The saved video could not be verified.");
      const { error: updateError } = await admin.from("keep_render_jobs").update({
        status: "ready", render_path: path, error_message: null, updated_at: new Date().toISOString(),
      }).eq("id", job.id).eq("status", "rendering");
      if (updateError) throw new Error("The completed film could not be finalized.");
      return reply(await ownerStatus({ ...job, status: "ready", render_path: path }));
    } catch (cause) {
      // Stop the endless verifying loop. Retain the Shotstack render ID so the
      // existing completed MP4 can be recovered without another paid render.
      const detail = cause instanceof Error ? cause.message : "Unknown storage error";
      const tooLarge = /EntityTooLarge|Payload too large|maximum allowed size|exceeded.*size/i.test(detail);
      const message = detail.includes("above the 450 MB storage safety limit") ? detail
        : tooLarge
        ? "The finished MP4 exceeds the Supabase global upload limit. Raise Storage Settings > Global file size limit, then select Retry saving existing MP4. Shotstack does not need to render it again."
        : "The finished MP4 could not be saved: " + detail.slice(0, 220) + ". Select Retry saving existing MP4 after fixing the issue.";
      await admin.from("keep_render_jobs").update({
        status: "failed", error_message: message, updated_at: new Date().toISOString(),
      }).eq("id", job.id);
      return reply({ id: job.id, status: "failed", error: message });
    }
  }
  if (request.action === "recover") {
    if (!job?.provider_render_id || job.status !== "failed")
      return fail("No failed Shotstack render is available to recover.", 409);
    const { error } = await admin.from("keep_render_jobs").update({
      status: "rendering", error_message: null, updated_at: new Date().toISOString(),
    }).eq("id", job.id).eq("status", "failed");
    if (error) return fail("Could not resume saving the existing MP4.", 503);
    return reply({ id: job.id, status: "rendering", providerStatus: "recovering" });
  }
  if (request.action !== "start" && request.action !== "retry") return fail("Unknown action.", 404);
  if (job && request.action === "start") return reply(await ownerStatus(job));
  if (request.action === "retry" && (!job || job.status !== "failed"))
    return reply(job ? await ownerStatus(job) : { status: "not_started" });
  // An explicit user retry can resubmit a failed revision. Never retry a
  // still-active job: that could generate duplicate billable videos.
  if (request.action === "retry" && job) {
    const { data: reset, error: resetError } = await admin.from("keep_render_jobs")
      .update({ status: "queued", provider_render_id: null, error_message: null,
        updated_at: new Date().toISOString() })
      .eq("id", job.id).eq("status", "failed").select("id").maybeSingle();
    if (resetError || !reset) return fail("The saved film couldn't be restarted. Please try again.", 409);
  }
  if (!Deno.env.get("SHOTSTACK_API_KEY"))
    return fail("Rendering is not enabled yet. Your existing Keep is still available.", 503);
  // Legacy whole-file caption recovery can space every phrase uniformly.
  // Never spend a render on those visibly unsynchronized captions.
  const cues = Array.isArray(project.captionCues) ? project.captionCues as Array<{start:number;end:number}> : [];
  if (project.captionStyle !== "None" && cues.length > 12) {
    let uniformOverlaps = 0;
    for (let i = 1; i < cues.length; i++) {
      const overlap = Number(cues[i - 1]?.end) - Number(cues[i]?.start);
      if (overlap >= 0.075 && overlap <= 0.135) uniformOverlaps++;
    }
    if (uniformOverlaps >= (cues.length - 1) * 0.85) {
      return fail("These captions were spaced approximately, not aligned to your recorded voice. Reopen the Keep, re-sync Captions, and publish again before rendering. Your Keep is still safe.", 409);
    }
  }
  if (project.audioMix && typeof project.audioMix !== "object")
    return fail("The selected audio settings are invalid.");
  const mood = String(project.musicMood === "Worth Keeping" ? "Intentional" : project.musicMood);
  if (!MUSIC[mood] && !(project.audioMix as Record<string, unknown> | undefined)?.musicMuted)
    return fail("The selected soundtrack is unavailable.");
  const musicDurationSec = Number(request.musicDurationSec);
  if (MUSIC[mood] && !((project.audioMix as Record<string, unknown> | undefined)?.musicMuted) &&
      (!Number.isFinite(musicDurationSec) || musicDurationSec < 30 || musicDurationSec > 900))
    return fail("The selected music file duration must be checked before rendering.");
  let renderPlan;
  try { renderPlan = planFromProject(project); } catch { return fail("The Keep timeline is incomplete."); }
  const intro = Math.min(14, Math.max(7.5, 5.5 + String(project.openingMessage ?? "").trim().length / 26));
  const expected = t(renderPlan.durationSec + intro - renderPlan.voice.startSec);
  let insertedId: string;
  if (request.action === "retry" && job) {
    insertedId = job.id;
  } else {
    const { data: inserted, error: insertError } = await admin.from("keep_render_jobs").insert({
      keep_id: keepId, owner_id: owner, revision_hash: revision, expected_duration_seconds: expected,
      status: "queued",
    }).select("id").single();
    if (insertError || !inserted) {
      const { data: existing } = await admin.from("keep_render_jobs").select("*")
        .eq("keep_id", keepId).eq("revision_hash", revision).eq("owner_id", owner).maybeSingle();
      return existing ? reply(publicStatus(existing as Job)) : fail("Unable to queue the film.", 503);
    }
    insertedId = inserted.id;
  }
  try {
    const { data: signed, error: signError } = await admin.storage.from("keep-media")
      .createSignedUrls(paths, 14400);
    if (signError || !signed || signed.some(s => s.error || !s.signedUrl))
      throw new Error("One of the original files could not be read.");
    const map = new Map(signed.map(s => [s.path, s.signedUrl!]));
    const sources: ShotstackSources = {
      voiceUrl: map.get(String(project.voicePath))!,
      memoryUrls: Object.fromEntries((project.memories as Array<Record<string, unknown>>)
        .map(m => [String(m.storagePath), map.get(String(m.storagePath))!])),
      musicUrl: MUSIC[mood] ? "https://keep-v1.vercel.app/audio/" + MUSIC[mood] + ".mp3" : undefined,
      musicDurationSec,
    };
    const edit = buildShotstackEdit(renderPlan, sources, {
      recipientName: String(project.recipientName ?? ""), openingMessage: String(project.openingMessage ?? ""),
      closingLine: String(project.closingLine ?? ""),
      from: Array.isArray(project.contributors) && project.contributors.length ?
        (project.contributors as Array<Record<string, unknown>>).map(x => String(x.name)).join(" & ") :
        String((project.cardEngraving as string[] | undefined)?.[1] ?? "").replace(/^FROM\s+/i, ""),
    });
    const result = await providerCall("/render", { method: "POST", body: JSON.stringify(edit) });
    if (!uuid(result?.response?.id)) throw new Error("The provider did not create a render job.");
    await admin.from("keep_render_jobs").update({
      status: "rendering", provider_render_id: result.response.id, updated_at: new Date().toISOString(),
    }).eq("id", insertedId).eq("status", "queued");
    return reply({ id: insertedId, status: "rendering" }, 202);
  } catch {
    await admin.from("keep_render_jobs").update({
      status: "failed", error_message: "Could not submit the film. No published Keep was changed.",
      updated_at: new Date().toISOString(),
    }).eq("id", insertedId);
    return fail("Saving couldn't be restarted. Your existing Keep remains available.", 503);
  }
});
