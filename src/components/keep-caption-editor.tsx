import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, RotateCcw, X } from "lucide-react";
import type { CaptionCue } from "@/lib/keep-project";

type Props = {
  cues: CaptionCue[]; time: number; style: string; position: "top" | "middle" | "bottom";
  maxLines: number; wordsPerCue: number; syncing: boolean; syncError: boolean;
  timingEstimated: boolean; hasVoice: boolean; canRestore: boolean;
  onClose: () => void; onSeek: (seconds: number) => void;
  onChangeCaption: (index: number, text: string) => void;
  onChangeCaptionTime: (index: number, start: number, end: number) => void;
  onChangeStyle: (style: string) => void; onChangePosition: (position: "top" | "middle" | "bottom") => void;
  onChangeLines: (lines: number) => void; onRegroup: (wordsPerCue: number) => void; onRestore: () => void; onRetrySync: () => void;
};
const coreStyles = ["Clean", "Film", "Story", "Minimal"];
const extraStyles = ["Reel", "None"];
const format = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export function KeepCaptionEditor({
  cues, time, style, position, maxLines, wordsPerCue, syncing, syncError, timingEstimated, hasVoice, canRestore,
  onClose, onSeek, onChangeCaption, onChangeCaptionTime, onChangeStyle, onChangePosition,
  onChangeLines, onRegroup, onRestore, onRetrySync,
}: Props) {
  const [moreStyles, setMoreStyles] = useState(false);
  const current = cues.reduce((last, cue, index) => time + .01 >= cue.start ? index : last, 0);
  const selected = cues[current];
  const choose = (index: number) => { const cue = cues[index]; if (cue) onSeek(cue.start + .02); };
  const changeGrouping = (words: number) => {
    if (words === wordsPerCue) return;
    if (cues.length && !window.confirm("Changing caption length will rebuild caption segments and replace manual text edits. Continue?")) return;
    onRegroup(words);
  };
  const styleButton = (name: string) => <button key={name} type="button" onClick={() => onChangeStyle(name)}
    aria-pressed={style === name} className={`keep-studio-choice min-h-9 px-1 text-[11px] font-medium ${style === name ? "keep-studio-choice--selected" : ""}`}>{name === "None" ? "Hide" : name}</button>;
  return <section className="keep-studio-compact px-3.5 pb-4 pt-3.5" aria-label="Caption editing">
    <div className="flex items-center justify-between gap-3">
      <div><h2 className="font-display text-[25px] leading-none">Captions</h2><p className="mt-1 text-[11px] text-[#BDB3AA]">Your words, in time with your voice.</p></div>
      <button type="button" onClick={onClose} aria-label="Close captions" className="keep-studio-icon-button"><X className="size-4" /></button>
    </div>
    {hasVoice && !cues.length && <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-[#594C3D] px-3 py-2.5">
      <span className="text-[11px]">{syncing ? "Syncing your captions…" : syncError ? "Caption sync needs a retry" : "Captions are not ready yet"}</span>
      {!syncing && <button type="button" onClick={onRetrySync} className="keep-studio-secondary-action shrink-0"><RotateCcw className="size-3.5" /> Generate</button>}
    </div>}
    {selected && <div className="mt-2.5 rounded-xl border border-[#55493F] bg-[#26231F] px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between text-[11px] text-[#E2D8CC]">
        <label htmlFor="keep-current-caption">Edit spoken words</label><span className="tabular-nums text-[#BDB3AA]">{current + 1} / {cues.length}</span>
      </div>
      <textarea id="keep-current-caption" aria-label={`Caption ${current + 1} text`} rows={1} value={selected.text}
        onChange={event => onChangeCaption(current, event.target.value)} className="min-h-11 w-full resize-none rounded-lg border border-[#665849] bg-[#1D1B19] px-3 py-2 text-[14px] leading-5" />
      <div className="mt-2 flex items-center justify-between gap-2">
        <button type="button" onClick={() => choose(current - 1)} disabled={current === 0} className="keep-studio-mini-button"><ChevronLeft className="size-3.5" /> Previous</button>
        <button type="button" onClick={() => choose(current)} className="text-[10px] tabular-nums text-[#D7C2A6]">Preview · {format(selected.start)}</button>
        <button type="button" onClick={() => choose(current + 1)} disabled={current === cues.length - 1} className="keep-studio-mini-button">Next <ChevronRight className="size-3.5" /></button>
      </div>
    </div>}
    <div className="mt-3 grid grid-cols-4 gap-1.5" aria-label="Caption styles">{coreStyles.map(styleButton)}</div>
    {extraStyles.includes(style) && <div className="mt-2 grid grid-cols-2 gap-2">{extraStyles.map(styleButton)}</div>}
    <div className="mt-2 grid grid-cols-3 gap-1.5" aria-label="Caption position">
      {(["top", "middle", "bottom"] as const).map(pos => <button type="button" key={pos} aria-pressed={position === pos}
        onClick={() => onChangePosition(pos)} className={`keep-studio-choice min-h-9 px-2 text-[11px] capitalize ${position === pos ? "keep-studio-choice--selected" : ""}`}>{pos}</button>)}
    </div>
    <details className="keep-studio-more mt-2">
      <summary className="flex min-h-10 cursor-pointer items-center justify-between text-[11px] font-medium text-[#D7C2A6]">
        More caption tools <ChevronDown className="size-4" />
      </summary>
      <div className="space-y-3 border-t border-[#51463E] pt-3">
        {timingEstimated && <p className="text-[11px] leading-5 text-[#DFCCB5]">Caption timing is estimated. You can fine-tune it below.</p>}
        {!extraStyles.includes(style) && <button type="button" onClick={() => setMoreStyles(open => !open)} aria-expanded={moreStyles} className="keep-studio-secondary-action w-full justify-center">
          {moreStyles ? "Hide extra styles" : "More caption styles"}</button>}
        {moreStyles && <div className="grid grid-cols-2 gap-2">{extraStyles.map(styleButton)}</div>}
        {cues.length > 1 && <div><p className="mb-2 text-[11px] text-[#D2C2B2]">Jump to a phrase</p><div className="thin-scroll flex gap-2 overflow-x-auto pb-1" aria-label="Caption phrases">
          {cues.map((cue, i) => <button key={i} type="button" onClick={() => choose(i)} aria-pressed={i === current}
            className={`max-w-44 shrink-0 truncate rounded-lg border px-3 py-2 text-[11px] ${i === current ? "border-[#D2BA99] bg-[#3C322A]" : "border-[#595047]"}`}>{cue.text.trim() || `Caption ${i + 1}`}</button>)}</div></div>}
        <label className="block text-[11px]">Maximum caption lines
          <select value={maxLines} onChange={event => onChangeLines(Number(event.target.value))} aria-label="Maximum caption lines" className="mt-1.5 min-h-10 w-full rounded-lg border border-[#5D4F44] px-3">
            <option value={1}>1 line</option><option value={2}>2 lines</option><option value={3}>3 lines</option>
          </select>
        </label>
        <div><p className="mb-2 text-[11px]">Caption length</p><div className="grid grid-cols-3 gap-2">
          {([{ count: 3, label: "Short" }, { count: 5, label: "Balanced" }, { count: 8, label: "Long" }] as const).map(preset=>
            <button key={preset.count} type="button" disabled={!canRestore} onClick={() => changeGrouping(preset.count)} aria-pressed={wordsPerCue === preset.count}
              className={`keep-studio-choice min-h-10 px-1 text-[11px] disabled:opacity-40 ${wordsPerCue === preset.count ? "keep-studio-choice--selected" : ""}`}>{preset.label}</button>)}</div></div>
        {selected && <div className="grid grid-cols-2 gap-2">
          {(["start", "end"] as const).map(key => <label key={key} className="text-[11px] capitalize">{key} (seconds)
            <input type="number" step={0.1} min={0} value={Number(selected[key].toFixed(1))}
              onChange={event => onChangeCaptionTime(current, key === "start" ? Number(event.target.value) : selected.start, key === "end" ? Number(event.target.value) : selected.end)}
              className="mt-1.5 min-h-10 w-full rounded-lg border border-[#5D4F44] px-3" />
          </label>)}
        </div>}
        {canRestore && <button type="button" className="keep-studio-secondary-action" onClick={() => {
          if (window.confirm("Restore automatic captions? This replaces your manual caption edits.")) onRestore();
        }}><RotateCcw className="size-4" /> Restore synced captions</button>}
      </div>
    </details>
  </section>;
}
