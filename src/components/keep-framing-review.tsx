import { useRef, useState } from "react";
import { ArrowRight, Check, ChevronLeft, Move, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { MediaItem } from "@/lib/keep-project";
import { focusAfterDrag, framingReviewScale, momentFocus, type MomentFocus } from "@/lib/keep-framing";

type Props = {
  moments: MediaItem[];
  index: number;
  onIndex: (index: number) => void;
  onFocus: (id: string, focus: MomentFocus) => void;
  onComplete: () => void;
};

function FramingSurface({ moment, number, onFocus }: {
  moment: MediaItem; number: number; onFocus: (focus: MomentFocus) => void;
}) {
  const [source, setSource] = useState({ width: 0, height: 0 });
  const [failed, setFailed] = useState(false);
  const drag = useRef<{ x: number; y: number; focus: MomentFocus; width: number; height: number } | null>(null);
  const focus = momentFocus(moment);
  const scale = framingReviewScale(moment);
  const position = `${focus.focusX}% ${focus.focusY}%`;
  const style = { objectPosition: position, transformOrigin: position, transform: `scale(${scale})` };
  const label = moment.kind === "video" ? "video" : "photo";
  const update = (next: MomentFocus) => onFocus(momentFocus(next));
  return <div className="mx-auto" style={{ width: "min(100%, 320px, max(164px, calc(56.25dvh - 160px)))" }}>
    <div role="group" aria-label={`Reposition ${label} ${number}`} tabIndex={0}
      className="relative aspect-[9/16] w-full cursor-grab touch-none select-none overflow-hidden rounded-[18px] bg-[#171311] shadow-[0_12px_32px_rgba(32,24,18,.18)] active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#A58A70]"
      onPointerDown={event => {
        if (event.button > 0 || failed || !source.width || !source.height) return;
        const rect = event.currentTarget.getBoundingClientRect();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        drag.current = { x: event.clientX, y: event.clientY, focus, width: rect.width, height: rect.height };
      }}
      onPointerMove={event => {
        const start = drag.current;
        if (!start) return;
        update(focusAfterDrag(start.focus, { x: event.clientX - start.x, y: event.clientY - start.y },
          source, { width: start.width, height: start.height }, scale));
      }}
      onPointerUp={() => { drag.current = null; }}
      onPointerCancel={() => { drag.current = null; }}
      onLostPointerCapture={() => { drag.current = null; }}
      onKeyDown={event => {
        const moves: Record<string, [number, number]> = {
          ArrowLeft: [5, 0], ArrowRight: [-5, 0], ArrowUp: [0, 5], ArrowDown: [0, -5],
        };
        const move = moves[event.key];
        if (!move) return;
        event.preventDefault();
        update({ focusX: focus.focusX + move[0], focusY: focus.focusY + move[1] });
      }}>
      {!failed && moment.url && (moment.kind === "video"
        ? <video src={moment.url} muted autoPlay loop playsInline preload="auto" aria-label={`Video ${number} framing preview`}
            onLoadedMetadata={event => setSource({ width: event.currentTarget.videoWidth, height: event.currentTarget.videoHeight })}
            onError={() => setFailed(true)} style={style} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
        : <img src={moment.url} alt={`Photo ${number} framing preview`} draggable={false}
            onLoad={event => setSource({ width: event.currentTarget.naturalWidth, height: event.currentTarget.naturalHeight })}
            onError={() => setFailed(true)} style={style} className="pointer-events-none absolute inset-0 h-full w-full object-cover" />)}
      {(failed || !moment.url) && <div className="absolute inset-0 grid place-content-center px-5 text-center text-xs leading-5 text-white/80">This moment couldn't preview. Your original is unchanged.</div>}
      <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-black/65 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm"><Move className="size-3.5" /> Drag to reposition</div>
    </div>
    <div className="mt-2 flex items-center justify-center">
      <button type="button" onClick={() => update({ focusX: 50, focusY: 50 })} disabled={failed || !moment.url}
        className="flex min-h-9 items-center gap-1.5 text-[12px] text-[#786450] underline-offset-4 hover:underline disabled:opacity-40"><RotateCcw className="size-3.5" /> Reset position</button>
    </div>
  </div>;
}

/** One quick, deliberate confirmation per uploaded moment. No duplicate uploads
 * or separate save actions; focus edits are written directly to the draft. */
export function KeepFramingReview({ moments, index, onIndex, onFocus, onComplete }: Props) {
  const active = Math.min(Math.max(0, index), Math.max(0, moments.length - 1));
  const moment = moments[active];
  const last = active >= moments.length - 1;
  return <section className="mx-auto max-w-[440px] px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 sm:px-7" aria-label="Review photo and video framing">
    <div className="mb-4 text-center">
      <h1 className="font-display text-[clamp(27px,7vw,36px)] leading-[1.08] tracking-[-.035em] text-[#231C17]">Frame your moments.</h1>
      <p className="mx-auto mt-2 max-w-[34ch] text-[13px] leading-5 text-[#746E67]">Drag each photo or video so the people and details that matter stay in view.</p>
    </div>
    {moment ? <>
      <div className="mx-auto mb-3 flex max-w-[320px] items-center justify-between gap-3">
        <p role="status" aria-live="polite" className="text-[11px] font-semibold uppercase tracking-[.12em] text-[#79654F]">{moment.kind === "video" ? "Video" : "Photo"} {active + 1} of {moments.length}</p>
        <div aria-hidden="true" className="h-1.5 flex-1 overflow-hidden rounded-full bg-[#E2D9CE]"><div className="h-full rounded-full bg-[#9A8065] transition-[width]" style={{ width: `${(active + 1) / moments.length * 100}%` }} /></div>
      </div>
      <FramingSurface key={moment.id} moment={moment} number={active + 1} onFocus={focus => onFocus(moment.id, focus)} />
      <p className="mb-3 text-center text-[11px] leading-4 text-[#746E67]">Previewed at the closest zoom. Gentle motion will be added to your film.</p>
      <div className="flex items-stretch gap-2">
        <Button variant="quiet" size="touch" aria-label="Previous moment" disabled={active === 0} onClick={() => onIndex(active - 1)} className="shrink-0 px-4"><ChevronLeft className="size-5" /></Button>
        <Button variant="keep" size="touch" className="keep-premium-action flex-1 justify-between" onClick={() => last ? onComplete() : onIndex(active + 1)}>
          {last ? "Finish review" : "Next moment"} {last ? <Check className="size-5" /> : <ArrowRight className="size-5" />}
        </Button>
      </div>
    </> : <Button variant="keep" size="touch" onClick={onComplete} className="w-full justify-between">Continue <ArrowRight /></Button>}
  </section>;
}
