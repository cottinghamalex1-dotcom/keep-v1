import { useEffect, useState } from "react";
import type { KeepRestoreProgress } from "@/lib/keep-cloud";

type Phase = "session" | "draft" | "media" | "finishing";
type Props = { phase: Phase; progress: KeepRestoreProgress | null; onBack: () => void; };

const steps = [
  { id: "session", label: "Connecting securely" },
  { id: "draft", label: "Finding your Keep" },
  { id: "media", label: "Restoring your memories" },
  { id: "finishing", label: "Opening your editor" },
] as const;

export function KeepOpeningScreen({ phase, progress, onBack }: Props) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, []);

  const current = steps.findIndex((step) => step.id === phase);
  const hasCount = phase === "media" && !!progress?.total;
  const percentage = hasCount ? Math.round((progress!.completed / progress!.total) * 100) : null;
  const status = phase === "media" && progress?.total
    ? `Restored ${progress.completed} of ${progress.total} photos, videos, and audio files`
    : phase === "session" ? "Checking your account securely"
    : phase === "draft" ? "Finding your saved edits"
    : phase === "media" ? "Getting your memories ready"
    : "Preparing your editing space";
  return (
    <main className="app-shell keep-opening-screen">
      <header className="flex items-center justify-between px-7 pt-[max(35px,env(safe-area-inset-top))]">
        <a href="/app" aria-label="Back to your creations" className="keep-wordmark">Keep</a>
      </header>
      <div className="mx-auto flex min-h-[calc(100dvh-115px)] max-w-md flex-col justify-center px-8 pb-16">
        <h1 className="font-display text-[clamp(37px,9.5vw,49px)] font-normal leading-[1.13] tracking-[-.035em] text-foreground">
          Getting your Keep ready.
        </h1>
        <p className="mt-5 max-w-[30ch] text-[15px] leading-7 text-muted-foreground">
          We're bringing your words and memories back together, right where you left off.
        </p>
        <div className="mt-12" aria-live="polite" aria-atomic="true">
          <div className="mb-3 flex items-end justify-between gap-3">
            <p className="text-xs font-medium text-foreground">{status}</p>
            {percentage !== null && <span className="text-xs font-medium tabular-nums text-[#6A5849]">{percentage}%</span>}
          </div>
          <div role="progressbar" aria-label="Restoring your Keep" aria-valuemin={0} aria-valuemax={percentage === null ? undefined : 100} aria-valuenow={percentage === null ? undefined : percentage} aria-valuetext={status} className="keep-opening-track h-1.5 overflow-hidden rounded-full bg-[#E6DED3]">
            <div className={percentage === null ? "keep-opening-indeterminate h-full rounded-full bg-[#0B0B0B]" : "h-full rounded-full bg-[#0B0B0B] transition-[width] duration-300"} style={percentage === null ? undefined : { width: `${percentage}%` }} />
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            {hasCount ? "Progress reflects files restored. Larger videos may take longer." : "Connecting and checking your saved work. Time depends on your connection."}
          </p>
        </div>
        <div className="mt-11 space-y-4 border-t border-border pt-7">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-3">
              <span aria-hidden="true" className={`flex size-6 items-center justify-center rounded-full border text-[11px] ${index < current ? "border-[#0B0B0B] bg-[#0B0B0B] text-white" : index === current ? "border-[#6A5849] bg-[#E6DED3] text-[#0B0B0B]" : "border-border text-muted-foreground"}`}>
                {index < current ? "✓" : index + 1}
              </span>
              <span className={`text-[13px] ${index === current ? "font-medium text-foreground" : "text-muted-foreground"}`}>{step.label}</span>
            </div>
          ))}
        </div>
        {elapsed >= 20 && <p role="status" className="mt-8 text-xs leading-5 text-muted-foreground">Still working — your changes are safe. You can return to your creations and try again if this takes unusually long.</p>}
        <button type="button" onClick={onBack} className="mt-8 self-start border-b border-[#6A5849] pb-1 text-xs font-medium text-[#6A5849]">
          Back to your creations
        </button>
      </div>
    </main>
  );
}
