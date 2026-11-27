import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import { fetchOpeningSuggestions } from "@/lib/keep-ai";
import { createPortal } from "react-dom";
import type { KeepProject } from "@/lib/keep-project";
import { Button } from "@/components/ui/button";
import { KeepCardFront } from "@/components/keep-card-front";

type OpeningFields = Pick<KeepProject, "openingMessage" | "closingLine" | "engraveOpeningMessage" | "openingMessageSuggestions" | "openingSuggestionsFor" | "cardEngraving">;
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
  const editEngraving = (index: number, value: string) => onUpdate({
    cardEngraving: Array.from({ length: 3 }, (_, i) => i === index ? value.toUpperCase() : project.cardEngraving[i] ?? ""),
  });
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
  return <>
    <section className="mt-9 rounded-[20px] border border-[#D8CCBE] bg-[#F5EDE3]/65 px-5 py-6">
      <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.15em] text-[#8A725C]"><Sparkles className="size-4" /> Inspired by your words</div>
      <h2 className="mt-4 font-display text-[clamp(26px,7vw,34px)] leading-[1.13]">01. Your opening line.</h2>
      <p className="mt-3 text-xs leading-[1.8] text-[#766A5D]">Keep finds three short, personal dedications in your full message. The one you choose appears on a dark opening screen before the photos and voice begin.</p>
      {!isCached && status === "loading" && <div role="status" className="mt-5 flex items-center gap-2 text-xs text-[#766A5D]"><Loader2 className="size-4 animate-spin" /> Finding the heart of your message…</div>}
      {!isCached && status === "error" && <div className="mt-5 rounded-xl border border-[#DACBBD] bg-white/60 p-4">
        <p role="alert" className="text-xs leading-5 text-[#766A5D]">Personalized suggestions couldn't load. You can still write your own dedication.</p>
        <button type="button" className="mt-3 text-xs font-semibold underline" onClick={() => {attempted.current = "";setRetry(n => n+1);}}>Try again</button>
      </div>}
      {isCached && <div className="mt-5 space-y-3" role="group" aria-label="Personalized opening suggestions">
        {project.openingMessageSuggestions!.map((idea, i) =>
          <button key={i} type="button" disabled={disabled} onClick={() => choose(idea)} aria-pressed={selected && project.openingMessage === idea}
            className={`flex min-h-20 w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors ${selected && project.openingMessage === idea ? "border-[#96795D] bg-white shadow-sm" : "border-[#DFD2C4] bg-white/70 hover:border-[#B69F86]"}`}>
            <span className="pt-1 font-display text-lg text-[#A68A6F]">0{i+1}</span>
            <span className="flex-1 font-display text-[19px] leading-[1.38] text-[#2D2720]">{idea}</span>
            {selected && project.openingMessage === idea && <Check className="mt-1 size-4 text-[#80654F]" />}
          </button>)}
        <button type="button" className="flex min-h-10 items-center gap-2 text-xs text-[#786451]" disabled={disabled} onClick={() => {attempted.current = "";onUpdate({openingMessageSuggestions:[],openingSuggestionsFor:""});setRetry(n=>n+1);}}>
          <RotateCcw className="size-3.5" /> Explore three other suggestions
        </button>
      </div>}
      <button type="button" disabled={disabled} aria-pressed={!selected} onClick={() => choose("")} className={`mt-5 flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-xs font-medium ${!selected ? "border-[#96795D] bg-white" : "border-[#DFD2C4] bg-white/70"}`}>
        No opening message — name and details only
        {!selected && <Check className="size-4 shrink-0" />}
      </button>
    </section>
    <section className="mt-9 space-y-3">
      <h2 className="font-display text-[27px]">Or write your own opening line.</h2>
      <p className="text-xs leading-5 text-muted-foreground">One or two meaningful sentences to open your film.</p>
      <textarea aria-label="Custom opening message" rows={3} maxLength={110} disabled={disabled}
        value={project.openingMessage ?? ""} placeholder="Write a personal dedication…"
        onChange={e => choose(e.target.value)}
        className="w-full resize-none rounded-xl border border-border bg-background p-4 font-display text-lg leading-relaxed outline-none focus:border-[#A38568]" />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-muted-foreground">{selected ? (project.openingMessage ?? "").length : 0}/110 characters</span>
        <Button variant="quiet" size="sm" onClick={() => setShowFirstFrame(true)} disabled={disabled}>Preview opening screen <ArrowRight className="size-4" /></Button>
      </div>
    </section>
    <section className="mt-10 space-y-4 border-t border-border pt-8" aria-label="Closing words">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[.17em] text-[#8B725A]">THE FINAL MOMENT</p>
        <h2 className="mt-3 font-display text-[29px] leading-[1.14]">02. Your closing line.</h2>
        <p className="mt-3 text-xs leading-6 text-muted-foreground">After the final words of your recording, the memories fade to dark and this personal message appears as the music gently finishes.</p>
      </div>
      <div className="rounded-[20px] bg-[#191514] px-6 py-9 text-center text-[#F7EDE0] shadow-inner" aria-label="Closing moment preview">
        <span className="text-[9px] font-semibold uppercase tracking-[.26em] text-[#B6A38F]">FOR {project.recipientName || "YOU"}</span>
        <p className="mt-5 font-display text-[clamp(27px,7vw,37px)] italic leading-[1.2]">
          {(project.closingLine ?? "").trim() || "You are so loved."}
        </p>
        <div className="mx-auto mt-6 h-px w-9 bg-[#9E8975]" />
      </div>
      <label className="block text-xs font-medium text-[#594A3B]" htmlFor="keep-closing-line">Your closing line (optional)</label>
      <input id="keep-closing-line" aria-label="Your closing line" type="text" maxLength={90} disabled={disabled}
        value={project.closingLine ?? ""} onChange={e => onUpdate({ closingLine: e.target.value })}
        placeholder="I love you, Dad."
        className="w-full rounded-xl border border-border bg-background px-4 py-3 font-display text-[17px] outline-none focus:border-[#A38568]" />
      <p className="text-[11px] leading-5 text-muted-foreground">Leave blank for “You are so loved.” This is shown, not spoken, and can be changed without recording again.</p>
    </section>
    <section className="mt-10 space-y-4 border-t border-border pt-8" aria-labelledby="keep-engraving-preview">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[.17em] text-[#8B725A]">A KEEPSAKE YOU CAN HOLD</p>
        <h2 id="keep-engraving-preview" className="mt-3 font-display text-[29px] leading-[1.14]">Your physical Keep.</h2>
        <p className="mt-3 text-xs leading-6 text-muted-foreground">Here’s how your matte-black metal card will look with the Signature package. Basic is logo-only.</p>
      </div>
      <figure className="rounded-[20px] border border-[#D8CCBE] bg-[#F5EDE3]/65 px-3 pb-5 pt-6 sm:px-6">
        <div className="mx-auto w-full max-w-[360px]">
          <KeepCardFront
            engraving={project.cardEngraving}
            openingMessage={project.openingMessage}
            showOpeningMessage={engraved}
          />
        </div>
        <figcaption className="mt-7 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#8B725A]">Front · Laser engraving preview</p>
          <p className="mx-auto mt-2 max-w-[290px] text-[11px] leading-5 text-[#766A5D]">
            {engraved ? "Your opening line will be laser-engraved on the card alongside your personal details." : "Your engraved card will show only the personal details you enter below."}
          </p>
        </figcaption>
      </figure>
      <div className="space-y-3 rounded-[20px] border border-[#D8CCBE] bg-white/60 p-4">
        <h3 className="font-display text-[23px] leading-tight">Personalize your engraving.</h3>
        <p className="text-xs leading-5 text-muted-foreground">Edit the three optional detail lines below. Your card preview updates as you type.</p>
        <label className="flex items-start gap-3 rounded-xl border border-[#DFD2C4] bg-[#F8F3EC] p-3 text-xs leading-5">
          <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[#665547]" checked={engraved} disabled={disabled || !selected}
            onChange={e => onUpdate({ engraveOpeningMessage: e.target.checked })} />
          <span><strong className="block font-medium">Include my opening line on the card</strong><span className="text-muted-foreground">Turning this off keeps the opening line in your film.</span></span>
        </label>
        {[
          { label: "Name or dedication", placeholder: "MOM" },
          { label: "From", placeholder: "FROM ALEX" },
          { label: "Date or year", placeholder: "2026" },
        ].map(({ label, placeholder }, i) => (
          <label key={label} className="block text-xs font-medium text-[#594A3B]">
            {label}
            <input type="text" maxLength={Math.max(36, project.cardEngraving[i]?.length ?? 0)} disabled={disabled}
              value={project.cardEngraving[i] ?? ""} onChange={e => editEngraving(i, e.target.value)} placeholder={placeholder}
              className="mt-1.5 w-full rounded-xl border border-border bg-background px-3 py-3 text-sm uppercase outline-none focus:border-[#A38568]" />
          </label>
        ))}
      </div>
      <p className="text-[11px] leading-5 text-muted-foreground">Your closing line stays in the film. Personalized engraving is exclusive to Signature.</p>
    </section>
    {showFirstFrame && typeof document !== "undefined" && createPortal(
      <div className="fixed inset-0 z-[220] flex items-center justify-center overflow-y-auto bg-[#17130F]/85 p-4 backdrop-blur-sm"
        onClick={() => setShowFirstFrame(false)}>
        <section role="dialog" aria-modal="true" aria-label="Opening screen preview"
          className="my-auto w-full max-w-[390px] rounded-[24px] border border-[#B6A28A]/40 bg-[#F8F3EC] px-4 pb-5 pt-4 shadow-2xl"
          onClick={event => event.stopPropagation()}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#8C745C]">YOUR OPENING SCREEN</p>
              <p className="mt-1 text-xs text-[#6C5B4B]">The first screen before your photos appear</p>
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
          <p className="mt-4 text-center text-[11px] leading-5 text-[#746556]">The film opens on this dark dedication, then gently reveals your first photo.</p>
        </section>
      </div>, document.body)}
  </>;
}
