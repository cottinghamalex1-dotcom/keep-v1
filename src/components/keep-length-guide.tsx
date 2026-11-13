import { countKeepWords, estimateKeepSeconds, formatKeepTime, getKeepLengthFeedback, KEEP_TARGET_MIN_WORDS, KEEP_TARGET_MAX_WORDS } from "@/lib/keep-length";

type Props = { text: string; className?: string };

export function KeepLengthGuide({ text, className = "" }: Props) {
  const words = countKeepWords(text);
  const seconds = estimateKeepSeconds(words);
  const status = words < KEEP_TARGET_MIN_WORDS ? "short" : words <= KEEP_TARGET_MAX_WORDS ? "target" : "long";

  return <div className={`rounded-xl border border-[#D8CEC3] bg-[#F1EBE3]/65 px-4 py-3 text-[#4D4136] ${className}`} aria-label="Estimated Keep length">
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-[.12em]">A great Keep is 2–3 minutes</span>
      <span className="text-xs tabular-nums">{words} {words === 1 ? "word" : "words"} · about {formatKeepTime(seconds)}</span>
    </div>
    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#DFD3C7]" aria-hidden="true">
      <div className="h-full rounded-full bg-[#806B57] transition-[width] duration-200"
        style={{ width: `${Math.min(100, words / KEEP_TARGET_MAX_WORDS * 100)}%` }} />
    </div>
    <p className="mt-2 text-[11px] leading-[1.55] text-[#716458]" aria-live="polite">
      Suggested: {KEEP_TARGET_MIN_WORDS}–{KEEP_TARGET_MAX_WORDS} words (estimated at 170 spoken words/minute). {getKeepLengthFeedback(words)}
    </p>
    {status === "long" && <p className="mt-1 text-[10px] text-[#827466]">This is a guide, not a limit. Your speaking pace may vary.</p>}
  </div>;
}
