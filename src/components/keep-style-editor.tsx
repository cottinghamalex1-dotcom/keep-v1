import { Check, ChevronDown, Eye, EyeOff, X } from "lucide-react";
import type { CinematicMoment } from "@/components/cinematic-media";

type Look = { name: string; note: string };
type Props = {
  looks: Look[]; currentLook: string; moment: CinematicMoment; compareOriginal: boolean;
  onLook: (name: string) => void; onCompare: (compare: boolean) => void; onClose: () => void;
};
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export function KeepStyleEditor({ looks, currentLook, moment, compareOriginal, onLook, onCompare, onClose }: Props) {
  const current = looks.find(look => look.name === currentLook);
  const featured = [...(current ? [current] : []), ...looks.filter(look => look.name !== currentLook)].slice(0, 4);
  const more = looks.filter(look => !featured.some(item => item.name === look.name));
  const lookButton = (look: Look) => {
    const selected = currentLook === look.name;
    return <button key={look.name} type="button" onClick={() => { onCompare(false); onLook(look.name); }} aria-pressed={selected}
      className={`keep-studio-choice relative min-w-0 overflow-hidden p-1.5 text-left ${selected ? "keep-studio-choice--selected" : ""}`}>
      <div className="relative h-[62px] overflow-hidden rounded-lg bg-[#393330]">
        {moment.url && (moment.kind === "video"
          ? <video src={moment.url} muted preload="metadata" playsInline className={`h-full w-full object-cover editor-image-${slug(look.name)}`} />
          : <img src={moment.url} alt="" loading="lazy" className={`h-full w-full object-cover editor-image-${slug(look.name)}`} />)}
        {selected && <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-[#F5EADB] text-[#29231D]"><Check className="size-3" /></span>}
      </div>
      <span className="mt-1.5 block truncate px-1 text-[11px] font-medium text-[#F9F1E6]">{look.name}</span>
    </button>;
  };
  return <section className="keep-studio-compact p-3.5 sm:p-4" aria-label="Film look">
    <div className="flex items-center justify-between gap-3">
      <div><h2 className="font-display text-[25px] leading-none">Style</h2>
        <p className="mt-1 text-[11px] text-[#BDB3AA]">One beautiful look for the whole Keep.</p></div>
      <button type="button" onClick={onClose} aria-label="Close style" className="keep-studio-icon-button"><X className="size-4" /></button>
    </div>
    <div className="mt-3 grid grid-cols-4 gap-2" aria-label="Film look options">{featured.map(lookButton)}</div>
    <button type="button" onClick={() => onCompare(!compareOriginal)} aria-pressed={compareOriginal}
      className="keep-studio-secondary-action mt-3 w-full justify-center">
      {compareOriginal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      {compareOriginal ? "Return to selected look" : "Hold to compare? Tap to see original"}
    </button>
    {!!more.length && <details className="keep-studio-more mt-2">
      <summary className="flex min-h-10 cursor-pointer items-center justify-between text-[11px] font-medium text-[#D7C2A6]">
        Explore {more.length} more looks <ChevronDown className="size-4" />
      </summary>
      <div className="grid grid-cols-4 gap-2 border-t border-[#51463E] pt-3">{more.map(lookButton)}</div>
    </details>}
  </section>;
}
