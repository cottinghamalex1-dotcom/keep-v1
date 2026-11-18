import { useEffect, useRef, useState } from "react";
import { Check, LoaderCircle, Film, AlertTriangle } from "lucide-react";
import { beginKeepRender, refreshKeepRender, type KeepRenderStatus } from "@/lib/keep-render-client";

/** Shows only actual server status. No simulated percentage or made-up ETA. */
export function KeepRenderingStatus({
  keepId, musicMood, musicMuted = false, onStatusChange,
}: {
  keepId: string; musicMood: string; musicMuted?: boolean;
  onStatusChange: (status: KeepRenderStatus["status"]) => void;
}) {
  const [job, setJob] = useState<KeepRenderStatus>({ status: "queued" });
  const [error, setError] = useState("");
  const callback = useRef(onStatusChange);
  callback.current = onStatusChange;
  useEffect(() => {
    let cancelled = false;
    let timeout: number | undefined;
    const update = (next: KeepRenderStatus) => {
      if (cancelled) return;
      setJob(next);
      callback.current(next.status);
    };
    const check = async () => {
      try {
        const next = await refreshKeepRender(keepId);
        update(next);
        if (!cancelled && next.status !== "ready" && next.status !== "failed")
          timeout = window.setTimeout(() => void check(), 6000);
      } catch (issue) {
        if (!cancelled) {
          setError(issue instanceof Error ? issue.message : "Render status is temporarily unavailable.");
          timeout = window.setTimeout(() => void check(), 12000);
        }
      }
    };
    void beginKeepRender(keepId, musicMood, musicMuted).then(next => {
      update(next);
      if (next.status !== "ready" && next.status !== "failed" && !cancelled)
        timeout = window.setTimeout(() => void check(), 5000);
    }).catch(issue => {
      if (!cancelled) {
        setError(issue instanceof Error ? issue.message : "The film could not be started.");
        callback.current("failed");
      }
    });
    return () => { cancelled = true; if (timeout !== undefined) window.clearTimeout(timeout); };
  }, [keepId, musicMood, musicMuted]);
  const ready = job.status === "ready";
  const failed = !!error || job.status === "failed";
  return <section className="mt-5 rounded-2xl border border-[#DDD3C9] bg-[#F8F5F1] px-5 py-5 text-[#332C27]" role="status" aria-live="polite">
    <div className="flex items-center gap-3">
      {failed ? <AlertTriangle className="size-5 text-[#9B3529]" /> :
        ready ? <Check className="size-5 text-[#5C6E55]" /> :
        <LoaderCircle className="size-5 animate-spin text-[#7D6A56]" />}
      <strong className="text-sm">{failed ? "The finished film isn't available yet" :
        ready ? "Your finished film is ready" : "Preparing your finished film"}</strong>
    </div>
    <p className="mt-2 text-xs leading-6 text-[#76695F]">
      {failed ? (error || job.error || "Your original Keep remains safe and available.") :
        ready ? "Your private MP4 is saved and ready for a complete Watch experience." :
        "Shotstack is combining your voice, music, photos, captions, introduction and ending. Your draft and existing viewing link remain safe."}
    </p>
    {!ready && !failed && <div className="mt-3 flex items-center gap-2 text-[11px] text-[#806A53]"><Film size={13} /> Render status: {job.providerStatus || job.status}</div>}
  </section>;
}
