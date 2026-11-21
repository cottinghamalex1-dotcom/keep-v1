import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Check, Download, Loader2, RotateCcw } from "lucide-react";
import { activeKeepSession } from "@/lib/keep-cloud";

const endpoint = "https://lwkzhpwugtosbidxvdcr.supabase.co/functions/v1/keep-render";
const publicKey = "sb_publishable_K8_SWJByLhV78h7gY4NySw_4sgjEVTi";
const soundtrack: Record<string, string> = {
  Intentional: "intentional", "Warm + Nostalgic": "warm-nostalgic",
  Joyful: "joyful", Cinematic: "cinematic", Romantic: "romantic",
  Hopeful: "hopeful", Playful: "playful", Reflective: "reflective",
  Acoustic: "acoustic", Piano: "piano", "Worth Keeping": "intentional",
};
type RenderResult = {
  id?: string;
  status: "not_started" | "queued" | "rendering" | "ready" | "failed";
  providerStatus?: string;
  videoUrl?: string;
  error?: string;
};

async function soundtrackLength(mood: string): Promise<number> {
  const filename = soundtrack[mood];
  if (!filename) throw new Error("The selected soundtrack is unavailable. Return to the editor to choose another.");
  return new Promise((resolve, reject) => {
    const audio = document.createElement("audio");
    let settled = false;
    const finish = (duration?: number) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      audio.removeAttribute("src");
      audio.load();
      if (duration && Number.isFinite(duration) && duration >= 30 && duration <= 900) resolve(duration);
      else reject(new Error("Couldn't verify the music duration. Please retry before rendering."));
    };
    audio.preload = "metadata";
    audio.onloadedmetadata = () => finish(audio.duration);
    audio.onerror = () => finish();
    const timeout = window.setTimeout(() => finish(), 12000);
    audio.src = "/audio/" + filename + ".mp3";
    audio.load();
  });
}

async function renderRequest(keepId: string, action: string, musicDurationSec?: number): Promise<RenderResult> {
  const session = await activeKeepSession();
  if (!session) throw new Error("Sign in to your Keep account to render this film.");
  const result = await fetch(endpoint, {
    method: "POST",
    headers: { apikey: publicKey, Authorization: "Bearer " + session.access_token, "Content-Type": "application/json" },
    body: JSON.stringify({ keepId, action, ...(musicDurationSec !== undefined ? { musicDurationSec } : {}) }),
  });
  const data = await result.json().catch(() => ({})) as Partial<RenderResult>;
  if (!result.ok) throw new Error(data.error ?? "The film service couldn't complete the request.");
  return { status: data.status ?? "not_started", ...data };
}

/** Owner-only controls. Nothing billable is submitted until the creator presses Render. */
export function KeepFilmRender({ keepId, musicMood }: { keepId: string; musicMood: string }) {
  const [job, setJob] = useState<RenderResult>({ status: "not_started" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const next = await renderRequest(keepId, "status");
    setJob(next);
    setError("");
    return next;
  }, [keepId]);
  useEffect(() => {
    let cancelled = false;
    void renderRequest(keepId, "status").then(next => { if (!cancelled) setJob(next); })
      .catch(() => { /* Creator can still start after signing in again. */ });
    return () => { cancelled = true; };
  }, [keepId]);
  useEffect(() => {
    if (job.status !== "rendering" && job.status !== "queued") return;
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void renderRequest(keepId, "status")
        .then(next => { if (!cancelled) { setJob(next); setError(""); } })
        .catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Couldn't check film status."); });
    }, 7000);
    return () => { cancelled = true; window.clearTimeout(timeout); };
  }, [keepId, job.status, job.providerStatus, job.id]);
  const act = async (action: "start" | "recover" | "retry") => {
    if (busy) return;
    if (action === "retry" && !window.confirm("Render a new film? This may incur another Shotstack rendering charge. If an existing MP4 was completed, use Retry saving first.")) return;
    setBusy(true); setError("");
    try {
      const musicDurationSec = action === "start" || action === "retry" ? await soundtrackLength(musicMood) : undefined;
      setJob(await renderRequest(keepId, action, musicDurationSec));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Couldn't start the finished film.");
    } finally { setBusy(false); }
  };
  return <section className="rounded-[22px] border border-[#D8C8B6] bg-[#F6EFE7] p-5 text-[#30271E]" aria-label="Finished Keep film">
    <h2 className="font-display text-[27px] leading-tight">Your finished film</h2>
    <p className="mt-2 text-xs leading-6 text-[#776553]">A single 1080p MP4 with your voice, music, memories and captions. Unlike the live preview, this video can be scrubbed, paused and saved.</p>
    {job.status === "ready" && job.videoUrl ? <>
      <video key={job.videoUrl} src={job.videoUrl} controls playsInline preload="metadata"
        className="mx-auto mt-5 aspect-[9/16] max-h-[68dvh] w-full max-w-[320px] rounded-xl bg-[#171311] object-contain"
        aria-label="Completed, seekable Keep film" />
      <a href={job.videoUrl} target="_blank" rel="noreferrer" className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#201A15] px-4 py-3 text-sm text-white">
        <Download className="size-4" /> Open / save MP4
      </a>
      <button type="button" onClick={() => void refresh().catch(e => setError(String(e)))} className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 text-xs text-[#76604B]"><RotateCcw className="size-4"/> Refresh private viewing link</button>
      <p className="mt-2 flex items-center justify-center gap-2 text-xs text-[#47715B]"><Check className="size-4" /> Finished film saved securely</p>
    </> : job.status === "ready" ? <button type="button" onClick={() => void refresh().catch(e => setError(String(e)))} className="mt-5 w-full rounded-xl bg-[#201A15] px-5 py-4 text-sm text-white">Refresh film link</button>
    : job.status === "rendering" || job.status === "queued" ? <div className="mt-5 flex items-center gap-3 rounded-xl bg-white/70 p-4" role="status"><Loader2 className="size-5 shrink-0 animate-spin" /><p className="text-sm">Preparing your finished MP4… {job.providerStatus ? "(" + job.providerStatus + ")" : "This can continue after you leave this page."}</p></div>
    : job.status === "failed" ? <div className="mt-5 space-y-3">
      <p role="alert" className="text-sm leading-6 text-[#9C473D]">{job.error || "The render needs attention. Your published Keep remains safe."}</p>
      {job.id && <button type="button" disabled={busy} onClick={() => void act("recover")} className="w-full rounded-xl bg-[#201A15] px-5 py-4 text-sm text-white disabled:opacity-50">{busy ? "Checking…" : "Retry saving existing MP4"}</button>}
      <button type="button" disabled={busy} onClick={() => void act("retry")} className="w-full rounded-xl border border-[#CAB8A5] px-5 py-3 text-sm disabled:opacity-50">Render again <ArrowRight className="ml-2 inline size-4"/></button>
    </div> : <button type="button" disabled={busy} onClick={() => void act("start")} className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#201A15] px-5 py-4 text-sm font-medium text-white disabled:opacity-50">{busy ? <Loader2 className="size-5 animate-spin" /> : <ArrowRight className="size-5" />} {busy ? "Starting…" : "Render my 1080p film"}</button>}
    {error && <p role="alert" className="mt-3 text-xs leading-5 text-[#A04F43]">{error}</p>}
  </section>;
}
