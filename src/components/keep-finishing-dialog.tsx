import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { KeepFilmRender, type RenderResult } from "@/components/keep-film-render";
import type { CheckoutKeep } from "@/lib/keep-checkout";

function FinishingOverlay({ children }: { children: ReactNode }) {
  return (
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[210] bg-[#171311]/55 backdrop-blur-[6px]" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[211] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[460px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[26px] border border-[#D8CCBE] bg-[#F8F3EC] px-6 py-8 text-center text-[#211C18] shadow-2xl sm:px-9 sm:py-10"
          onEscapeKeyDown={event => event.preventDefault()}
          onPointerDownOutside={event => event.preventDefault()}
          onInteractOutside={event => event.preventDefault()}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#8B725A]">The final touch</p>
          <Dialog.Title className="mt-3 font-display text-[34px] leading-[1.08] sm:text-[38px]">Bringing it all together.</Dialog.Title>
          <Dialog.Description className="mx-auto mt-4 max-w-xs text-sm leading-6 text-[#6C5B4B]">
            We're creating your finished film and saving it to your permanent viewing link. You'll move to your card options as soon as it's ready.
          </Dialog.Description>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Keep the final-words screen visible while the saved revision is rendered.
 * A resumed checkout checks the saved result before showing the dialog, so
 * the normal ready-to-checkout handoff does not flash a second saving modal. */
export function KeepFinishingDialog({ keep, savingStatus, onReady, resume = false }: {
  keep: CheckoutKeep | null;
  savingStatus?: string;
  onReady: (film: RenderResult) => void;
  resume?: boolean;
}) {
  const savedCount = savingStatus?.match(/Saving memories (\d+) of (\d+)/);
  const uploadPercent = savedCount && Number(savedCount[2]) > 0
    ? Math.min(100, 100 * Number(savedCount[1]) / Number(savedCount[2]))
    : null;

  if (keep) return (
    <KeepFilmRender
      keepId={keep.id}
      musicMood={keep.published_project.musicMood}
      musicMuted={!!keep.published_project.audioMix?.musicMuted}
      autoStart
      embedded
      onReady={onReady}
      wrap={(content, checkingOrReady) => resume && checkingOrReady ? (
        <div className="flex min-h-[40dvh] flex-col items-center justify-center gap-4" role="status"><Loader2 className="size-7 animate-spin text-[#887360]" /><p className="text-sm text-muted-foreground">Opening your Keep…</p></div>
      ) : (
        <FinishingOverlay>
          <div className="mt-4 text-left">{content}</div>
          <p className="mt-6 text-xs leading-5 text-[#6C5B4B]">You can return to this Keep from My Keeps if you need to leave.</p>
          <div className="mt-3 flex justify-center gap-5 text-xs font-medium text-[#6C5B4B]">
            <a href={`/?edit=${encodeURIComponent(keep.id)}`} className="underline underline-offset-4">Back to editor</a>
            <a href="/app" className="underline underline-offset-4">My Keeps</a>
          </div>
        </FinishingOverlay>
      )}
    />
  );

  return (
    <FinishingOverlay>
      <div className="mt-7 text-left">
        <div role="status" className="flex items-center gap-3 rounded-xl border border-[#E5DACD] bg-white/70 p-4">
          <Loader2 className="size-5 shrink-0 animate-spin text-[#8B725A]" />
          <p className="text-sm leading-5">{savingStatus || "Saving your Keep…"}</p>
        </div>
        {uploadPercent === null ? (
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#E5DACD]" aria-hidden="true"><div className="h-full w-full animate-pulse rounded-full bg-[#8B725A]/70 motion-reduce:animate-none" /></div>
        ) : (
          <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#E5DACD]" role="progressbar" aria-label="Saving media" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(uploadPercent)}>
            <div className="h-full rounded-full bg-[#8B725A] transition-[width]" style={{ width: uploadPercent + "%" }} />
          </div>
        )}
        <p className="mt-5 text-center text-xs leading-5 text-[#6C5B4B]">Keep this page open while we save your words, voice and memories.</p>
      </div>
    </FinishingOverlay>
  );
}
