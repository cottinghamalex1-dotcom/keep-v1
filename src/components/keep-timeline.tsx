import { useRef, type PointerEvent } from "react";
import { Captions, GripVertical, Mic2, Music2, Play, Plus } from "lucide-react";
import type { CaptionCue, MediaItem } from "@/lib/keep-project";

type Props = {
  media: MediaItem[];
  captions: CaptionCue[];
  duration: number;
  time: number;
  selectedIndex: number;
  voicePresent: boolean;
  musicMood: string;
  onSeek: (seconds: number) => void;
  onSelect: (index: number) => void;
  onMove: (from: number, to: number) => void;
  onDuration: (index: number, seconds: number) => void;
  onCaption: (index: number) => void;
  onAdd: () => void;
  onVoice: () => void;
  onMusic: () => void;
};
const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const format = (n: number) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2,"0")}`;
export function KeepTimeline({ media, captions, duration, time, selectedIndex, voicePresent, musicMood, onSeek, onSelect, onMove, onDuration, onCaption, onAdd, onVoice, onMusic }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const drag = useRef<{index:number;x:number;width:number;duration:number}|null>(null);
  const total = media.reduce((sum, m) => sum + Math.max(1,m.displayDurationSec ?? 7),0) || 1;
  const safeDuration = Math.max(1,duration);
  const scale = Math.max(2.1, Math.min(12, 550 / safeDuration));
  const timelineWidth = Math.max(340, safeDuration * scale);
  const seekFromPointer = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onSeek(clamp((e.clientX - rect.left) / rect.width,0,1) * safeDuration);
  };
  let elapsed = 0;
  return <section aria-label="Keep multitrack timeline" className="border-t border-white/10 bg-[#131315] px-3 pb-3 pt-3 text-white">
    <div className="mb-2 flex items-center justify-between gap-3">
      <div><p className="text-[11px] font-semibold tracking-wide">Your story timeline</p><p className="text-[10px] text-white/45">Tap a clip to edit · drag the playhead to preview</p></div>
      <span className="rounded-md bg-white/10 px-2 py-1 font-mono text-[11px] tabular-nums">{format(time)} / {format(safeDuration)}</span>
    </div>
    <div className="flex gap-2">
      <div className="flex w-12 shrink-0 flex-col gap-1 pt-6 text-[9px] text-white/55">
        <div className="flex h-[66px] items-center">Photos</div>
        <div className="flex h-8 items-center">Captions</div>
        <div className="flex h-8 items-center">Voice</div>
        <div className="flex h-8 items-center">Music</div>
      </div>
      <div ref={scroller} className="thin-scroll min-w-0 flex-1 overflow-x-auto pb-2">
        <div className="relative select-none" style={{width:timelineWidth}}>
          <div className="relative mb-1 h-5 border-b border-white/15 text-[9px] text-white/45" onPointerDown={seekFromPointer}>
            {Array.from({length:Math.ceil(safeDuration/10)+1},(_,i)=><span key={i} className="absolute top-0 -translate-x-1/2" style={{left:`${i*10/safeDuration*100}%`}}>{format(i*10)}</span>)}
          </div>
          <div className="relative flex h-[66px] gap-[2px]">
            {media.map((m,i)=>{
              const segment = Math.max(1,m.displayDurationSec ?? 7)/total*100;
              const start = elapsed; elapsed += segment;
              return <div key={m.id} className={`group relative h-full shrink-0 overflow-hidden rounded-md border ${i===selectedIndex?"border-[#e5c69b] ring-1 ring-[#e5c69b]":"border-white/20"}`} style={{width:`calc(${segment}% - 2px)`}}>
                <button type="button" aria-label={`Edit photo ${i+1}`} className="relative h-full w-full" onClick={()=>{onSelect(i);onSeek(start/100*safeDuration);}}>
                  {m.kind==="video"?<video src={m.url} muted playsInline preload="metadata" className="h-full w-full object-cover"/>:<img src={m.url} alt="" className="h-full w-full object-cover"/>}
                  <span className="absolute bottom-1 left-1 rounded bg-black/65 px-1 text-[9px]">{Math.round(m.displayDurationSec ?? 7)}s</span>
                </button>
                <button type="button" aria-label={`Move photo ${i+1} earlier`} disabled={i===0} className="absolute left-0 top-0 bg-black/65 px-1.5 text-[11px] disabled:opacity-20" onClick={()=>onMove(i,i-1)}>‹</button>
                <button type="button" aria-label={`Move photo ${i+1} later`} disabled={i===media.length-1} className="absolute right-0 top-0 bg-black/65 px-1.5 text-[11px] disabled:opacity-20" onClick={()=>onMove(i,i+1)}>›</button>
                <div role="slider" tabIndex={0} aria-label={`Duration for photo ${i+1}`} aria-valuemin={2} aria-valuemax={20} aria-valuenow={m.displayDurationSec ?? 7} className="absolute bottom-0 right-0 top-6 w-2 cursor-ew-resize touch-none bg-white/30" onPointerDown={e=>{e.stopPropagation();e.currentTarget.setPointerCapture(e.pointerId);drag.current={index:i,x:e.clientX,width:timelineWidth,duration:m.displayDurationSec??7};}} onPointerMove={e=>{if(!drag.current||drag.current.index!==i)return;const delta=(e.clientX-drag.current.x)/drag.current.width*total;onDuration(i,Math.round(clamp(drag.current.duration+delta,2,20)*2)/2);}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onKeyDown={e=>{if(e.key==="ArrowLeft"||e.key==="ArrowRight"){e.preventDefault();onDuration(i,clamp((m.displayDurationSec??7)+(e.key==="ArrowRight"?.5:-.5),2,20));}}}><GripVertical className="absolute -left-1 top-1/2 size-3 -translate-y-1/2"/></div>
              </div>;
            })}
            <button type="button" onClick={onAdd} className="flex h-full min-w-10 items-center justify-center rounded border border-dashed border-white/30 text-white/60"><Plus className="size-4"/></button>
          </div>
          <div className="relative mt-1 h-8 rounded bg-[#59467a]/20" onPointerDown={seekFromPointer}>
            {captions.map((cue,i)=><button key={i} type="button" onClick={e=>{e.stopPropagation();onCaption(i);onSeek(cue.start);}} title={cue.text} className="absolute top-0 h-8 overflow-hidden rounded border border-[#b39ad5]/50 bg-[#59467a]/80 px-1 text-left text-[9px] leading-8 text-white" style={{left:`${clamp(cue.start/safeDuration*100,0,100)}%`,width:`${clamp((cue.end-cue.start)/safeDuration*100,.8,100)}%`}}>{cue.text}</button>)}
            {!captions.length&&<span className="flex h-full items-center gap-2 px-2 text-[10px] text-white/40"><Captions className="size-3"/> Add timed captions</span>}
          </div>
          <button type="button" onClick={onVoice} className="relative mt-1 flex h-8 w-full items-center overflow-hidden rounded bg-[#397c70]/60 px-2 text-left text-[10px]"><Mic2 className="mr-2 size-3"/>{voicePresent?"Your voice · narration":"Record your voice"}<span className="ml-auto flex h-4 items-end gap-[3px] opacity-40">{Array.from({length:45},(_,i)=><span key={i} className="w-[2px] bg-white" style={{height:`${4+(i*13%11)}px`}}/>)}</span></button>
          <button type="button" onClick={onMusic} className="mt-1 flex h-8 w-full items-center gap-2 rounded bg-[#886e41]/60 px-2 text-left text-[10px]"><Music2 className="size-3"/>{musicMood}</button>
          <div className="pointer-events-none absolute bottom-0 top-5 z-10 w-[2px] bg-[#f6e2c2]" style={{left:`${clamp(time/safeDuration*100,0,100)}%`}}><div className="absolute -left-[5px] -top-1 h-3 w-3 rounded-full bg-[#f6e2c2]"/></div>
        </div>
      </div>
    </div>
    <div className="mt-1 flex items-center gap-2 text-[10px] text-white/45"><Play className="size-3"/> Photos, captions, voice and music stay aligned to one timeline.</div>
  </section>;
}
