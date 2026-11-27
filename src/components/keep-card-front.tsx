import { orderedEngravingLines, type CardEngravingLayout } from "@/lib/keep-card-engraving";

type Props = {
  engraving: readonly string[];
  layout?: CardEngravingLayout | undefined;
  openingMessage?: string | undefined;
  showOpeningMessage?: boolean;
  className?: string;
};

/**
 * A front-of-card layout preview, not a claim that a physical card has
 * already been engraved. Keep the lettering readable at phone width.
 */
export function KeepCardFront({ engraving, layout, openingMessage = "", showOpeningMessage = false, className = "" }: Props) {
  const dedication = showOpeningMessage ? openingMessage.trim() : "";
  const lines = orderedEngravingLines(engraving, layout);
  const detailLength = lines.join(" ").length;
  const dense = (dedication.length > 85 && detailLength > 75) || detailLength > 105;
  return (
    <div className={`card-object @container relative aspect-[1.586] w-full overflow-hidden rounded-xl border border-white/15 bg-[#111111] text-[#F7F5F2] shadow-[0_22px_55px_rgba(0,0,0,.20)] ${className}`} aria-label="Preview of the front of your Keep card">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_65%_65%,rgba(255,255,255,.035),transparent_58%)]" />
      <div className="absolute inset-[8%] grid grid-rows-[minmax(min-content,1fr)_auto_minmax(min-content,1fr)] gap-y-[2%]">
        <img src="/brand/keep-wordmark-ivory.svg" alt="Keep" className="row-start-1 mt-[1.5%] w-[31%] self-start object-contain object-left" />
        {dedication && (
          <p className={`row-start-2 min-w-0 self-center break-words text-left font-display ${dense ? "text-[3.5cqw]" : "text-[4.4cqw]"} leading-[1.27] tracking-[-.018em] text-[#EEE5D9]`}>
            {dedication}
          </p>
        )}
        {!!lines.length && (
          <div className={`row-start-3 flex min-w-0 flex-col items-end justify-self-stretch self-end gap-[0.6cqw] text-right font-sans ${dense ? "text-[2.15cqw] tracking-[.10em]" : "text-[2.65cqw] tracking-[.15em]"} font-normal uppercase leading-[1.2] text-[#BDB1A6]`}>
            {lines.map((line, i) => <span key={i} className="max-w-full break-words">{line}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}
