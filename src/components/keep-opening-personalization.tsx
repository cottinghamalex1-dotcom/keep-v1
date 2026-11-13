import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { fetchOpeningSuggestions } from "@/lib/keep-ai";
import { KeepCardFront } from "@/components/keep-card-front";
import type { KeepProject } from "@/lib/keep-project";
import { Button } from "@/components/ui/button";

type OpeningFields = Pick<KeepProject, "openingMessage" | "engraveOpeningMessage" | "openingMessageSuggestions" | "openingSuggestionsFor" | "cardEngraving">;
type Props = {
  project: KeepProject;
  onUpdate: (updates: Partial<OpeningFields>) => void;
  onPreview: () => void;
  disabled?: boolean;
};

function fingerprint(project: KeepProject): string {
  const source = [project.recipientName, project.occasion, ...project.messageParagraphs].join("\u001f");
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619);
  return source.length + "-" + (hash >>> 0).toString(16);
}

/** The chosen message is identical in the first-play reveal and the card preview. */
export function KeepOpeningPersonalization({ project, onUpdate, onPreview, disabled }: Props) {
  const key = fingerprint(project);
  const isCached = project.openingSuggestionsFor === key && project.openingMessageSuggestions?.length === 3;
  const attempted = useRef("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [retry, setRetry] = useState(0);
  const selected = !!project.engraveOpeningMessage && !!project.openingMessage?.trim();
  const choose = (message: string) => onUpdate({ openingMessage: message, engraveOpeningMessage: !!message.trim() });
  useEffect(() => {
    if (isCached || !project.messageParagraphs.some(p => p.trim()) || attempted.current === key) return;
    attempted.current = key;
    let cancelled = false;
    setStatus("loading");
    void fetchOpeningSuggestions(project.recipientName, project.occasion, project.messageParagraphs)
      .then(suggestions => {
        if (cancelled) return;
        onUpdate({ openingMessageSuggestions: suggestions, openingSuggestionsFor: key });
        setStatus("idle");
      })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [isCached, key, retry, project.recipientName, project.occasion, project.messageParagraphs, onUpdate]);
  const updateEngraving = (index: number, value: string) => onUpdate({
    cardEngraving: project.cardEngraving.map((line, i) => i === index ? value.toUpperCase() : line),
  });
  return <>
    <KeepCardFront engraving={project.cardEngraving} openingMessage={project.openingMessage} showOpeningMessage={selected} />
    <p className="mt-4 text-center text-[11px] leading-5 text-muted-foreground">Front engraving preview · Physical card ordering and engraving are not yet connected.</p>
    <section className="mt-9 rounded-[20px] border border-[#D8CCBE] bg-[#F5EDE3]/65 px-5 py-6">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.15em] text-[#8A725C]"><Sparkles className="size-4" /> Inspired by your words</div>
      <h2 className="mt-4 font-display text-[clamp(26px,7vw,34px)] leading-[1.13]">A few words, just for them.</h2>
      <p className="mt-3 text-xs leading-[1.8] text-[#766A5D]">Keep finds three short, personal dedications in your full message. The one you choose appears in the digital opening and on the card.</p>
      {!isCached && status === "loading" && <div role="status" className="mt-5 flex items-center gap-2 text-xs text-[#766A5D]"><Loader2 className="size-4 animate-spin" /> Finding the heart of your message…</div>}
      {!isCached && status === "error" && <div className="mt-5 rounded-xl border border-[#DACBBD] bg-white/60 p-4">
        <p role="alert" className="text-xs leading-5 text-[#766A5D]">Personalized suggestions couldn't load. You can still write your own dedication.</p>
        <button type="button" className="mt-3 text-xs font-semibold underline" onClick={() => {attempted.current = "";setRetry(n => n+1);}}>Try again</button>
      </div>}
      {isCached && <div className="mt-5 space-y-3" role="group" aria-label="Personalized opening suggestions">
        {project.openingMessageSuggestions!.map((idea, i) =>
          <button key={i} type="button" onClick={() => choose(idea)} aria-pressed={selected && project.openingMessage === idea}
            className={`flex min-h-20 w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors ${selected && project.openingMessage === idea ? "border-[#96795D] bg-white shadow-sm" : "border-[#DFD2C4] bg-white/70 hover:border-[#B69F86]"}`}>
            <span className="pt-1 font-display text-lg text-[#A68A6F]">0{i+1}</span>
            <span className="flex-1 font-display text-[19px] leading-[1.38] text-[#2D2720]">{idea}</span>
            {selected && project.openingMessage === idea && <Check className="mt-1 size-4 text-[#80654F]" />}
          </button>)}
        <button type="button" className="flex min-h-10 items-center gap-2 text-xs text-[#786451]" disabled={disabled} onClick={() => {attempted.current = "";onUpdate({openingMessageSuggestions:[],openingSuggestionsFor:""});setRetry(n=>n+1);}}>
          <RotateCcw className="size-3.5" /> Explore three other suggestions
        </button>
      </div>}
      <button type="button" aria-pressed={!selected} onClick={() => choose("")} className={`mt-5 flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-xs font-medium ${!selected ? "border-[#96795D] bg-white" : "border-[#DFD2C4] bg-white/70"}`}>
        No opening message — name and details only
        {!selected && <Check className="size-4 shrink-0" />}
      </button>
    </section>
    <section className="mt-9 space-y-3">
      <h2 className="font-display text-[27px]">Or write your own.</h2>
      <p className="text-xs leading-5 text-muted-foreground">One or two meaningful sentences, kept short enough for engraving.</p>
      <textarea aria-label="Custom opening message" rows={3} maxLength={110}
        value={selected ? (project.openingMessage ?? "") : ""} placeholder="Write a personal dedication…"
        onChange={e => choose(e.target.value)}
        className="w-full resize-none rounded-xl border border-border bg-background p-4 font-display text-lg leading-relaxed outline-none focus:border-[#A38568]" />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">{selected ? (project.openingMessage ?? "").length : 0}/110 characters</span>
        <Button variant="quiet" size="sm" onClick={onPreview} disabled={disabled}>Preview digital opening <ArrowRight className="size-4" /></Button>
      </div>
    </section>
    <section className="mt-10 space-y-4 border-t border-border pt-7">
      <h2 className="font-display text-[27px]">Personalize the card.</h2>
      <p className="text-xs leading-5 text-muted-foreground">These details appear below the dedication, or on their own if you skip it.</p>
      {["To / Title", "From (optional)", "Date (optional)"].map((label, i) => <label key={label} className="block">
        <span className="eyebrow">{label}</span>
        <input aria-label={`Card ${label}`} maxLength={22} value={project.cardEngraving[i] ?? ""} onChange={e => updateEngraving(i,e.target.value)}
          className="mt-2 w-full border-0 border-b border-border bg-transparent pb-3 text-sm tracking-widest outline-none focus:border-accent" />
      </label>)}
    </section>
  </>;
}
