import { ArrowRight, Camera, Check, Images, Loader2, Plus, Video, X } from "lucide-react";
import type { MediaItem } from "@/lib/keep-project";

type Props = {
  moments: MediaItem[];
  busy: boolean;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onContinue: () => void;
};

/** The creator's primary task comes before optional uploading advice. */
export function KeepMomentsUploader({ moments, busy, onAdd, onRemove, onContinue }: Props) {
  const count = moments.length;
  const photos = moments.filter(item => item.kind === "image").length;
  const videos = moments.filter(item => item.kind === "video").length;

  return (
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
        <button type="button" onClick={onAdd} disabled={busy}
          className="group flex min-h-[168px] w-full flex-col items-center justify-center rounded-[18px] border-[1.5px] border-dashed border-[#CBB79F] bg-gradient-to-br from-[#F8F1E8] via-[#FBF7F1] to-[#F3EADD] px-5 py-6 text-center transition-all hover:border-[#9D7854] hover:from-[#F5E8D8] active:scale-[.995] disabled:cursor-wait disabled:opacity-60">
          <span className="mb-3 flex size-[52px] items-center justify-center rounded-[15px] border border-[#E3D4C0] bg-white/75 text-[#7A5E44] shadow-[0_5px_14px_rgba(109,85,58,.09)] transition-transform group-hover:-translate-y-0.5" aria-hidden="true">
            {busy ? <Loader2 className="size-6 animate-spin" /> : <Images className="size-6" strokeWidth={1.45}/>}
          </span>
          <span className="font-display text-[24px] leading-tight text-[#2A221D]">{busy ? "Adding your moments…" : "Add photos & videos"}</span>
          <span className="mt-1.5 text-[12px] text-[#857461]">Tap to choose from your library</span>
          <span className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-medium tracking-[.04em] text-[#9A826B]"><Camera className="size-3" aria-hidden="true" /> Photos <span aria-hidden="true">·</span> <Video className="size-3" aria-hidden="true" /> Videos</span>
        </button>
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
          <button type="button" onClick={onAdd} disabled={busy}
            className="group flex aspect-square min-h-24 flex-col items-center justify-center gap-2 rounded-[12px] border-[1.5px] border-dashed border-[#CBB79F] bg-[#F7EFE5] px-2 text-center text-[#69513E] transition-colors hover:border-[#A27F5D] hover:bg-[#F1E4D5] disabled:opacity-60">
            {busy ? <Loader2 className="size-6 animate-spin" aria-hidden="true" /> : <span className="flex size-9 items-center justify-center rounded-full bg-white/75"><Plus className="size-5" aria-hidden="true" /></span>}
            <span className="text-[11px] font-medium">{busy ? "Adding…" : "Add more"}</span>
          </button>
        </div>
      )}

      <div aria-live="polite" className="mt-3 flex items-center gap-2 text-[11px] text-[#827365]">
        <Check className="size-3.5 text-[#8C735A]" aria-hidden="true" />
        {count ? `${photos} ${photos === 1 ? "photo" : "photos"} · ${videos} ${videos === 1 ? "video" : "videos"} added` : "No photos needed to continue — it’s your story."}
      </div>

      <div className="mt-5 border-t border-[#E8DFD4] pt-5">
        <button type="button" onClick={onContinue} disabled={busy}
          className="group flex min-h-[58px] w-full items-center justify-between gap-3 rounded-[14px] bg-[#1C1917] px-5 text-left text-[15px] font-medium text-[#FCF8F2] shadow-[0_8px_22px_rgba(35,28,23,.12)] transition-all hover:bg-[#302720] active:scale-[.99] disabled:cursor-wait disabled:opacity-55">
          <span>{busy ? "Adding your moments…" : "Continue"}</span>
          <span className="flex size-9 items-center justify-center rounded-full bg-[#4C4237] text-[#F9EEE0] transition-transform group-hover:translate-x-0.5"><ArrowRight className="size-5" aria-hidden="true"/></span>
        </button>
        <button type="button" onClick={onContinue} disabled={busy} className="mt-1.5 flex min-h-11 w-full items-center justify-center px-3 text-center text-[12px] font-medium text-[#806E60] underline-offset-4 hover:text-[#4C3A2C] hover:underline disabled:cursor-wait disabled:opacity-50">
          {count ? "Continue without more photos" : "Continue without photos"}
        </button>
      </div>
    </section>
  );
}
