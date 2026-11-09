import { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, X } from "lucide-react";
import type { CaptionCue } from "@/lib/keep-project";

type Props = {
  cues: CaptionCue[];
  time: number;
  style: string;
  position: "top" | "middle" | "bottom";
  maxLines: number;
  wordsPerCue: number;
  syncing: boolean;
  syncError: boolean;
  hasVoice: boolean;
  canRestore: boolean;
  onClose: () => void;
  onSeek: (seconds: number) => void;
  onChangeCaption: (index: number, text: string) => void;
  onChangeCaptionTime: (index: number, start: number, end: number) => void;
  onChangeStyle: (style: string) => void;
  onChangePosition: (position: "top" | "middle" | "bottom") => void;
  onChangeLines: (lines: number) => void;
  onRegroup: (wordsPerCue: number) => void;
  onRestore: () => void;
  onRetrySync: () => void;
};

const mainStyles = ["Clean", "Film", "Story", "Minimal"];
const extraStyles = ["Reel", "None"];
const format = (time: number) => `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, "0")}`;

/** One caption at a time; text edits are visible instantly in the film above. */
export function KeepCaptionEditor({
  cues, time, style, position, maxLines, wordsPerCue, syncing, syncError, hasVoice,
  canRestore, onClose, onSeek, onChangeCaption, onChangeCaptionTime, onChangeStyle,
  onChangePosition, onChangeLines, onRegroup, onRestore, onRetrySync,
}: Props) {
  const [moreOptions, setMoreOptions] = useState(false);
  const [moreStyles, setMoreStyles] = useState(false);
  const current = cues.reduce((last, cue, index) => time + .01 >= cue.start ? index : last, 0);
  const selected = cues[current];
  const select = (index: number) => {
    const cue = cues[index];
    if (cue) onSeek(cue.start + .02);
  };
  const changeGrouping = (count: number) => {
    if (count === wordsPerCue) return;
    if (cues.length && !window.confirm("Change caption length? This will rebuild caption segments from the original transcript and replace any manual text edits.")) return;
    onRegroup(count);
  };
  return <section className="keep-caption-editor px-5 pb-6 pt-5" aria-label="Caption editing">
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="font-display text-[28px] leading-tight text-foreground">Captions</h2>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">Edit the words, then see them change above.</p>
      </div>
      <button type="button" onClick={onClose} aria-label="Close captions" className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border text-foreground">
        <X className="size-4" />
      </button>
    </div>

    {hasVoice && !cues.length && <div className="mt-5 rounded-xl border border-border bg-card p-4">
      <p className="text-sm font-medium">{syncing ? "Syncing your spoken words…" : syncError ? "Captions couldn't sync" : "No captions yet"}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">Your voice recording is saved. Generate timed captions to edit them here.</p>
      {!syncing && <button type="button" onClick={onRetrySync} className="mt-4 rounded-lg bg-[#E8E1D7] px-4 py-3 text-xs font-medium text-[#111113]">
        <RotateCcw className="mr-2 inline size-3.5" />Generate captions
      </button>}
    </div>}

    {selected && <div className="mt-6 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor="keep-current-caption" className="text-sm font-medium text-foreground">Edit these words</label>
        <span className="text-xs tabular-nums text-muted-foreground">{current + 1} of {cues.length}</span>
      </div>
      <textarea id="keep-current-caption" aria-label={`Caption ${current + 1} text`} rows={2} value={selected.text}
        onChange={(e) => onChangeCaption(current, e.target.value)}
        className="mt-3 min-h-24 w-full resize-y rounded-lg border border-border bg-background px-4 py-3 text-base leading-6 text-foreground outline-none focus:border-[#D2BA99]"
      />
      <div className="mt-3 flex items-center justify-between gap-2">
        <button type="button" disabled={current === 0} onClick={() => select(current - 1)} className="flex min-h-11 items-center gap-1 rounded-lg border border-border px-3 text-xs disabled:opacity-30"><ChevronLeft className="size-4" />Previous</button>
        <button type="button" onClick={() => select(current)} className="min-h-11 text-xs text-[#D2BA99]">Preview · {format(selected.start)}</button>
        <button type="button" disabled={current === cues.length - 1} onClick={() => select(current + 1)} className="flex min-h-11 items-center gap-1 rounded-lg border border-border px-3 text-xs disabled:opacity-30">Next<ChevronRight className="size-4" /></button>
      </div>
      <p className="mt-3 text-[11px] leading-5 text-muted-foreground">Changes update the video instantly. Use Previous and Next to edit another phrase.</p>
    </div>}

    {cues.length > 1 && <div className="mt-5">
      <p className="mb-2 text-xs font-medium text-foreground">Jump to a caption</p>
      <div className="thin-scroll flex gap-2 overflow-x-auto pb-2" aria-label="Caption phrases">
        {cues.map((cue, index) => <button key={index} type="button" onClick={() => select(index)} aria-pressed={index === current}
          className={`max-w-44 shrink-0 overflow-hidden text-ellipsis whitespace-nowrap rounded-lg border px-3 py-2 text-xs ${index === current ? "border-[#D2BA99] bg-[#3A3236] text-[#FFF5E8]" : "border-border bg-card text-muted-foreground"}`}>
          {cue.text.trim() || `Caption ${index + 1}`}
        </button>)}
      </div>
    </div>}

    <div className="mt-6">
      <p className="mb-3 text-sm font-medium">Caption style</p>
      <div className="grid grid-cols-4 gap-2">
        {mainStyles.map((name) => <button key={name} type="button" onClick={() => onChangeStyle(name)} aria-pressed={style === name}
          className={`min-h-12 rounded-lg border px-1 text-xs ${style === name ? "border-[#D2BA99] bg-[#E8E1D7] font-medium text-[#111113]" : "border-border bg-card text-foreground"}`}>
          {name}
        </button>)}
      </div>
      <button type="button" onClick={() => setMoreStyles((open) => !open)} aria-expanded={moreStyles} className="mt-3 text-xs text-[#D2BA99]">
        {moreStyles ? "Fewer styles" : "More styles"}
      </button>
      {moreStyles && <div className="mt-2 grid grid-cols-2 gap-2">
        {extraStyles.map((name) => <button key={name} type="button" onClick={() => onChangeStyle(name)} aria-pressed={style === name}
          className={`min-h-11 rounded-lg border text-xs ${style === name ? "border-[#D2BA99] bg-[#E8E1D7] text-[#111113]" : "border-border bg-card text-foreground"}`}>
          {name === "None" ? "Hide captions" : name}
        </button>)}
      </div>}
    </div>

    <div className="mt-5">
      <p className="mb-3 text-sm font-medium">Where should captions appear?</p>
      <div className="grid grid-cols-3 gap-2">
        {([{ key: "top", label: "Top" }, { key: "middle", label: "Middle" }, { key: "bottom", label: "Bottom" }] as const).map((option) => <button type="button" key={option.key} onClick={() => onChangePosition(option.key)} aria-pressed={position === option.key}
          className={`min-h-11 rounded-lg border text-xs ${position === option.key ? "border-[#D2BA99] bg-[#E8E1D7] font-medium text-[#111113]" : "border-border bg-card text-foreground"}`}>
          {option.label}
        </button>)}
      </div>
    </div>

    <div className="mt-6 border-t border-border pt-4">
      <button type="button" aria-expanded={moreOptions} onClick={() => setMoreOptions((open) => !open)} className="flex w-full items-center justify-between py-2 text-left text-sm font-medium">
        More caption settings <ChevronRight className={`size-4 transition-transform ${moreOptions ? "rotate-90" : ""}`} />
      </button>
      {moreOptions && <div className="mt-4 space-y-5 rounded-xl border border-border bg-card p-4">
        <div>
          <label htmlFor="keep-caption-lines" className="mb-2 block text-xs font-medium">Maximum lines on screen</label>
          <select id="keep-caption-lines" value={maxLines} onChange={(e) => onChangeLines(Number(e.target.value))} className="min-h-11 w-full rounded-lg border border-border bg-background px-3 text-sm">
            <option value={1}>1 line</option><option value={2}>2 lines</option><option value={3}>3 lines</option>
          </select>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium">Caption length</p>
          <p className="mb-3 text-[11px] leading-5 text-muted-foreground">Choose how many spoken words appear together. This rebuilds the automatic captions.</p>
          <div className="grid grid-cols-3 gap-2">
            {([{ count: 3, label: "Short" }, { count: 5, label: "Balanced" }, { count: 8, label: "Long" }] as const).map((preset) => <button type="button" key={preset.count} onClick={() => changeGrouping(preset.count)}
              className={`rounded-lg border px-1 py-3 text-xs ${wordsPerCue === preset.count ? "border-[#D2BA99] bg-[#E8E1D7] text-[#111113]" : "border-border text-foreground"}`}>
              {preset.label}
            </button>)}
          </div>
          {![3, 5, 8].includes(wordsPerCue) && <p className="mt-2 text-[11px] text-muted-foreground">Current: {wordsPerCue} words per caption</p>}
        </div>
        {selected && <div>
          <p className="mb-2 text-xs font-medium">Fine-tune this caption's timing</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-muted-foreground">Start (seconds)
              <input type="number" min="0" step=".1" value={Number(selected.start.toFixed(1))}
                onChange={(e) => onChangeCaptionTime(current, Number(e.target.value), selected.end)}
                className="mt-2 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-foreground" />
            </label>
            <label className="text-xs text-muted-foreground">End (seconds)
              <input type="number" min="0" step=".1" value={Number(selected.end.toFixed(1))}
                onChange={(e) => onChangeCaptionTime(current, selected.start, Number(e.target.value))}
                className="mt-2 min-h-11 w-full rounded-lg border border-border bg-background px-3 text-foreground" />
            </label>
          </div>
        </div>}
        {canRestore && <button type="button" onClick={() => {
          if (window.confirm("Restore automatic caption text and timing? This will replace your manual caption edits.")) onRestore();
        }} className="inline-flex min-h-11 items-center gap-2 text-xs text-[#D2BA99]">
          <RotateCcw className="size-3.5" /> Restore automatic captions
        </button>}
      </div>}
    </div>
  </section>;
}
