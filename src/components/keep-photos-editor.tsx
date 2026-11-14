import { useRef } from "react";
import { ChevronLeft, ChevronRight, Images, Play, Plus, Trash2, X } from "lucide-react";
import type { MediaItem } from "@/lib/keep-project";

type Transition = NonNullable<MediaItem["transition"]>;
type Props = {
  moments: MediaItem[];
  selectedIndex: number;
  onClose: () => void;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onReplace: () => void;
  onMove: (from: number, to: number) => void;
  onTransition: (transition: Transition) => void;
  onPreviewTransition: () => void;
  onRemove: () => void;
};
export function KeepPhotosEditor({ moments, selectedIndex, onClose, onSelect, onAdd, onReplace,
  onMove, onTransition, onPreviewTransition, onRemove }: Props) {
  const dragging = useRef<number | null>(null);
  const selected = moments[selectedIndex];
  const canTransition = selectedIndex < moments.length - 1;
  return <section className="keep-studio-compact p-3.5 sm:p-4" aria-label="Photos">
    <div className="flex items-center justify-between gap-3">
      <div><h2 className="font-display text-[25px] leading-none">Photos</h2>
        <p className="mt-1 text-[11px] text-[#BDB3AA]">Choose a moment to refine.</p></div>
      <button type="button" onClick={onClose} aria-label="Close Photos" className="keep-studio-icon-button"><X className="size-4" /></button>
    </div>
    <div className="thin-scroll mt-2.5 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Choose a photo to edit">
      {moments.map((item,index) =>
        <button key={item.id} type="button" draggable={typeof window !== "undefined" && window.matchMedia("(hover:hover) and (pointer:fine)").matches}
          onDragStart={() => {dragging.current=index;}} onDragEnd={() => {dragging.current=null;}}
          onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();if(dragging.current!==null)onMove(dragging.current,index);dragging.current=null;}}
          onClick={()=>{if(dragging.current===null)onSelect(index);}} aria-label={`Select photo ${index+1} of ${moments.length}`} aria-pressed={index===selectedIndex}
          className={`relative h-[70px] w-[52px] shrink-0 overflow-hidden rounded-lg border border-[#625447] bg-[#312A25] p-0 ${index===selectedIndex?"ring-2 ring-[#D2BA99]":"opacity-80"}`}>
          {item.kind==="video"
            ? <video src={item.url} muted playsInline preload="metadata" className="h-full w-full object-cover" />
            : <img src={item.url} alt="" loading="lazy" className="h-full w-full object-cover" />}
          {item.kind==="video" && <Play className="absolute bottom-1 left-1 size-3 text-white" fill="currentColor" />}
        </button>)}
    </div>
    <div className="mt-2 grid grid-cols-2 gap-2">
      <button type="button" onClick={onAdd} className="keep-studio-secondary-action justify-center"><Plus className="size-4"/> Add moments</button>
      <button type="button" onClick={onReplace} className="keep-studio-secondary-action justify-center"><Images className="size-4"/> Replace</button>
    </div>
    <div className="mt-2 flex items-center gap-2">
      <span className="shrink-0 text-[10px] text-[#D1C0AC]">Transition</span>
      {([{key:"fade",label:"Fade"},{key:"dissolve",label:"Dissolve"},{key:"cut",label:"Cut"}] as const).map(option=>
        <button type="button" key={option.key} disabled={!canTransition} aria-pressed={(selected?.transition??"dissolve")===option.key}
          onClick={()=>onTransition(option.key)}
          className={`keep-studio-choice min-h-9 min-w-0 flex-1 px-1 text-[10px] disabled:opacity-30 ${(selected?.transition??"dissolve")===option.key?"keep-studio-choice--selected":""}`}>{option.label}</button>)}
    </div>
    <details className="keep-studio-more mt-2">
      <summary className="flex min-h-10 cursor-pointer items-center justify-between text-[11px] text-[#D7C2A6]">
        More photo tools <ChevronRight className="size-4" />
      </summary>
      <div className="space-y-3 border-t border-[#51463E] pt-3">
        <p className="text-[11px] leading-5 text-[#BDB1A5]">Drag the photo in the preview above to adjust framing. Gentle motion is applied automatically.</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={selectedIndex===0} onClick={()=>onMove(selectedIndex,selectedIndex-1)} className="keep-studio-secondary-action justify-center disabled:opacity-40"><ChevronLeft className="size-4"/> Earlier</button>
          <button type="button" disabled={!canTransition} onClick={()=>onMove(selectedIndex,selectedIndex+1)} className="keep-studio-secondary-action justify-center disabled:opacity-40">Later <ChevronRight className="size-4"/></button>
        </div>
        <button type="button" disabled={!canTransition} onClick={onPreviewTransition} className="keep-studio-secondary-action w-full justify-center disabled:opacity-40"><Play className="size-4"/>Preview transition</button>
        <button type="button" disabled={moments.length<=1} onClick={onRemove} className="keep-studio-secondary-action text-[#E2B9AE] disabled:opacity-40"><Trash2 className="size-4"/> Remove moment</button>
      </div>
    </details>
  </section>;
}
