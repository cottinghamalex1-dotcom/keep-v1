import { useState } from "react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Loader2, Play, RotateCcw, X } from "lucide-react";
import type { CaptionCue } from "@/lib/keep-project";
import { CAPTION_SIZE_MIN, CAPTION_SIZE_MAX, CAPTION_SIZE_DEFAULT, normalizeCaptionSize, captionLayout, visibleCaptionChoices } from "../../supabase/functions/keep-render/composition";

type Props = {
  cues: CaptionCue[]; time: number; style: string; position: "top" | "middle" | "bottom";
  maxLines: number; captionSize?: number | undefined; wordsPerCue: number; syncing: boolean; syncError: boolean;
  timingEstimated: boolean; hasVoice: boolean; canRestore: boolean;
  syncProgress?: { completed: number; total: number } | null;
  syncErrorMessage?: string;
  onClose: () => void; onSeek: (seconds: number) => void;
  onChangeCaption: (index: number, text: string) => void;
  onChangeCaptionTime: (index: number, start: number, end: number) => void;
  onChangeStyle: (style: string) => void; onChangePosition: (position: "top" | "middle" | "bottom") => void;
  onChangeLines: (lines: number) => void; onChangeSize: (size: number) => void; onRegroup: (wordsPerCue: number) => void; onRestore: () => void;
  onRetrySync: () => void; onResync: () => void; onPreviewSync: () => void;
};
const format = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export function KeepCaptionEditor({
  cues, time, style, position, maxLines, captionSize, wordsPerCue, syncing, syncError, timingEstimated, hasVoice, canRestore, syncProgress, syncErrorMessage,
  onClose, onSeek, onChangeCaption, onChangeCaptionTime, onChangeStyle, onChangePosition,
  onChangeLines, onChangeSize, onRegroup, onRestore, onRetrySync, onResync, onPreviewSync,
}: Props) {
  const size = normalizeCaptionSize(captionSize);
  const [moreStyles, setMoreStyles] = useState(false);
  const [confirmResync, setConfirmResync] = useState(false);
  const current = cues.reduce((last, cue, index) => time + .01 >= cue.start ? index : last, 0);
  const selected = cues[current];
  const choose = (index: number) => { const cue = cues[index]; if (cue) onSeek(cue.start + .02); };
  const changeGrouping = (words: number) => {
    if (words === wordsPerCue) return;
    if (cues.length && !window.confirm("Changing caption length will rebuild caption segments and replace manual text edits. Continue?")) return;
    onRegroup(words);
  };
  const styleButton = ({ name, note }: { name: string; note: string }) => {
    const layout = captionLayout(name);
    return <button key={name} type="button" onClick={() => onChangeStyle(name)}
      aria-pressed={style === name} aria-label={name === "None" ? "Hide captions" : name} title={note}
      className={`keep-studio-choice min-h-11 min-w-0 px-1.5 text-[11px] leading-snug ${style === name ? "keep-studio-choice--selected" : ""}`}
      style={{ fontFamily: layout.font === "Playfair Display" ? "var(--font-display)" : "var(--font-sans)", fontWeight: layout.weight, fontStyle: layout.italic ? "italic" : "normal", letterSpacing: layout.letterSpacing / 6 + "px", textTransform: layout.textTransform }}>
      {name === "None" ? "Hide" : name}
    </button>;
  };
  return <section className="keep-studio-compact px-3.5 pb-4 pt-3.5" aria-label="Caption editing">
    <div className="flex items-center justify-between gap-3">
      <div><h2 className="font-display text-[25px] leading-none">Captions</h2><p className="mt-1 text-[11px] text-[#BDB3AA]">Your words, in time with your voice.</p></div>
      <button type="button" onClick={onClose} aria-label="Close captions" className="keep-studio-icon-button"><X className="size-4" /></button>
    </div>
    {hasVoice && <div className="mt-3 rounded-xl border border-[#6A5948] bg-[#2C2621] px-3 py-3" aria-label="Caption voice synchronization">
      <div className="flex items-center gap-2 text-[11px] text-[#E3D4C3]" role="status">
        {syncing ? <Loader2 className="size-3.5 shrink-0 animate-spin text-[#D9C0A1]" aria-hidden="true" /> : !syncError && cues.length ? <Check className="size-3.5 shrink-0 text-[#D9C0A1]" aria-hidden="true" /> : <RotateCcw className="size-3.5 shrink-0 text-[#D9C0A1]" aria-hidden="true" />}
        <span>{syncing ? syncProgress?.total ? `Re-aligning captions · section ${syncProgress.completed} of ${syncProgress.total} completed` : "Preparing your saved voice…" : syncError ? "Caption sync needs attention" : cues.length ? timingEstimated ? "Caption timing was estimated — review recommended" : "Captions aligned to your voice" : "Captions aren't ready yet"}</span>
      </div>
      <p className="mt-1 text-[10px] leading-4 text-[#C4B4A2]">Rebuild timing from your saved voice. Your actual recording stays unchanged.</p>
      {syncError && syncErrorMessage && <p role="alert" className="mt-2 text-[11px] leading-5 text-[#F2C3B3]">{syncErrorMessage}</p>}
      <div className="mt-3 flex flex-col gap-2 min-[400px]:flex-row">
        <button type="button" onClick={() => cues.length ? setConfirmResync(true) : onRetrySync()} disabled={syncing}
          className="keep-studio-secondary-action flex min-h-10 flex-1 items-center justify-center gap-2 border-[#9E866D] px-3 text-[11px] font-semibold text-[#F5E5D1] disabled:cursor-not-allowed disabled:opacity-55">
          {syncing ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
          {syncing ? "Syncing…" : "Re-sync captions to voice"}
        </button>
        {cues.length > 0 && <button type="button" onClick={onPreviewSync} disabled={syncing}
          className="keep-studio-secondary-action flex min-h-10 items-center justify-center gap-2 px-3 text-[11px] disabled:opacity-55"><Play className="size-3.5" /> Preview</button>}
      </div>
      {confirmResync && !syncing && <div role="group" aria-label="Confirm caption re-sync" className="mt-3 rounded-lg border border-[#B69A79] bg-[#3C3028] p-3">
        <p className="text-[12px] font-medium text-[#F5E5D1]">Re-sync the captions from your saved voice?</p>
        <p className="mt-1 text-[11px] leading-5 text-[#D5C5B6]">This replaces the old caption text and timing. Your voice recording, photos and film edits stay untouched.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setConfirmResync(false)} className="min-h-11 rounded-lg border border-[#8A7662] px-3 text-[12px]">Cancel</button>
          <button type="button" onClick={() => { setConfirmResync(false); onResync(); }} className="min-h-11 rounded-lg bg-[#F4E8DB] px-3 text-[12px] font-semibold text-[#2C2219]">Re-sync now</button>
        </div>
      </div>}
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
    <div id="studio-caption-options" className="mt-3 grid grid-cols-4 gap-1.5" aria-label="Caption styles">{visibleCaptionChoices(style, moreStyles).map(styleButton)}</div>
    <button type="button" aria-expanded={moreStyles} aria-controls="studio-caption-options" onClick={() => setMoreStyles(open => !open)}
      className="mt-1 flex min-h-10 w-full items-center justify-between text-[11px] font-medium text-[#D7C2A6]">{moreStyles ? "Show fewer caption options" : "Explore more captions"} <ChevronDown className={`size-4 transition-transform ${moreStyles ? "rotate-180" : ""}`} /></button>
    <div className="mt-3 rounded-xl border border-[#55493F] bg-[#26231F] px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="keep-caption-size" className="text-[12px] font-medium text-[#F5E5D1]">Caption size</label>
        <div className="flex items-center gap-3">
          <span className="text-[11px] tabular-nums text-[#E2D8CC]">{size}%</span>
          <button type="button" onClick={() => onChangeSize(CAPTION_SIZE_DEFAULT)} disabled={size === CAPTION_SIZE_DEFAULT}
            className="min-h-9 text-[11px] font-medium text-[#D7C2A6] disabled:opacity-40">Reset size</button>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="text-xs text-[#D7C2A6]">A</span>
        <input id="keep-caption-size" type="range" min={CAPTION_SIZE_MIN} max={CAPTION_SIZE_MAX} step={5}
          value={size} aria-valuetext={`${size}% of original`} onChange={event => onChangeSize(Number(event.target.value))}
          className="h-10 w-full min-w-0 accent-[#E2C9A9]" />
        <span aria-hidden="true" className="text-xl text-[#D7C2A6]">A</span>
      </div>
    </div>
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
