import { ArrowDown, ArrowUp } from "lucide-react";
import { fetchOpeningSuggestions, fetchClosingSuggestions } from "@/lib/keep-ai";
import { KeepFinalLineEditor } from "@/components/keep-final-line-editor";
import type { KeepProject } from "@/lib/keep-project";
import { KeepCardFront } from "@/components/keep-card-front";
import { engravingLayout, engravingValues, engravingFieldDetails, type EngravingField } from "@/lib/keep-card-engraving";

type OpeningFields = Pick<KeepProject, "openingMessage" | "closingLine" | "engraveOpeningMessage" | "cardEngraving" | "cardEngravingLayout">;
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
  const selected = !!project.openingMessage?.trim();
  const engraved = selected && !!project.engraveOpeningMessage;
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
  const recipient = project.recipientName.trim() || "You";
  const sender = project.voiceMode === "together" && (project.contributors?.length ?? 0) > 1
    ? (project.contributors ?? []).map(c => c.name.trim()).filter(Boolean).join(" & ")
    : (project.cardEngraving[1] ?? "").replace(/^FROM\s+/i, "").trim();
  const hasTranscript = project.messageParagraphs.map(p => p.trim()).filter(Boolean).join("\n\n").length >= 40;

  return <>
    <KeepFinalLineEditor key={`opening-${key}`} mode="opening" value={project.openingMessage ?? ""}
      recipient={recipient} sender={sender} onChange={choose} disabled={disabled} hasTranscript={hasTranscript}
      onGenerate={() => fetchOpeningSuggestions(project.recipientName, project.occasion, project.messageParagraphs)} />
    <KeepFinalLineEditor key={`closing-${key}`} mode="closing" value={project.closingLine ?? ""}
      recipient={recipient} sender={sender} onChange={closingLine => onUpdate({ closingLine })} disabled={disabled} hasTranscript={hasTranscript}
      onGenerate={() => fetchClosingSuggestions(project.recipientName, project.occasion, project.messageParagraphs)} />
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
  </>;
}
