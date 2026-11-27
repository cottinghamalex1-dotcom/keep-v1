import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, Eye, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import { fetchOpeningSuggestions } from "@/lib/keep-ai";
import { createPortal } from "react-dom";
import type { KeepProject } from "@/lib/keep-project";
import { KeepCardFront } from "@/components/keep-card-front";
import { engravingLayout, engravingValues, engravingFieldDetails, type EngravingField } from "@/lib/keep-card-engraving";

type OpeningFields = Pick<KeepProject, "openingMessage" | "closingLine" | "engraveOpeningMessage" | "openingMessageSuggestions" | "openingSuggestionsFor" | "cardEngraving" | "cardEngravingLayout">;
type Props = {
  project: KeepProject;
  onUpdate: (updates: Partial<OpeningFields>) => void;
  disabled?: boolean;
};

function fingerprint(project: KeepProject): string {
  const source = [project.recipientName, project.occasion, ...project.messageParagraphs].join("\u001f");
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619);
  return source.length + "-" + (hash >>> 0).toString(16);
}

/** The chosen message is identical in the first-play reveal and the card preview. */
export function KeepOpeningPersonalization({ project, onUpdate, disabled }: Props) {
  const key = fingerprint(project);
  const isCached = project.openingSuggestionsFor === key && project.openingMessageSuggestions?.length === 3;
  const attempted = useRef("");
  const updateRef = useRef(onUpdate);
  updateRef.current = onUpdate;
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [retry, setRetry] = useState(0);
  const selected = !!project.openingMessage?.trim();
  const engraved = selected && !!project.engraveOpeningMessage;
  const [showFirstFrame, setShowFirstFrame] = useState(false);
  useEffect(() => {
    if (!showFirstFrame) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setShowFirstFrame(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showFirstFrame]);
  const choose = (message: string) => onUpdate({
    openingMessage: message,
    engraveOpeningMessage: !!message.trim() && (!selected || engraved),
  });
  const layout = engravingLayout(project.cardEngravingLayout);
  const values = engravingValues(project.cardEngraving, layout);
  const editEngraving = (field: EngravingField, value: string) => {
    const next = { ...values, [field]: value.toUpperCase() };
    onUpdate({ cardEngraving: [next.to, next.from, next.date], cardEngravingLayout: { ...layout, title: next.title } });
  };
  const moveEngraving = (index: number, direction: -1 | 1) => {
    const order = [...layout.order];
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    [order[index], order[target]] = [order[target]!, order[index]!];
    onUpdate({ cardEngravingLayout: { ...layout, order } });
  };
  useEffect(() => {
    if (isCached || !project.messageParagraphs.some(p => p.trim()) || attempted.current === key) return;
    attempted.current = key;
    let cancelled = false;
    setStatus("loading");
    void fetchOpeningSuggestions(project.recipientName, project.occasion, project.messageParagraphs)
      .then(suggestions => {
        if (cancelled) return;
        updateRef.current({ openingMessageSuggestions: suggestions, openingSuggestionsFor: key });
        setStatus("idle");
      })
      .catch(() => { if (!cancelled) setStatus("error"); });
    return () => { cancelled = true; };
  }, [isCached, key, retry]);
  const fieldClass = "w-full min-w-0 rounded-[10px] border border-[#D9D2C9] bg-[#FFFDFC] px-3.5 py-3 text-[16px] outline-none transition-colors focus:border-[#8C7561] disabled:opacity-60";
  return <>
    <section id="keep-final-opening" className="keep-final-section scroll-mt-[calc(5.25rem+env(safe-area-inset-top))]" aria-labelledby="keep-final-opening-heading">
      <div className="flex items-center gap-3">
        <span className="keep-final-number" aria-hidden="true">01</span>
        <h2 id="keep-final-opening-heading" className="keep-final-heading">Opening line</h2>
      </div>
      <p className="mt-2 text-[13px] leading-5 text-muted-foreground">The first words of your film.</p>
      <div className="mt-5 flex items-center gap-2 text-[11px] font-medium text-[#756451]">
        <Sparkles className="size-3.5" aria-hidden="true" /> Suggested from your message
      </div>
      {!isCached && status === "loading" && <div role="status" className="mt-3 flex items-center gap-2 text-[13px] text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Finding your words…</div>}
      {!isCached && status === "error" && <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p role="alert" className="text-[13px] text-muted-foreground">Suggestions unavailable. Write your own below.</p>
        <button type="button" disabled={disabled} className="keep-final-link" onClick={() => {attempted.current = "";setRetry(n => n+1);}}>Try again</button>
      </div>}
      {isCached && <div className="mt-2 overflow-hidden rounded-[12px] border border-[#D9D2C9] bg-[#FFFDFC]" role="group" aria-label="Personalized opening suggestions">
        {project.openingMessageSuggestions!.map((idea, i) => {
          const active = selected && project.openingMessage === idea;
          return <button key={i} type="button" disabled={disabled} onClick={() => choose(idea)} aria-pressed={active}
            className={`flex min-h-[64px] w-full items-center gap-3 border-b border-[#E4DED5] px-3.5 py-3.5 text-left transition-colors last:border-b-0 disabled:opacity-60 ${active ? "bg-[#EBE5DC]" : "hover:bg-[#F5F1EB]"}`}>
            <span className="min-w-0 flex-1 break-words font-display text-[17px] leading-[1.5] text-[#29251F]">{idea}</span>
            <span className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${active ? "border-[#302923] bg-[#302923] text-white" : "border-[#BEB5AA]"}`} aria-hidden="true">{active && <Check className="size-3" strokeWidth={2.3} />}</span>
          </button>;
        })}
      </div>}
      <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3">
        {isCached && <button type="button" className="keep-final-link" disabled={disabled} onClick={() => {attempted.current = "";onUpdate({openingMessageSuggestions:[],openingSuggestionsFor:""});setRetry(n=>n+1);}}>
          <RotateCcw className="size-3.5" /> New suggestions
        </button>}
        <button type="button" disabled={disabled} aria-pressed={!selected} onClick={() => choose("")}
          className={`keep-final-link ml-auto ${!selected ? "!font-semibold !text-[#29251F]" : ""}`}>
          {!selected && <Check className="size-3.5" aria-hidden="true" />} No opening message
        </button>
      </div>
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <label htmlFor="keep-custom-opening" className="text-[12px] font-medium text-[#494038]">Write or edit your own</label>
          <span className="text-[11px] tabular-nums text-muted-foreground">{(project.openingMessage ?? "").length}/110</span>
        </div>
        <textarea id="keep-custom-opening" aria-label="Custom opening message" rows={3} maxLength={110} disabled={disabled}
          value={project.openingMessage ?? ""} placeholder="Write a personal dedication…"
          onChange={e => choose(e.target.value)}
          className={`${fieldClass} block resize-none font-display leading-[1.5]`} />
        <button type="button" disabled={disabled} onClick={() => setShowFirstFrame(true)} className="keep-final-link mt-1">
          <Eye className="size-4" /> Preview opening screen
        </button>
      </div>
    </section>
    <section id="keep-final-closing" className="keep-final-section scroll-mt-[calc(5.25rem+env(safe-area-inset-top))]" aria-labelledby="keep-final-closing-heading">
      <div className="flex items-center gap-3">
        <span className="keep-final-number" aria-hidden="true">02</span>
        <h2 id="keep-final-closing-heading" className="keep-final-heading">Closing line</h2>
      </div>
      <p className="mt-2 text-[13px] leading-5 text-muted-foreground">The words that stay after your film ends.</p>
      <div className="mt-5 overflow-hidden rounded-[12px] bg-[#1A1715] px-5 py-7 text-center text-[#F7EDE0]" aria-label="Closing moment preview">
        <span className="text-[9px] font-medium uppercase tracking-[.22em] text-[#C6B5A1]">For {project.recipientName || "you"}</span>
        <p className="mx-auto mt-3 max-w-[25ch] break-words font-display text-[clamp(22px,6vw,30px)] italic leading-[1.35]">
          {(project.closingLine ?? "").trim() || "You are so loved."}
        </p>
        <div className="mx-auto mt-4 h-px w-7 bg-[#9E8975]" />
      </div>
      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <label htmlFor="keep-closing-line" className="text-[12px] font-medium text-[#494038]">Your closing line <span className="font-normal text-muted-foreground">(optional)</span></label>
          <span className="text-[11px] tabular-nums text-muted-foreground">{(project.closingLine ?? "").length}/90</span>
        </div>
        <input id="keep-closing-line" aria-label="Your closing line" type="text" maxLength={90} disabled={disabled}
          value={project.closingLine ?? ""} onChange={e => onUpdate({ closingLine: e.target.value })}
          placeholder="You are so loved."
          className={`${fieldClass} font-display`} />
        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">Leave blank for the default. No new recording needed.</p>
      </div>
    </section>
    <section id="keep-final-card" className="keep-final-section scroll-mt-[calc(5.25rem+env(safe-area-inset-top))]" aria-labelledby="keep-engraving-preview">
      <div className="flex items-center gap-3">
        <span className="keep-final-number" aria-hidden="true">03</span>
        <h2 id="keep-engraving-preview" className="keep-final-heading">Your Keep card</h2>
      </div>
      <p className="mt-2 text-[13px] leading-5 text-muted-foreground">Personalized engraving is exclusive to Signature.</p>
      <figure className="mt-5 rounded-[14px] bg-[#EBE6DE] px-4 pb-3 pt-6 sm:px-6 sm:pt-8">
        <div className="mx-auto w-full max-w-[360px]">
          <KeepCardFront
            engraving={project.cardEngraving}
            layout={layout}
            openingMessage={project.openingMessage}
            showOpeningMessage={engraved}
          />
        </div>
        <figcaption className="mt-5 flex items-center justify-center gap-1.5 text-[10px] font-medium uppercase tracking-[.12em] text-[#62584E]">
          <span className="size-1.5 rounded-full bg-[#87725C]" aria-hidden="true" /> Live engraving preview
        </figcaption>
      </figure>
      <label className="mt-4 flex min-h-14 cursor-pointer items-center gap-3 rounded-[10px] border border-[#D9D2C9] bg-[#FFFDFC] px-3.5 py-3 has-[:disabled]:cursor-default has-[:disabled]:opacity-55">
        <span className="min-w-0 flex-1 text-[13px] font-medium leading-5">Include my opening line on the card</span>
        <input type="checkbox" className="peer sr-only" checked={engraved} disabled={disabled || !selected}
          onChange={e => onUpdate({ engraveOpeningMessage: e.target.checked })} />
        <span aria-hidden="true" className="relative h-6 w-11 shrink-0 rounded-full bg-[#D5CFC7] transition-colors peer-checked:bg-[#28241F] peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-[#8C7561] after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-5" />
      </label>
      <div className="mt-5 flex items-center justify-between gap-2">
        <h3 className="text-[13px] font-semibold text-[#494038]">Card details</h3>
        <span className="text-[11px] text-muted-foreground">Optional · Reorder with arrows</span>
      </div>
      <div role="group" aria-label="Engraving fields in card order" className="mt-2 divide-y divide-[#DED7CE] border-y border-[#DED7CE]">
        {layout.order.map((field, i) => {
          const { label, placeholder } = engravingFieldDetails[field];
          return <div key={field} className="flex items-center gap-2 py-2">
            <label className="flex min-w-0 flex-1 items-center gap-2.5 text-[12px] font-medium text-[#494038]">
              <span className="w-9 shrink-0">{label}</span>
              <input type="text" aria-label={label} maxLength={Math.max(36, values[field].length)} disabled={disabled}
                value={values[field]} onChange={e => editEngraving(field, e.target.value)} placeholder={placeholder}
                className="min-w-0 flex-1 rounded-[8px] border border-[#D9D2C9] bg-[#FFFDFC] px-2.5 py-2.5 text-[16px] font-normal uppercase outline-none transition-colors placeholder:text-[#92877D] focus:border-[#8C7561] disabled:opacity-60" />
            </label>
            <div className="flex shrink-0 items-center rounded-[8px] border border-[#D9D2C9] bg-[#FFFDFC]">
              <button type="button" aria-label={`Move ${label} up`} disabled={disabled || i === 0} onClick={() => moveEngraving(i, -1)}
                className="flex min-h-11 w-10 items-center justify-center text-[#63574C] transition-colors hover:bg-[#F0EBE5] disabled:opacity-25 sm:w-11"><ArrowUp className="size-4" /></button>
              <span className="h-5 w-px bg-[#E0D9D0]" aria-hidden="true" />
              <button type="button" aria-label={`Move ${label} down`} disabled={disabled || i === layout.order.length - 1} onClick={() => moveEngraving(i, 1)}
                className="flex min-h-11 w-10 items-center justify-center text-[#63574C] transition-colors hover:bg-[#F0EBE5] disabled:opacity-25 sm:w-11"><ArrowDown className="size-4" /></button>
            </div>
          </div>;
        })}
      </div>
      <p className="mt-2 text-[11px] leading-5 text-muted-foreground">Basic cards have the Keep logo and tap icon only. Your closing line stays in the film.</p>
    </section>
    {showFirstFrame && typeof document !== "undefined" && createPortal(
      <div className="fixed inset-0 z-[220] flex items-center justify-center overflow-y-auto bg-[#17130F]/85 p-4 backdrop-blur-sm"
        onClick={() => setShowFirstFrame(false)}>
        <section role="dialog" aria-modal="true" aria-label="Opening screen preview"
          className="my-auto w-full max-w-[390px] rounded-[24px] border border-[#B6A28A]/40 bg-[#F8F3EC] px-4 pb-5 pt-4 shadow-2xl"
          onClick={event => event.stopPropagation()}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#8C745C]">Opening screen</p>
              <p className="mt-1 text-xs text-[#6C5B4B]">The film opens on this dark dedication.</p>
            </div>
            <button type="button" onClick={() => setShowFirstFrame(false)} aria-label="Close opening preview"
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#D8C8B7] bg-white text-[#473A2E]">
              <X className="size-5" />
            </button>
          </div>
          <div className="relative mx-auto flex aspect-[9/16] max-h-[65dvh] w-full max-w-[310px] flex-col items-center justify-center overflow-hidden rounded-[16px] bg-[#171311] px-6 text-center text-[#F5EDE5]">
            <span className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#D6C1AA]">A KEEP FOR</span>
            <h3 className="mt-3 font-display text-[clamp(38px,10vw,53px)] leading-none">{project.recipientName || "Someone special"}</h3>
            {selected && <p className="mt-7 max-w-[25ch] font-display text-[clamp(19px,5.5vw,26px)] italic leading-snug">{project.openingMessage}</p>}
          </div>
        </section>
      </div>, document.body)}
  </>;
}
