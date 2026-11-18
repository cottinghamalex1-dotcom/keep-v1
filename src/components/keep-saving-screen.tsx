import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, LoaderCircle, RotateCcw } from "lucide-react";
import { beginKeepRender, refreshKeepRender, type KeepRenderStatus } from "@/lib/keep-render-client";
import { keepSavingProgress } from "@/lib/keep-saving-progress";

type Props = {
  keepId?: string | undefined;
  musicMood: string;
  musicMuted: boolean;
  publishing: boolean;
  publishMessage: string;
  publishError?: string | undefined;
  onReady: () => void;
  onRetryPublish: () => void;
  onBack: () => void;
};

/**
 * Fullscreen, calm saving interstitial between Editor Done and physical-card
 * customization. Do not display the card or viewing link while saving.
 * No guessed ETA or simulated progress: the bar advances on confirmed steps.
 */
export function KeepSavingScreen({
  keepId, musicMood, musicMuted, publishing, publishMessage, publishError,
  onReady, onRetryPublish, onBack,
}: Props) {
  const [job, setJob] = useState<KeepRenderStatus | null>(null);
  const [error, setError] = useState("");
  const [highestPercent, setHighestPercent] = useState(0);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const doneRef = useRef(false);
  const isSaved = !publishing && !!keepId && !publishError;

  useEffect(() => {
    if (!isSaved || !keepId) return;
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const update = (state: KeepRenderStatus) => {
      if (cancelled) return;
      setJob(state);
      setError("");
      if (state.status === "ready" && !doneRef.current) {
        doneRef.current = true;
        timeout = window.setTimeout(() => { if (!cancelled) onReadyRef.current(); }, 700);
      }
      if (state.status !== "ready" && state.status !== "failed") {
        timeout = window.setTimeout(() => { void poll(); }, 6000);
      }
    };
    const poll = async () => {
      try {
        update(await refreshKeepRender(keepId));
      } catch (cause) {
        if (cancelled) return;
        setError(cause instanceof Error ? cause.message : "We couldn't check your progress.");
        timeout = window.setTimeout(() => { void poll(); }, 12000);
      }
    };
    void beginKeepRender(keepId, musicMood, musicMuted).then(update).catch(cause => {
      if (!cancelled) setError(cause instanceof Error ? cause.message : "We couldn't finish saving your Keep.");
    });
    return () => { cancelled = true; if (timeout !== undefined) window.clearTimeout(timeout); };
  }, [isSaved, keepId, musicMood, musicMuted]);

  const failure = publishError || (job?.status === "failed" ? job.error || "Your video couldn't be saved." : "");
  const { percent: currentPercent, label, detail } = keepSavingProgress(publishing, publishMessage, job);
  // Provider steps may arrive out of order; never make the visible bar jump backwards.
  useEffect(() => { setHighestPercent(value => Math.max(value, currentPercent)); }, [currentPercent]);
  const percent = Math.max(highestPercent, currentPercent);
  return <section role="dialog" aria-modal="true" aria-label="Saving your Keep"
    className="flex min-h-dvh flex-col items-center justify-center bg-[#F7F5F2] px-7 py-[max(48px,env(safe-area-inset-top))] text-center text-[#2D2520]">
    <div className="mx-auto w-full max-w-[460px]">
      <span className="keep-wordmark !text-[36px]">Keep</span>
      <div className="mx-auto mt-16 flex size-20 items-center justify-center rounded-full border border-[#D6C5B2] bg-[#F1E9DF]">
        {job?.status === "ready" ? <Check className="size-8 text-[#77654F]" strokeWidth={1.4} />
          : <LoaderCircle className={`size-8 text-[#947F6A] ${failure ? "" : "animate-spin"}`} strokeWidth={1.4} />}
      </div>
      <p className="mt-9 text-[11px] font-semibold uppercase tracking-[.23em] text-[#967D67]">Some things are worth keeping.</p>
      <h1 className="mt-5 font-display text-[clamp(39px,10vw,54px)] leading-[1.09] tracking-[-.045em]">Saving your Keep<span className="font-normal italic">.</span></h1>
      <p role="status" aria-live="polite" className="mx-auto mt-5 max-w-[340px] text-sm leading-6 text-[#6E6055]">{failure || error || label + " — " + detail}</p>
      <div className="mt-12 text-left">
        <div className="mb-3 flex items-center justify-between gap-4">
          <span className="text-xs font-medium text-[#756554]">{failure ? "Saving paused" : label}</span>
          <span className="text-[15px] font-semibold tabular-nums text-[#44372D]" aria-label={`${percent}% of saving steps complete`}>{percent}%</span>
        </div>
        <div role="progressbar" aria-label="Keep saving progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} className="h-[6px] overflow-hidden rounded-full bg-[#E3D7CA]">
          <div className="h-full rounded-full bg-[#967B61] transition-[width] duration-700 ease-out motion-reduce:duration-0" style={{ width: `${percent}%` }} />
        </div>
        <p className="mt-3 text-[11px] leading-5 text-[#8B7B6D]">The percentage follows completed saving steps. Some steps take longer than others.</p>
      </div>
      {(failure || error) && <div className="mt-9 space-y-3">
        {publishError && <button type="button" onClick={() => { setHighestPercent(0); onRetryPublish(); }} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#251F1A] px-5 text-sm font-medium text-white"><RotateCcw size={17}/> Try saving again</button>}
        <button type="button" onClick={onBack} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-[#CFBFAE] px-5 text-sm text-[#66574A]"><ArrowLeft size={17}/> Back to editor</button>
      </div>}
      {!failure && !error && <p className="mt-12 text-xs leading-6 text-[#8B7B6D]">Please keep this page open while your Keep is being saved.</p>}
    </div>
  </section>;
}
