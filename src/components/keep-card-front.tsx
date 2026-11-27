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
  const openingSize = dense ? "text-[clamp(9px,2.35vw,13px)]" : "text-[clamp(11px,2.7vw,16px)]";
  return (
    <div className={`card-object relative aspect-[1.586] w-full overflow-hidden rounded-xl border border-white/15 bg-[#111111] text-[#F7F5F2] shadow-[0_22px_55px_rgba(0,0,0,.20)] ${className}`} aria-label="Preview of the front of your Keep card">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_65%_65%,rgba(255,255,255,.035),transparent_58%)]" />
      <img src="/brand/keep-wordmark-ivory.svg" alt="Keep" className={`absolute left-[8%] w-[30%] object-contain object-left ${dense ? "top-[8%] h-[18%]" : "top-[10%] h-[25%]"}`} />
      {dedication ? (
        <div className="absolute bottom-[8%] left-[8%] right-[8%]">
          <div className="mb-[5%] h-px w-[13%] bg-[#E6D9C7]/60" aria-hidden="true" />
          <p className={`max-w-[95%] whitespace-pre-wrap break-words font-display ${openingSize} leading-[1.27] tracking-[-.018em] text-[#EEE5D9]`}>
            {dedication}
          </p>
          {!!lines.length && <div className={`mt-[5%] flex flex-wrap items-baseline gap-x-2 gap-y-1 text-left font-sans ${dense ? "text-[clamp(6px,1.5vw,9px)]" : "text-[clamp(7px,1.75vw,10px)]"} font-normal uppercase leading-tight tracking-[.15em] text-[#BDB1A6]`}>
            {lines.map((line, i) => <span key={i} className="max-w-full break-words">{line}{i < lines.length - 1 ? <span className="ml-2 text-[#7A716A]">·</span> : null}</span>)}
          </div>}
        </div>
      ) : (
        <div className={`absolute bottom-[11%] left-[8%] right-[8%] flex flex-col items-start gap-[4px] text-left ${detailLength > 85 ? "text-[clamp(8px,2vw,11px)] tracking-[.12em]" : "text-[clamp(10px,2.7vw,13px)] tracking-[.20em]"} font-normal uppercase leading-[1.4]`}>
          {lines.map((line, i) => <span key={i} className="max-w-full break-words">{line}</span>)}
        </div>
      )}
    </div>
  );
}
