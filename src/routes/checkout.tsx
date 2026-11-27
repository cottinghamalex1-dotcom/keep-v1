import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Download, Loader2, RotateCcw } from "lucide-react";
import type { RenderResult } from "@/components/keep-film-render";
import { KeepFinishingDialog } from "@/components/keep-finishing-dialog";
import { KeepPurchase } from "@/components/keep-purchase";
import { ViewingLink } from "@/components/keep-publish-panel";
import { loadCheckoutKeep, type CheckoutKeep } from "@/lib/keep-checkout";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Keep — Finish your Keep" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: CheckoutRoute,
});

/** The same saved Keep ID survives a refresh, so no source re-upload or
 * duplicate render is needed to finish if a creator leaves mid-save. */
function CheckoutRoute() {
  const [keep, setKeep] = useState<CheckoutKeep | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    void loadCheckoutKeep(new URLSearchParams(window.location.search).get("keep") ?? "", controller.signal)
      .then(result => { if (!controller.signal.aborted) setKeep(result); })
      .catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Couldn't load your Keep."); });
    return () => controller.abort();
  }, [attempt]);
  return <main className="min-h-dvh bg-background text-foreground">
    <div className="mx-auto w-full max-w-xl px-6 pb-12 pt-9">
      <header className="mb-8 flex justify-center border-b border-border/60 pb-6"><span className="keep-wordmark">Keep</span></header>
      {keep ? <KeepSaveAndPurchase key={keep.id} keep={keep} /> : error ? <div role="alert" className="space-y-4 rounded-2xl border border-border p-6 text-center">
        <p>{error}</p>
        <button type="button" onClick={() => setAttempt(a => a + 1)} className="keep-premium-action flex min-h-12 w-full items-center justify-center gap-2 px-4 text-sm"><RotateCcw className="size-4" /> Try again</button>
        <a href="/app" className="block text-sm underline">Back to My Keeps</a>
      </div> : <div className="flex min-h-[40dvh] flex-col items-center justify-center gap-4" role="status"><Loader2 className="size-7 animate-spin text-[#887360]" /><p className="text-sm text-muted-foreground">Opening your Keep…</p></div>}
    </div>
  </main>;
}

export function KeepSaveAndPurchase({ keep }: { keep: CheckoutKeep }) {
  const [film, setFilm] = useState<RenderResult | null>(null);
  return film?.videoUrl ? <div className="space-y-6">
    <div className="flex items-center gap-2 text-xs font-medium text-[#47715B]" role="status"><Check className="size-4" /> Your finished Keep is saved.</div>
    <KeepPurchase keep={keep} />
    <details className="rounded-xl border border-border p-4">
      <summary className="cursor-pointer text-sm">View your finished film &amp; link</summary>
      <video src={film.videoUrl} controls playsInline preload="metadata" aria-label="Completed, seekable Keep film" className="mx-auto my-4 aspect-[9/16] max-h-[65dvh] w-full max-w-[280px] rounded-xl bg-[#171311] object-contain" />
      <a href={film.videoUrl} target="_blank" rel="noreferrer" className="mb-4 flex min-h-11 items-center justify-center gap-2 text-sm"><Download className="size-4" /> Save or download film</a>
      <ViewingLink token={keep.recipient_token} />
    </details>
    <div className="flex justify-center gap-5 text-xs text-muted-foreground">
      <a href={`/?edit=${encodeURIComponent(keep.id)}`} className="underline">Back to editor</a>
      <a href="/app" className="underline">My Keeps</a>
    </div>
  </div> : <KeepFinishingDialog keep={keep} onReady={setFilm} resume />;
}
