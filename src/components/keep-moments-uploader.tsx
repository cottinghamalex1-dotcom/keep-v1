import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Camera, Check, Images, Loader2, Plus, Video, X } from "lucide-react";
import type { MediaItem } from "@/lib/keep-project";

type Props = {
  moments: MediaItem[];
  busy: boolean;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onContinue: () => void;
  continueLabel?: string;
};

/** Require the creator to acknowledge upload guidance before opening the native picker. */
export function KeepMomentsUploader({ moments, busy, onAdd, onRemove, onContinue, continueLabel = "Continue" }: Props) {
  const [guideStep, setGuideStep] = useState<"iphone" | "video" | null>(null);
  const guideTitle = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (guideStep) guideTitle.current?.focus({ preventScroll: true });
  }, [guideStep]);

  const count = moments.length;
  const photos = moments.filter(item => item.kind === "image").length;
  const videos = moments.filter(item => item.kind === "video").length;

  return (
    <Dialog.Root open={guideStep !== null} onOpenChange={open => setGuideStep(open ? "iphone" : null)}>
    <section aria-label="Add your photos and videos" className="mb-7 overflow-hidden rounded-[24px] border border-[#DBD0C2] bg-[#FFFCF8] p-4 shadow-[0_12px_34px_rgba(90,67,46,.055)] sm:p-6">
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#94765B]">BRING YOUR STORY TO LIFE</p>
          <h2 className="mt-1.5 font-display text-[clamp(26px,6.7vw,33px)] leading-[1.15] tracking-[-.03em] text-[#28201B]">Your favorite moments.</h2>
          <p className="mt-1.5 text-[12px] leading-5 text-[#76685C]">Choose the photos and little videos they’ll love remembering.</p>
        </div>
        <span aria-label={`${count} moments added`} className="flex shrink-0 items-center gap-1.5 rounded-full border border-[#E1D5C7] bg-[#F5EEE6] px-3 py-1.5 text-[11px] font-semibold tabular-nums text-[#79634F]">
          <Images className="size-3.5" aria-hidden="true" /> {count}
        </span>
      </div>

      {count === 0 ? (
        <Dialog.Trigger asChild><button type="button" disabled={busy}
          className="group flex min-h-[168px] w-full flex-col items-center justify-center rounded-[18px] border-[1.5px] border-dashed border-[#CBB79F] bg-gradient-to-br from-[#F8F1E8] via-[#FBF7F1] to-[#F3EADD] px-5 py-6 text-center transition-all hover:border-[#9D7854] hover:from-[#F5E8D8] active:scale-[.995] disabled:cursor-wait disabled:opacity-60">
          <span className="mb-3 flex size-[52px] items-center justify-center rounded-[15px] border border-[#E3D4C0] bg-white/75 text-[#7A5E44] shadow-[0_5px_14px_rgba(109,85,58,.09)] transition-transform group-hover:-translate-y-0.5" aria-hidden="true">
            {busy ? <Loader2 className="size-6 animate-spin" /> : <Images className="size-6" strokeWidth={1.45}/>}
          </span>
          <span className="font-display text-[24px] leading-tight text-[#2A221D]">{busy ? "Adding your moments…" : "Add photos & videos"}</span>
          <span className="mt-1.5 text-[12px] text-[#857461]">Tap to choose from your library</span>
          <span className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-medium tracking-[.04em] text-[#9A826B]"><Camera className="size-3" aria-hidden="true" /> Photos <span aria-hidden="true">·</span> <Video className="size-3" aria-hidden="true" /> Videos</span>
        </button></Dialog.Trigger>
      ) : (
        <div className="keep-creator-photo-grid grid grid-cols-3 gap-2 sm:grid-cols-4" aria-label="Selected moments">
          {moments.map((moment, index) => (
            <div key={moment.id} className="relative aspect-square overflow-hidden rounded-[12px] border border-[#E1D7CC] bg-[#EEE8E1]">
              {moment.url ? moment.kind === "video" ? (
                <video src={`${moment.url}#t=0.1`} muted playsInline preload="metadata" aria-label={moment.name ?? "Your video"} className="h-full w-full object-cover" />
              ) : (
                <img src={moment.url} alt={moment.name ?? `Moment ${index + 1}`} loading="lazy" className="h-full w-full object-cover" />
              ) : <div className="flex h-full items-center justify-center"><Images aria-hidden="true" className="size-6 text-[#998A79]"/></div>}
              {moment.kind === "video" && <span className="pointer-events-none absolute bottom-2 left-2 flex size-7 items-center justify-center rounded-full bg-black/55 text-white" aria-label="Video clip"><Video className="size-3.5" aria-hidden="true" /></span>}
              <button type="button" onClick={() => onRemove(index)} aria-label={`Remove memory ${index + 1}`}
                className="absolute right-1.5 top-1.5 flex size-8 items-center justify-center rounded-full border border-white/25 bg-black/65 text-white shadow-sm backdrop-blur-sm hover:bg-black/85">
                <X className="size-4" aria-hidden="true"/>
              </button>
            </div>
          ))}
          <Dialog.Trigger asChild><button type="button" disabled={busy}
            className="group flex aspect-square min-h-24 flex-col items-center justify-center gap-2 rounded-[12px] border-[1.5px] border-dashed border-[#CBB79F] bg-[#F7EFE5] px-2 text-center text-[#69513E] transition-colors hover:border-[#A27F5D] hover:bg-[#F1E4D5] disabled:opacity-60">
            {busy ? <Loader2 className="size-6 animate-spin" aria-hidden="true" /> : <span className="flex size-9 items-center justify-center rounded-full bg-white/75"><Plus className="size-5" aria-hidden="true" /></span>}
            <span className="text-[11px] font-medium">{busy ? "Adding…" : "Add more"}</span>
          </button></Dialog.Trigger>
        </div>
      )}

      <div aria-live="polite" className="mt-3 flex items-center gap-2 text-[11px] text-[#827365]">
        <Check className="size-3.5 text-[#8C735A]" aria-hidden="true" />
        {count ? `${photos} ${photos === 1 ? "photo" : "photos"} · ${videos} ${videos === 1 ? "video" : "videos"} added` : "No photos needed to continue — it’s your story."}
      </div>

      <div className="mt-5 border-t border-[#E8DFD4] pt-5">
        <button type="button" onClick={onContinue} disabled={busy}
          className="group flex min-h-[58px] w-full items-center justify-between gap-3 rounded-[14px] bg-[#1C1917] px-5 text-left text-[15px] font-medium text-[#FCF8F2] shadow-[0_8px_22px_rgba(35,28,23,.12)] transition-all hover:bg-[#302720] active:scale-[.99] disabled:cursor-wait disabled:opacity-55">
          <span>{busy ? "Adding your moments…" : continueLabel}</span>
          <span className="flex size-9 items-center justify-center rounded-full bg-[#4C4237] text-[#F9EEE0] transition-transform group-hover:translate-x-0.5"><ArrowRight className="size-5" aria-hidden="true"/></span>
        </button>
        <button type="button" onClick={onContinue} disabled={busy} className="mt-1.5 flex min-h-11 w-full items-center justify-center px-3 text-center text-[12px] font-medium text-[#806E60] underline-offset-4 hover:text-[#4C3A2C] hover:underline disabled:cursor-wait disabled:opacity-50">
          {count ? "Continue without more photos" : "Continue without photos"}
        </button>
      </div>
    </section>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[200] bg-[#171311]/60 backdrop-blur-[6px]" />
      <Dialog.Content
        onPointerDownOutside={event => event.preventDefault()}
        onOpenAutoFocus={event => { event.preventDefault(); guideTitle.current?.focus({ preventScroll: true }); }}
        className="fixed left-1/2 top-1/2 z-[201] flex max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[440px] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[26px] border border-[#D8D0C7] bg-[#F7F5F2] text-[#211C18] shadow-[0_28px_90px_rgba(26,19,12,.3)]"
      >
        <div className="min-h-0 overflow-y-auto overscroll-contain px-6 pb-6 pt-7 sm:px-8 sm:pt-8">
          <div className="flex items-center justify-between gap-3">
            <img src="/brand/keep-wordmark.svg" alt="Keep" className="h-7 w-auto" />
            <p className="text-[10px] font-semibold uppercase tracking-[.17em] text-[#6A5849]">Before you upload</p>
          </div>
          <div className="mt-5 flex items-center gap-2" aria-label={guideStep === "iphone" ? "Step 1 of 2" : "Step 2 of 2"}>
            <span className="h-1 flex-1 rounded-full bg-[#6A5849]" />
            <span className={`h-1 flex-1 rounded-full ${guideStep === "video" ? "bg-[#6A5849]" : "bg-[#E1D8CD]"}`} />
            <span className="ml-1 text-[10px] font-medium tabular-nums text-[#6A5849]">{guideStep === "iphone" ? "1" : "2"} of 2</span>
          </div>
          {guideStep === "iphone" ? (
            <>
              <div className="mt-6 flex items-center gap-3 rounded-[17px] border border-[#D8D0C7] bg-white/70 p-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#087AF5] text-white" aria-hidden="true"><Check className="size-6" strokeWidth={2.5} /></span>
                <div>
                  <p className="text-sm font-semibold text-[#211C18]">Tap the blue checkmark.</p>
                  <p className="mt-1 text-xs leading-5 text-[#6A5849]">Then give your iPhone a moment.</p>
                </div>
              </div>
              <Dialog.Title ref={guideTitle} tabIndex={-1} className="mt-5 font-display text-[clamp(28px,7.4vw,34px)] leading-[1.12] tracking-[-.035em] outline-none">Your photos may take a moment.</Dialog.Title>
              <Dialog.Description asChild>
                <div className="mt-3 space-y-3 text-sm leading-[1.7] text-[#6A5849]">
                  <p>After tapping the <strong className="text-[#211C18]">blue checkmark</strong> in your iPhone photo library, it can take several seconds (or longer for lots of files) for your photos and videos to reach Keep.</p>
                  <p className="rounded-xl bg-[#E6DED3]/70 p-3 text-[#493B30]"><strong>Even if the screen seems unchanged, please wait.</strong> Keep this page open. Your upload progress will appear as soon as the files arrive.</p>
                </div>
              </Dialog.Description>
            </>
          ) : (
            <>
              <div className="mt-6 flex items-center gap-3 rounded-[17px] border border-[#D8D0C7] bg-[#E6DED3]/55 p-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[#D8D0C7] bg-[#F7F5F2] text-[#6A5849]" aria-hidden="true"><Video className="size-5" strokeWidth={1.6} /></span>
                <div>
                  <p className="text-sm font-semibold text-[#211C18]">10 seconds or less.</p>
                  <p className="mt-1 text-xs leading-5 text-[#6A5849]">The ideal length for a video clip.</p>
                </div>
              </div>
              <Dialog.Title ref={guideTitle} tabIndex={-1} className="mt-5 font-display text-[clamp(28px,7.4vw,34px)] leading-[1.12] tracking-[-.035em] outline-none">A little movement goes a long way.</Dialog.Title>
              <Dialog.Description asChild>
                <div className="mt-3 space-y-3 text-sm leading-[1.7] text-[#6A5849]">
                  <p>Short clips of <strong className="text-[#211C18]">10 seconds or less</strong> usually tell the story best. For longer videos (up to 90 seconds), Keep will automatically compress them on your device when possible. This can take a little while.</p>
                  <p className="rounded-xl bg-[#E6DED3]/70 p-3 text-[#493B30]">Video clips play muted so your narration and music stay front and center.</p>
                </div>
              </Dialog.Description>
            </>
          )}
        </div>
        <div className="shrink-0 border-t border-[#D8D0C7] bg-[#F7F5F2] px-6 pb-[max(14px,env(safe-area-inset-bottom))] pt-4 sm:px-8">
          <button type="button" disabled={busy} onClick={() => {
            if (busy) return;
            if (guideStep === "iphone") {
              setGuideStep("video");
            } else if (guideStep === "video") {
              setGuideStep(null);
              // Keep this synchronous in the acknowledgement tap for iOS's native file picker.
              onAdd();
            }
          }} className="group flex min-h-[56px] w-full items-center justify-between gap-3 rounded-[14px] bg-[#1C1917] px-4 text-left text-[14px] font-medium text-[#FCF8F2] shadow-[0_8px_22px_rgba(35,28,23,.12)] transition-colors hover:bg-[#302720] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#6A5849] disabled:opacity-50">
            <span>{guideStep === "iphone" ? "I understand" : "I understand — open library"}</span>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#4C4237] text-[#F9EEE0]"><ArrowRight className="size-5" aria-hidden="true" /></span>
          </button>
          <Dialog.Close asChild><button type="button" className="mt-1 flex min-h-11 w-full items-center justify-center text-xs font-medium text-[#6A5849] underline-offset-4 hover:underline">Cancel</button></Dialog.Close>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
    </Dialog.Root>
  );
}
