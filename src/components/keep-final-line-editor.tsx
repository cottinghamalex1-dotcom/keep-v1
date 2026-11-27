import { useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowRight, Eye, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import { KeepFilmCard } from "@/components/keep-film-card";

type Props = {
  mode: "opening" | "closing";
  value: string;
  recipient: string;
  sender: string;
  onChange: (value: string) => void;
  onGenerate: () => Promise<string[]>;
  disabled?: boolean;
  hasTranscript: boolean;
};

const overlayClass = "fixed inset-0 z-[220] bg-[#171311]/70 backdrop-blur-[5px]";
const contentClass = "fixed left-1/2 top-1/2 z-[221] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[420px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[20px] border border-[#D9D2C9] bg-[#F7F5F2] p-5 text-[#29251F] shadow-2xl";
const closeClass = "flex size-11 shrink-0 items-center justify-center rounded-full border border-[#D9D2C9] bg-[#FFFDFC] text-[#62584E]";

export function KeepFinalLineEditor({ mode, value, recipient, sender, onChange, onGenerate, disabled, hasTranscript }: Props) {
  const opening = mode === "opening";
  const heading = opening ? "Opening line" : "Closing line";
  const maxLength = opening ? 110 : 90;
  const inputId = `keep-final-${mode}-message`;
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const generation = useRef(0);
  useEffect(() => () => { generation.current++; }, []);

  const generate = async () => {
    const attempt = ++generation.current;
    setSuggestions([]);
    setStatus("loading");
    try {
      const options = await onGenerate();
      if (generation.current !== attempt) return;
      if (options.length !== 3) throw new Error("Expected three choices");
      setSuggestions(options);
      setStatus("ready");
    } catch {
      if (generation.current === attempt) setStatus("error");
    }
  };
  const changeSuggestionDialog = (open: boolean) => {
    setSuggestionsOpen(open);
    if (open) void generate();
    else generation.current++;
  };

  return (
    <section id={`keep-final-${mode}`} className="keep-final-section scroll-mt-[calc(5.25rem+env(safe-area-inset-top))]" aria-labelledby={`keep-final-${mode}-heading`}>
      <div className="flex items-center gap-3">
        <span className="keep-final-number" aria-hidden="true">{opening ? "01" : "02"}</span>
        <h2 id={`keep-final-${mode}-heading`} className="keep-final-heading">{heading}</h2>
      </div>
      <p className="mt-2 text-[13px] leading-5 text-muted-foreground">{opening ? "The first words of your film." : "The last words of your film."}</p>

      <div className="keep-final-message mt-4">
        <label htmlFor={inputId} className="sr-only">{opening ? "Custom opening message" : "Your closing line"}</label>
        <textarea id={inputId} rows={3} maxLength={maxLength} disabled={disabled} value={value}
          onChange={event => onChange(event.target.value)}
          placeholder={opening ? "Write your opening words…" : "You are so loved."}
          className="keep-final-message-input" />
        <div className="flex min-h-8 items-center justify-between gap-2 px-3.5 pb-2">
          <button type="button" aria-label={opening ? "No opening message" : "Use default closing line"} disabled={disabled || !value}
            onClick={() => onChange("")} className="keep-final-clear">
            {opening ? "Clear" : "Use default"}
          </button>
          <span className="text-[11px] tabular-nums text-muted-foreground">{value.length}/{maxLength}</span>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-[1.25fr_1fr] gap-2">
        <Dialog.Root open={suggestionsOpen} onOpenChange={changeSuggestionDialog}>
          <Dialog.Trigger asChild>
            <button type="button" className="keep-final-action keep-final-action--generate" disabled={disabled || !hasTranscript}
              aria-label={`Generate 3 ${mode} options`}>
              <Sparkles className="size-4 shrink-0" aria-hidden="true" /> <span>Generate 3 options</span>
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className={overlayClass} />
            <Dialog.Content className={contentClass}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#8B725A]">Inspired by your transcript</p>
                  <Dialog.Title className="mt-1.5 font-display text-[25px] leading-tight">{heading} ideas</Dialog.Title>
                </div>
                <Dialog.Close aria-label={`Close ${mode} suggestions`} className={closeClass}><X className="size-5" /></Dialog.Close>
              </div>
              <Dialog.Description className="mt-2 text-[13px] text-[#62584E]">Choose one, then make it your own.</Dialog.Description>
              {status === "loading" && <div role="status" className="flex min-h-36 items-center justify-center gap-2 text-[13px] text-[#62584E]">
                <Loader2 className="size-4 animate-spin" /> Finding the right words…
              </div>}
              {status === "error" && <p role="alert" className="mt-6 rounded-lg border border-[#D9D2C9] p-3 text-[13px] text-[#62584E]">Couldn't generate your options. Your message is unchanged.</p>}
              {status === "ready" && <div className="mt-5 divide-y divide-[#E4DED5] overflow-hidden rounded-[12px] border border-[#D9D2C9] bg-[#FFFDFC]" role="group" aria-label={`Personalized ${mode} suggestions`}>
                {suggestions.map((idea, i) => <button type="button" key={i} disabled={disabled}
                  className="flex min-h-16 w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-[#EBE5DC] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#8C7561]"
                  onClick={() => { if (!disabled) { onChange(idea); changeSuggestionDialog(false); } }}>
                  <span className="min-w-0 flex-1 break-words font-display text-[18px] leading-[1.45]">{idea}</span>
                  <ArrowRight className="size-4 shrink-0 text-[#8C7561]" />
                </button>)}
              </div>}
              {(status === "ready" || status === "error") && <button type="button" disabled={disabled} onClick={() => void generate()} className="keep-final-action mt-4 w-full">
                <RotateCcw className="size-4" /> {status === "error" ? "Try again" : "Generate 3 new options"}
              </button>}
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <Dialog.Root open={previewOpen} onOpenChange={setPreviewOpen}>
          <Dialog.Trigger asChild>
            <button type="button" className="keep-final-action" disabled={disabled} aria-label={`Preview ${mode} screen`}>
              <Eye className="size-4 shrink-0" aria-hidden="true" /> <span>Preview</span>
            </button>
          </Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className={overlayClass} />
            <Dialog.Content className={contentClass}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <Dialog.Title className="font-display text-[25px] leading-tight">{opening ? "Opening screen preview" : "Closing screen preview"}</Dialog.Title>
                  <Dialog.Description className="mt-1 text-[12px] text-[#62584E]">{opening ? "The film opens on this dark dedication." : "The film fades out on these words."}</Dialog.Description>
                </div>
                <Dialog.Close aria-label={`Close ${mode} preview`} className={closeClass}><X className="size-5" /></Dialog.Close>
              </div>
              <div className="relative mx-auto aspect-[9/16] w-full max-w-[min(280px,calc((100dvh-10rem)*9/16))] overflow-hidden rounded-[14px] bg-[#171311] @container" aria-label={opening ? "Opening moment preview" : "Closing moment preview"}>
                <KeepFilmCard mode={mode} name={recipient.toUpperCase()} message={value} sender={sender} />
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
        {!hasTranscript ? "Add a transcript to generate ideas." : opening ? "Optional · leave blank to skip." : "Optional · leave blank for the default message."}
      </p>
    </section>
  );
}
