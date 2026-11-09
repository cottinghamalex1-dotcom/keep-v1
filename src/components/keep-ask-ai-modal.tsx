import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, ChevronDown, RotateCcw, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export type KeepRevision = { paragraphs: string[]; changedIndexes: number[]; note: string };
type Scope = "section" | "message";

const fullMessageActions = [
  { label: "Make this longer", hint: "Build the story with meaningful details" },
  { label: "Make it more personal", hint: "Bring more of your real memories into it" },
  { label: "Make it more emotional", hint: "Say what you feel more openly" },
  { label: "Make it flow better", hint: "Shape a stronger beginning-to-end story" },
  { label: "Strengthen the ending", hint: "Give the final words more impact" },
];
const paragraphActions = [
  { label: "Make this sound more like me", hint: "Keep my natural way of speaking" },
  { label: "Deepen this section", hint: "Make the feeling more specific" },
  { label: "Shorten this section", hint: "Keep only the strongest words" },
  { label: "Bring in a memory", hint: "Use a real detail I've already shared" },
];

// Word-level longest-common-subsequence, retaining the exact whitespace.
// Never insert revision text as HTML: React escapes every piece safely.
export function KeepWordChanges({ before, after }: { before: string; after: string }) {
  const spans = useMemo(() => {
    const oldWords = before.match(/\S+|\s+/g) ?? [];
    const newWords = after.match(/\S+|\s+/g) ?? [];
    if (oldWords.length * newWords.length > 500000) return [{ text: after, added: before !== after }];
    const n = oldWords.length, m = newWords.length;
    const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
      dp[i]![j] = oldWords[i] === newWords[j] ? (dp[i + 1]![j + 1] ?? 0) + 1 : Math.max(dp[i + 1]![j] ?? 0, dp[i]![j + 1] ?? 0);
    const out: { text: string; added: boolean }[] = [];
    const push = (text: string, added: boolean) => {
      const last = out[out.length - 1];
      if (last && last.added === added) last.text += text;
      else out.push({ text, added });
    };
    let i = 0, j = 0;
    while (j < m) {
      if (i < n && oldWords[i] === newWords[j]) { push(newWords[j]!, false); i++; j++; }
      else if (i < n && (dp[i + 1]?.[j] ?? 0) >= (dp[i]?.[j + 1] ?? 0)) i++;
      else { push(newWords[j]!, true); j++; }
    }
    return out;
  }, [before, after]);
  return <>{spans.map((piece, index) => piece.added
    ? <mark key={index} className="rounded-[3px] bg-[#E8D4B2] px-[2px] text-[#302417] box-decoration-clone">{piece.text}</mark>
    : <span key={index}>{piece.text}</span>)}</>;
}

type Props = {
  paragraphs: string[];
  activeParagraph: number;
  onParagraph: (index: number) => void;
  busy: boolean;
  error: string;
  suggestion: KeepRevision | null;
  instruction: string;
  scope: Scope;
  onAction: (instruction: string, scope: Scope) => void;
  onApply: () => void;
  onDismiss: () => void;
};

export function KeepAskAIModal({ paragraphs, activeParagraph, onParagraph, busy, error, suggestion, instruction, scope, onAction, onApply, onDismiss }: Props) {
  const [selectedScope, setSelectedScope] = useState<Scope>("message");
  const [custom, setCustom] = useState("");
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) onDismiss(); };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [busy, onDismiss]);
  const actualChanges = suggestion
    ? suggestion.paragraphs.map((p, i) => p !== paragraphs[i] ? i : -1).filter((i) => i >= 0)
    : [];
  const actions = selectedScope === "message" ? fullMessageActions : paragraphActions;
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#111113]/65 px-3 py-[max(12px,env(safe-area-inset-top))] backdrop-blur-[5px]" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onDismiss(); }}>
    <section role="dialog" aria-modal="true" aria-label="Ask Keep AI" aria-describedby="keep-ai-description" className="flex max-h-[min(850px,calc(100dvh-24px))] w-full max-w-[510px] flex-col overflow-hidden rounded-[22px] border border-[#E2DAD0] bg-[#F7F5F2] text-[#161412] shadow-[0_28px_90px_rgba(0,0,0,.32)]">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-[#E1DAD0] px-6 pb-5 pt-6 sm:px-8">
        <div>
          <div className="mb-4 flex size-10 items-center justify-center rounded-full border border-[#D8C5AC] bg-[#EAE1D7]"><Sparkles className="size-5 text-[#6A5849]" strokeWidth={1.7}/></div>
          <h2 className="font-display text-[34px] leading-[1.07] tracking-[-.035em]">Ask Keep AI</h2>
          <p id="keep-ai-description" className="mt-2 text-[12px] leading-5 text-[#786F65]">{suggestion ? "See your changes before deciding." : "Make the words feel even more like yours."}</p>
        </div>
        <button type="button" aria-label="Close Ask Keep AI" disabled={busy} onClick={onDismiss} className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#D8D0C6] text-[#554B42] disabled:opacity-40"><X className="size-4"/></button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 sm:px-8">
        {suggestion ? <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-[#6A5849]">Suggested revision</p>
            <span className="flex items-center gap-1.5 text-[11px] text-[#766B60]"><span className="inline-block size-3 rounded-sm bg-[#E8D4B2]"/> New or rewritten words</span>
          </div>
          {actualChanges.length ? <div className="space-y-3">
            {actualChanges.map((index) => <article key={index} className="rounded-xl border border-[#DACDBD] bg-white/70 px-4 py-4">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.12em] text-[#95775F]">Paragraph {index + 1} · updated</p>
              <p className="whitespace-pre-wrap font-display text-[20px] leading-[1.48] text-[#181715]"><KeepWordChanges before={paragraphs[index] ?? ""} after={suggestion.paragraphs[index] ?? ""}/></p>
              <details className="mt-4 border-t border-[#E8E0D7] pt-3">
                <summary className="cursor-pointer text-[11px] text-[#766B60]">See original wording</summary>
                <p className="mt-2 whitespace-pre-wrap text-[12px] leading-5 text-[#766B60]">{paragraphs[index] ?? "New paragraph"}</p>
              </details>
            </article>)}
          </div> : <div className="rounded-xl border border-[#DDD5CA] p-4 text-[13px] leading-6 text-[#766B60]">Keep couldn't make a meaningful change from the available details. Your original words are unchanged.</div>}
          {!!suggestion.note && <p className="mt-4 text-[12px] leading-6 text-[#766B60]">{suggestion.note}</p>}
        </> : <>
          <div className="mb-5 grid grid-cols-2 gap-2 rounded-xl border border-[#D8D0C6] bg-[#EEEAE4] p-1">
            {([{ value: "message", title: "Whole message" }, { value: "section", title: "One paragraph" }] as const).map((option) =>
              <button key={option.value} type="button" disabled={busy} aria-pressed={selectedScope === option.value} onClick={() => setSelectedScope(option.value)} className={`min-h-11 rounded-lg text-[12px] font-medium transition-colors ${selectedScope === option.value ? "bg-[#28231F] text-[#FAF8F5]" : "text-[#6E655C]"}`}>{option.title}</button>)}
          </div>
          {selectedScope === "section" && <div className="mb-5">
            <label htmlFor="keep-ai-paragraph" className="mb-2 block text-[12px] font-medium text-[#554B42]">Choose a paragraph to refine</label>
            <div className="relative">
              <select id="keep-ai-paragraph" disabled={busy} value={Math.min(activeParagraph, Math.max(0, paragraphs.length - 1))} onChange={(event) => onParagraph(Number(event.target.value))} className="min-h-13 w-full appearance-none rounded-xl border border-[#CDC2B6] bg-white px-4 pr-10 text-[13px] text-[#27211C] outline-none focus:border-[#6A5849]">
                {paragraphs.map((p, i) => <option key={i} value={i}>Paragraph {i + 1} — {p.replace(/\s+/g, " ").slice(0, 52)}{p.length > 52 ? "…" : ""}</option>)}
              </select><ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[#6A5849]"/>
            </div>
            <p className="mt-3 line-clamp-3 rounded-lg border-l-2 border-[#A98D72] bg-white/60 px-4 py-3 font-display text-[17px] leading-6">{paragraphs[activeParagraph] ?? ""}</p>
          </div>}
          <div className="space-y-2">
            {actions.map((action) => <button key={action.label} type="button" disabled={busy} onClick={() => onAction(action.label, selectedScope)} className="group flex min-h-[65px] w-full items-center justify-between gap-3 rounded-xl border border-[#DCD3C8] bg-white/75 px-4 py-3 text-left transition-colors hover:border-[#9E856B] hover:bg-[#F0E8DE] disabled:opacity-40">
              <span className="min-w-0"><span className="block text-[13px] font-medium text-[#211C18]">{action.label}</span><span className="mt-1 block text-[11px] leading-4 text-[#7F7469]">{action.hint}</span></span><ArrowRight className="size-4 shrink-0 text-[#9D856D] transition-transform group-hover:translate-x-0.5"/>
            </button>)}
          </div>
          <div className="mt-6 border-t border-[#DED5CB] pt-5">
            <label htmlFor="keep-ai-custom" className="block text-[12px] font-medium text-[#554B42]">Or describe your own edit</label>
            <textarea id="keep-ai-custom" rows={3} maxLength={500} value={custom} onChange={(event) => setCustom(event.target.value)} placeholder="Make this warmer and more personal…" className="mt-3 w-full resize-none rounded-xl border border-[#D0C5B9] bg-white p-4 text-[16px] leading-6 text-[#211C18] outline-none placeholder:text-[#998E83] focus:border-[#6A5849]"/>
            <Button variant="keep" size="touch" disabled={busy || !custom.trim()} onClick={() => onAction(custom, selectedScope)} className="mt-2 w-full justify-between !bg-[#25211E] !text-white">Refine my words <Sparkles className="size-4"/></Button>
          </div>
        </>}
        {!!error && <div role="alert" className="mt-4 rounded-xl border border-[#B78F82] bg-[#F5E9E5] p-4 text-[12px] leading-5 text-[#6D3F32]">{error}</div>}
      </div>
      {suggestion && <footer className="shrink-0 space-y-2 border-t border-[#DDD5CA] bg-[#F7F5F2] px-6 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 sm:px-8">
        <Button variant="keep" size="touch" disabled={busy || actualChanges.length === 0} className="w-full justify-between !bg-[#25211E] !text-white" onClick={onApply}>Use this version <Check className="size-4"/></Button>
        <div className="flex items-center justify-between gap-3">
          <Button variant="bare" size="sm" disabled={busy} className="text-[#554B42]" onClick={() => onAction(instruction, scope)}><RotateCcw className="size-4"/> Try again</Button>
          <Button variant="bare" size="sm" disabled={busy} className="text-[#554B42]" onClick={onDismiss}>Keep original</Button>
        </div>
      </footer>}
      {busy && <div role="status" aria-live="polite" className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#F7F5F2]/94 px-8 text-center backdrop-blur-[3px]">
        <Sparkles className="mb-5 size-8 animate-pulse text-[#9D856D]"/>
        <h3 className="font-display text-[29px]">Reworking your words.</h3>
        <p className="mt-2 text-[12px] leading-5 text-[#786F65]">Making a thoughtful, noticeable change while keeping your story true.</p>
      </div>}
    </section>
  </div>;
}
