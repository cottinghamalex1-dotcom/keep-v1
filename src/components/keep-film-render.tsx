import { useCallback, useEffect, useRef, useState } from "react";
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
class FilmRequestError extends Error {}
export type RenderResult = {
  id?: string;
  status: "not_started" | "queued" | "rendering" | "ready" | "failed";
  providerStatus?: string;
  hasProviderRender?: boolean;
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
  // A stalled connection must not leave the creator waiting forever.
  // A later status check can resume the same durable job without submitting again.
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 90_000);
  try {
    const result = await fetch(endpoint, {
      signal: controller.signal,
      method: "POST",
      headers: { apikey: publicKey, Authorization: "Bearer " + session.access_token, "Content-Type": "application/json" },
      body: JSON.stringify({ keepId, action, ...(musicDurationSec !== undefined ? { musicDurationSec } : {}) }),
    });
    const data = await result.json().catch(() => ({})) as Partial<RenderResult>;
    if (!result.ok) throw new FilmRequestError(data.error ?? "The film service couldn't complete the request.");
    if (!data.status || !["not_started", "queued", "rendering", "ready", "failed"].includes(data.status))
      throw new Error("The film service returned an unknown status. Check the saved film again.");
    return { ...data, status: data.status };
  } finally {
    window.clearTimeout(timeout);
  }
}

// The current render endpoint exposes provider stages, not a frame percentage
// or an ETA. The bar counts completed stages, and the separate time range is
// only a rough estimate for a normal Keep started during this visit.
const renderStages = ["Prepare", "Render", "Save"] as const;
function renderStage(job: RenderResult): number {
  if (job.status === "ready" || ["saving", "recovering", "done"].includes(job.providerStatus ?? "")) return 2;
  if (job.status === "rendering" && job.providerStatus === "rendering") return 1;
  return 0;
}
function KeepRenderProgress({ job, startedAt, checking = false, interrupted = false }: {
  job: RenderResult; startedAt: number | null; checking?: boolean; interrupted?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
    if (startedAt === null || interrupted) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [startedAt, interrupted]);
  const stage = renderStage(job);
  const message = checking ? "Checking your saved Keep…" :
    stage === 2 ? "Finalizing your finished film…" :
    stage === 1 ? "Rendering your finished film…" :
    job.providerStatus === "queued" ? "Your film is in the render queue…" :
    job.providerStatus === "fetching" ? "Gathering your photos, videos and audio…" :
    job.status === "rendering" ? "Your film has been submitted for rendering…" :
    "Preparing your finished film…";
  const elapsed = startedAt === null ? 0 : Math.max(0, (now - startedAt) / 1000);
  const low = Math.max(1, Math.ceil((120 - elapsed) / 60));
  const high = Math.ceil((300 - elapsed) / 60);
  const estimate = interrupted ? "Reconnecting… Time estimate paused." :
    checking ? "Checking the current render status." :
    startedAt === null ? "Time remaining varies. We’ll keep checking your saved film." :
    high <= 0 ? "Taking longer than estimated. Your film is still processing." :
    `Estimated time left: ~${low === high ? high : low + "–" + high} min`;
  return <div className="mt-5 space-y-4 rounded-[16px] border border-[#E8DED4] bg-white/80 p-4 sm:p-5">
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#776553]">Film progress</span>
      <span className="text-xs font-medium tabular-nums text-[#776553]">Step {stage + 1} of {renderStages.length}</span>
    </div>
    <div role="progressbar" aria-label="Film processing stages" aria-valuemin={0} aria-valuemax={renderStages.length}
      aria-valuenow={stage} aria-valuetext={`${stage} of ${renderStages.length} stages complete; ${renderStages[stage]} in progress`}
      className="grid grid-cols-3 gap-1.5">
      {renderStages.map((name, index) => <div key={name} className="h-1.5 overflow-hidden rounded-full bg-[#E4D9CE]">
        <div className={`h-full rounded-full transition-colors duration-500 ${index < stage ? "bg-[#382B22]" : index === stage ? "bg-[#A78C74] motion-safe:animate-pulse" : "bg-transparent"}`} />
      </div>)}
    </div>
    <div aria-hidden="true" className="grid grid-cols-3 gap-1.5 text-[11px]">
      {renderStages.map((name, index) => <span key={name} className={`flex items-center gap-1 ${index <= stage ? "font-medium text-[#382B22]" : "text-[#887868]"}`}>
        {index < stage && <Check className="size-3 shrink-0" />} {name}
      </span>)}
    </div>
    <div role="status" className="flex items-start gap-3 border-t border-[#E8DED4] pt-3">
      <Loader2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 animate-spin motion-reduce:animate-none text-[#887360]" />
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-medium leading-5">{message}</p>
        <p className="text-xs leading-5 text-[#776553] tabular-nums">{estimate}</p>
        {startedAt !== null && !checking && !interrupted && high > 0 && <p className="text-[11px] leading-4 text-[#776553]">Approximate. Film length and render queue can affect timing.</p>}
      </div>
    </div>
  </div>;
}

/** In finishing mode the creator's Save action authorizes a single render.
 * Always check the durable job before starting; never automatically resubmit a failed job. */
export function KeepFilmRender({ keepId, musicMood, musicMuted = false, autoStart = false, onReady }: {
  keepId: string; musicMood: string; musicMuted?: boolean; autoStart?: boolean;
  onReady?: (job: RenderResult) => void;
}) {
  const [job, setJob] = useState<RenderResult>({ status: "not_started" });
  const [statusChecked, setStatusChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const actionLock = useRef(false);
  const autoAttempt = useRef(false);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    const next = await renderRequest(keepId, "status");
    setJob(next);
    setStatusChecked(true);
    setError("");
    return next;
  }, [keepId]);
  const checkStatus = async () => {
    if (busy) return;
    setBusy(true);
    try { await refresh(); }
    catch { setError("Couldn't check the saved film. Check your connection and try again."); }
    finally { setBusy(false); }
  };
  useEffect(() => {
    let cancelled = false;
    setStatusChecked(false);
    setStartedAt(null);
    setJob({ status: "not_started" });
    setError("");
    void renderRequest(keepId, "status").then(next => {
      if (!cancelled) { setJob(next); setStatusChecked(true); }
    }).catch(() => {
      if (!cancelled) setError("Couldn't check the saved film. Check your connection and try again.");
    });
    return () => { cancelled = true; };
  }, [keepId]);
  useEffect(() => {
    if (job.status !== "rendering" && job.status !== "queued" && !(autoStart && job.status === "ready" && !job.videoUrl)) return;
    let cancelled = false;
    let timeout: number;
    let delay = 7000;
    const poll = () => {
      timeout = window.setTimeout(() => {
        void renderRequest(keepId, "status")
          .then(next => {
            if (!cancelled) { setJob(next); setError(""); }
          })
          .catch(() => {
            if (cancelled) return;
            // Never submit a new render because a status request failed.
            // Keep checking the same job after a temporary network error.
            setError("Connection interrupted. We'll keep checking your existing film automatically.");
            delay = Math.min(delay * 2, 30000);
            poll();
          });
      }, delay);
    };
    poll();
    return () => { cancelled = true; window.clearTimeout(timeout); };
  }, [keepId, job, autoStart]);
  const act = async (action: "start" | "recover" | "retry") => {
    if (actionLock.current || busy) return;
    if (action === "retry" && !window.confirm(job.hasProviderRender
      ? "Render a new film? This may incur another Shotstack rendering charge. If an existing MP4 was completed, use Retry saving first."
      : "Retry rendering your film? A successfully submitted render may incur the normal Shotstack charge.")) return;
    actionLock.current = true;
    setBusy(true); setError("");
    setStartedAt(action === "recover" ? null : Date.now());
    try {
      const musicDurationSec = !musicMuted && (action === "start" || action === "retry") ? await soundtrackLength(musicMood) : undefined;
      setJob(await renderRequest(keepId, action, musicDurationSec));
    } catch (cause) {
      if (!(cause instanceof FilmRequestError)) {
        // The submission might have reached the server despite a lost response.
        // Require a read-only status check before offering another action.
        setStatusChecked(false);
      }
      if (cause instanceof FilmRequestError) {
        try { if ((await refresh()).status === "failed") return; } catch { setStatusChecked(false); }
      }
      setError(cause instanceof Error ? cause.message : "Couldn't start the finished film.");
    } finally { actionLock.current = false; setBusy(false); }
  };
  useEffect(() => {
    if (!autoStart || autoAttempt.current || !statusChecked || busy || error || job.status !== "not_started") return;
    autoAttempt.current = true;
    void act("start");
  }, [autoStart, statusChecked, busy, error, job.status]);
  useEffect(() => {
    if (statusChecked && job.status === "ready" && job.videoUrl) onReady?.(job);
  }, [statusChecked, job, onReady]);
  return <section className="rounded-[22px] border border-[#D8C8B6] bg-[#F6EFE7] p-5 text-[#30271E]" aria-label={autoStart ? "Saving your Keep" : "Finished Keep film"}>
    <h2 className="font-display text-[27px] leading-tight">{autoStart ? "Bringing it all together." : "Your finished film"}</h2>
    <p className="mt-2 text-xs leading-6 text-[#776553]">{autoStart ? "We're creating your finished film and saving it to your permanent viewing link. You'll choose your card as soon as it's ready." : "A single 1080p MP4 with your voice, music, memories and captions. Unlike the live preview, this video can be scrubbed, paused and saved."}</p>
    {!statusChecked && autoStart && !error ? <KeepRenderProgress job={job} startedAt={startedAt} checking />
    : !statusChecked ? <button type="button" disabled={busy || !error} onClick={() => void checkStatus()}
        className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#CAB8A5] px-5 py-3 text-sm disabled:opacity-60">
      {busy || !error ? <><Loader2 className="size-4 animate-spin" /> {autoStart ? "Checking your saved Keep…" : "Checking saved film…"}</> : <><RotateCcw className="size-4" /> Check film status</>}
    </button> : job.status === "ready" && job.videoUrl ? <>
      <video key={job.videoUrl} src={job.videoUrl} controls playsInline preload="metadata"
        className="mx-auto mt-5 aspect-[9/16] max-h-[68dvh] w-full max-w-[320px] rounded-xl bg-[#171311] object-contain"
        aria-label="Completed, seekable Keep film" />
      <a href={job.videoUrl} target="_blank" rel="noreferrer" className="mt-4 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#201A15] px-4 py-3 text-sm text-white">
        <Download className="size-4" /> Open / save MP4
      </a>
      <button type="button" onClick={() => void refresh().catch(e => setError(String(e)))} className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 text-xs text-[#76604B]"><RotateCcw className="size-4"/> Refresh private viewing link</button>
      <p className="mt-2 flex items-center justify-center gap-2 text-xs text-[#47715B]"><Check className="size-4" /> Finished film saved securely</p>
    </> : job.status === "ready" && autoStart ? <KeepRenderProgress job={job} startedAt={startedAt} interrupted={!!error} />
    : job.status === "ready" ? <button type="button" onClick={() => void refresh().catch(e => setError(String(e)))} className="mt-5 w-full rounded-xl bg-[#201A15] px-5 py-4 text-sm text-white">Refresh film link</button>
    : job.status === "rendering" || job.status === "queued" ? autoStart ? <KeepRenderProgress job={job} startedAt={startedAt} interrupted={!!error} /> : <div className="mt-5 flex items-center gap-3 rounded-xl bg-white/70 p-4" role="status"><Loader2 className="size-5 shrink-0 animate-spin" /><p className="text-sm">Preparing your finished MP4… {job.providerStatus ? "(" + job.providerStatus + ")" : "This can continue after you leave this page."}</p></div>
    : job.status === "failed" ? <div className="mt-5 space-y-3">
      <p role="alert" className="text-sm leading-6 text-[#9C473D]">{job.error || "The render needs attention. Your published Keep remains safe."}</p>
      {job.hasProviderRender && <button type="button" disabled={busy} onClick={() => void act("recover")} className="w-full rounded-xl bg-[#201A15] px-5 py-4 text-sm text-white disabled:opacity-50">{busy ? "Checking…" : "Retry saving existing MP4"}</button>}
      <button type="button" disabled={busy} onClick={() => void act("retry")} className="w-full rounded-xl border border-[#CAB8A5] px-5 py-3 text-sm disabled:opacity-50">Render again <ArrowRight className="ml-2 inline size-4"/></button>
    </div> : autoStart && (!autoAttempt.current || busy) ? <KeepRenderProgress job={job} startedAt={startedAt} interrupted={!!error} />
    : <button type="button" disabled={busy} onClick={() => void act("start")} className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#201A15] px-5 py-4 text-sm font-medium text-white disabled:opacity-50">{busy ? <Loader2 className="size-5 animate-spin" /> : <ArrowRight className="size-5" />} {busy ? "Starting…" : autoStart ? "Retry saving my Keep" : "Render my 1080p film"}</button>}
    {error && <p role="alert" className="mt-3 text-xs leading-5 text-[#A04F43]">{error}</p>}
  </section>;
}
