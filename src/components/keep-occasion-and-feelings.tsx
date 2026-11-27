import { ArrowRight, Check, Keyboard, Mic, Square } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

const occasionDetails = [
  ["Birthday", "Which birthday are they celebrating?", "Their 8th birthday, their 30th birthday…"],
  ["Anniversary", "What anniversary are you celebrating?", "Our 10th wedding anniversary…"],
  ["Wedding", "Tell us a little about the wedding.", "My sister's wedding this summer…"],
  ["New Baby", "What makes this new arrival special?", "Welcoming our first grandchild…"],
  ["Mother's Day", "Is there anything special about this Mother's Day?", "Her first Mother's Day as a grandma…"],
  ["Father's Day", "Is there anything special about this Father's Day?", "His first Father's Day as a dad…"],
  ["Graduation", "What are they graduating from?", "Graduating from high school this spring…"],
  ["Thank You", "What are you thanking them for?", "Helping our family through a difficult season…"],
  ["Trip / Adventure", "What trip or adventure are you remembering?", "Our family trip to Disney World…"],
  ["Milestone", "What milestone are you celebrating or honoring?", "Retiring after 30 years, moving to a new home…"],
  ["Celebration of Life", "Whose life or legacy are you honoring?", "Celebrating Grandma's life with our family…"],
  ["Family Memories", "What chapter of your family's story is this about?", "Our last summer in our childhood home…"],
  ["Just Because", "What inspired you to make this Keep?", "I don't tell them often enough how much they mean to me…"],
  ["Other", "What is this Keep for?", "Our family reunion at the lake…"],
] as const;

export const keepOccasions = occasionDetails.map(([occasion]) => occasion);
export const keepRecipientFeelings = [
  "Loved", "Appreciated", "Grateful", "Special", "Seen", "Understood",
  "Encouraged", "Proud", "Surprised", "Joyful", "Comforted", "Connected", "Hopeful", "Inspired",
] as const;

export function chosenKeepOccasion(value: string): string {
  return !value || keepOccasions.some(occasion => occasion === value) ? value : "Other";
}

type OccasionProps = {
  occasion: string;
  occasionDetail?: string | undefined;
  onChange: (change: { occasion: string; occasionDetail: string }) => void;
  continueButton: (disabled: boolean) => ReactNode;
};

export function KeepOccasionChoices({ occasion, occasionDetail, onChange, continueButton }: OccasionProps) {
  const chosen = chosenKeepOccasion(occasion);
  const detail = occasionDetail ?? (chosen === "Other" && occasion !== "Other" ? occasion : "");
  // Older custom-occasion drafts stored the free text directly in occasion.
  const currentDetail = detail || (chosen === "Other" && occasion !== "Other" ? occasion : "");

  useEffect(() => {
    if (!chosen) return;
    const frame = window.requestAnimationFrame(() => {
      document.getElementById("occasion-details")?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [chosen]);

  return (
    <div className="grid grid-cols-2 gap-3" role="group" aria-label="Choose an occasion or moment">
      {occasionDetails.map(([option], index) => {
        const row = occasionDetails.slice(index - index % 2, index - index % 2 + 2);
        const selectedDetails = index % 2 === 1 ? row.find(([label]) => label === chosen) : undefined;
        return (
          <div key={option} className="contents">
            <Button type="button" aria-pressed={chosen === option} variant="quiet"
              className={`keep-choice-bubble ${chosen === option ? "keep-choice-bubble--selected" : ""}`}
              onClick={() => {
                if (chosen !== option) onChange({ occasion: option, occasionDetail: "" });
              }}>
              <span className="min-w-0 flex-1 text-left">{option}</span>
              {chosen === option && <span className="keep-choice-check"><Check className="!size-3.5" strokeWidth={2.7} /></span>}
            </Button>
            {selectedDetails && (
              <div id="occasion-details" className="page-enter col-span-2 rounded-[18px] border border-[#D7C9B9] bg-[#F2EDE6] p-5 shadow-sm">
                <label htmlFor="occasion-detail" className="block text-sm font-medium text-[#241F19]">{selectedDetails[1]}</label>
                <p id="occasion-detail-help" className="mt-1 text-xs leading-5 text-[#766A60]">
                  {chosen === "Other" ? "A few words are all we need." : "A few words help us make your Keep more personal. (Optional)"}
                </p>
                <input id="occasion-detail" aria-describedby="occasion-detail-help" required={chosen === "Other"}
                  autoComplete="off" maxLength={160} value={currentDetail}
                  onChange={event => onChange({ occasion: chosen, occasionDetail: event.target.value.slice(0, 160) })}
                  placeholder={selectedDetails[2]}
                  className="mt-3 w-full rounded-xl border border-[#CBBCAE] bg-white px-4 py-3 text-base leading-6 text-[#241F19] outline-none focus:border-[#6A5849] focus:ring-2 focus:ring-[#6A5849]/20" />
                <div className="mt-5">{continueButton(chosen === "Other" && !currentDetail.trim())}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function KeepFeelingChoices({ selected, onChange }: { selected: string[]; onChange: (feelings: string[]) => void }) {
  return (
    <div className="grid grid-cols-2 gap-3" role="group" aria-label="How you want the recipient to feel">
      {keepRecipientFeelings.map(feeling => {
        const active = selected.includes(feeling);
        return (
          <Button key={feeling} type="button" variant="quiet" aria-pressed={active}
            className={`keep-choice-bubble ${active ? "keep-choice-bubble--selected" : ""}`}
            onClick={() => onChange(active ? selected.filter(value => value !== feeling) : [...selected, feeling])}>
            <span className="min-w-0 flex-1 text-left">{feeling}</span>
            {active && <span className="keep-choice-check"><Check className="!size-3.5" strokeWidth={2.7} /></span>}
          </Button>
        );
      })}
    </div>
  );
}

/** Keep the intent and emotional outcome together in one creator step. */
export function KeepHeartAndFeelings({
  intent, selected, forSelf, dictating, onIntentChange, onToggleDictation, onFeelingsChange, onContinue,
}: {
  intent: string;
  selected: string[];
  forSelf: boolean;
  dictating: boolean;
  onIntentChange: (intent: string) => void;
  onToggleDictation: () => void;
  onFeelingsChange: (feelings: string[]) => void;
  onContinue: () => void;
}) {
  const textArea = useRef<HTMLTextAreaElement>(null);
  return (
    <div className="px-7 pb-12 pt-11">
      <div className="mb-10 keep-page-heading">
        <h1 className="keep-editorial-title">What is the heart behind this Keep?</h1>
        <p className="keep-page-description mt-5" id="keep-heart-question">
          What is this Keep all about? What would you like them to remember?
        </p>
      </div>
      <textarea ref={textArea} aria-labelledby="keep-heart-question" value={intent}
        onChange={event => onIntentChange(event.target.value.slice(0, 500))}
        placeholder="I want Gigi & Pops to know how special it was watching them experience Disney through our kids' eyes, and I want our family to always remember this trip together."
        className="min-h-44 w-full resize-none rounded-sm border border-border bg-transparent p-4 text-sm leading-7 outline-none focus:border-accent" />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button type="button" variant={dictating ? "selected" : "quiet"} className="h-12" onClick={onToggleDictation}>
          {dictating ? <Square className="mr-2 size-4" fill="currentColor" /> : <Mic className="mr-2 size-4" />}
          {dictating ? "Stop" : "Speak"}
        </Button>
        <Button type="button" variant="quiet" className="h-12" onClick={() => textArea.current?.focus()}>
          <Keyboard aria-hidden="true" className="mr-2 size-4" />Type
        </Button>
      </div>
      {dictating && <p className="mt-3 text-xs leading-5 text-muted-foreground">Speak naturally. Your words will appear above as you talk. Tap Stop when you're finished.</p>}
      <section aria-labelledby="keep-feelings-heading" className="mt-10 border-t border-border pt-8">
        <h2 id="keep-feelings-heading" className="keep-section-title">{forSelf ? "How do you want to feel?" : "How do you want them to feel?"}</h2>
        <p className="keep-page-description mb-5 mt-3">
          {forSelf ? "When you revisit this Keep, what do you hope to feel?" : "When they receive their Keep, what do you hope they feel?"} Select all that apply. (Optional)
        </p>
        <KeepFeelingChoices selected={selected} onChange={onFeelingsChange} />
      </section>
      <div className="mt-10">
        <Button type="button" variant="keep" size="touch" className="keep-premium-action w-full justify-between"
          disabled={!intent.trim()} onClick={onContinue}>Continue<ArrowRight /></Button>
      </div>
    </div>
  );
}
