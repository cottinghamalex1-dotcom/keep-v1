import { useState } from "react";
import { Check, ChevronDown, Eye, EyeOff, X } from "lucide-react";
import type { CinematicMoment } from "@/components/cinematic-media";

type Look = { name: string; note: string };
type Props = {
  looks: Look[];
  currentLook: string;
  moment: CinematicMoment;
  compareOriginal: boolean;
  onLook: (name: string) => void;
  onCompare: (compare: boolean) => void;
  onClose: () => void;
};
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function KeepStyleEditor({ looks, currentLook, moment, compareOriginal, onLook, onCompare, onClose }: Props) {
  const [showAll, setShowAll] = useState(false);
  const featured = looks.slice(0, 4);
  const selectedExtra = looks.slice(4).find(x => x.name === currentLook);
  if (selectedExtra) featured.push(selectedExtra);
  const more = looks.filter(x => !featured.some(f => f.name === x.name));
  const renderLook = (look: Look) => {
    const chosen = look.name === currentLook;
    return <button key={look.name} type="button" onClick={() => { onCompare(false); onLook(look.name); }} aria-pressed={chosen}
      className={`min-w-0 overflow-hidden rounded-xl border text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D2BA99] ${chosen ? "border-[#E8D1B2] bg-[#34302E]" : "border-[#4B4648] bg-[#222123]"}`}>
      <div className="relative h-[90px] overflow-hidden bg-[#222123]">
        {moment.url && (moment.kind === "video"
          ? <video src={moment.url} muted preload="metadata" playsInline className={`h-full w-full object-cover editor-image-${slug(look.name)}`} />
          : <img src={moment.url} alt="" loading="lazy" className={`h-full w-full object-cover editor-image-${slug(look.name)}`} />)}
        {chosen && <span className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-[#F7F5F2] text-[#111113]"><Check className="size-3.5" /></span>}
      </div>
      <div className="px-3 py-2.5">
        <div className="truncate text-[13px] font-medium text-[#F7F5F2]">{look.name}</div>
        <div className="mt-0.5 line-clamp-1 text-[10px] text-[#B4B0AB]">{look.note}</div>
      </div>
    </button>;
  };
  return <section className="keep-style-editor px-4 pb-6 pt-5 sm:px-5" aria-label="Film look">
    <div className="flex items-start justify-between gap-3">
      <div><h2 className="font-display text-[28px] leading-8 text-foreground">Style</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Choose a look and watch your preview change.</p></div>
      <button type="button" aria-label="Close style" onClick={onClose} className="flex size-9 shrink-0 items-center justify-center rounded-full border border-border"><X className="size-4" /></button>
    </div>
    <div className="mt-5 flex items-center justify-between gap-3">
      <p className="text-xs font-semibold">Color & mood</p>
      <span className="text-[11px] text-[#D2BA99]">Applies to your whole Keep</span>
    </div>
    <div className="mt-3 grid grid-cols-2 gap-2.5">{featured.map(renderLook)}</div>
    {!!more.length && <>
      <button type="button" onClick={() => setShowAll(x => !x)} aria-expanded={showAll}
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border text-xs font-medium">
        {showAll ? "Show fewer looks" : `Explore ${more.length} more looks`}<ChevronDown className={`size-4 transition-transform ${showAll ? "rotate-180" : ""}`} />
      </button>
      {showAll && <div className="mt-3 grid grid-cols-2 gap-2.5">{more.map(renderLook)}</div>}
    </>}
    <button type="button" onClick={() => onCompare(!compareOriginal)} aria-pressed={compareOriginal}
      className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-[#595451] bg-[#242224] text-xs font-medium">
      {compareOriginal ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      {compareOriginal ? "Show selected look" : "Compare with original"}
    </button>
  </section>;
}
