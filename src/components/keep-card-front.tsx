import { useLayoutEffect, useRef, type CSSProperties } from "react";
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
  // The card footer is determined solely by its own fields. The opening
  // message may use the remaining space, but must never affect the footer.
  const denseDetails = detailLength > 105;
  const denseOpening = denseDetails || (dedication.length > 85 && (detailLength > 75 || lines.length >= 3));
  const footerText = lines.join(" • ");
  const footer = useRef<HTMLDivElement>(null);
  const footerLine = useRef<HTMLSpanElement>(null);
  const maxFooterSize = denseDetails ? 2.15 : 2.65;
  // Conservative initial size for SSR; then fit the actual glyph widths in
  // the browser. The calculation depends only on the optional details.
  const initialFooterSize = Math.min(maxFooterSize, 82 / Math.max(1, Array.from(footerText).length * 1.25));
  useLayoutEffect(() => {
    const container = footer.current;
    const line = footerLine.current;
    if (!container || !line) return;
    let active = true;
    const fit = () => {
      if (!active || !container.clientWidth) return;
      container.style.setProperty("--keep-engraving-size", `${maxFooterSize}cqw`);
      const width = line.getBoundingClientRect().width;
      if (!width) {
        container.style.setProperty("--keep-engraving-size", `${initialFooterSize}cqw`);
        return;
      }
      if (width > container.clientWidth - 1) {
        const size = maxFooterSize * (container.clientWidth - 1) / width;
        container.style.setProperty("--keep-engraving-size", `${Math.floor(size * 1000) / 1000}cqw`);
      }
    };
    fit();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : undefined;
    if (container.parentElement) observer?.observe(container.parentElement);
    void document.fonts?.ready.then(fit);
    return () => {
      active = false;
      observer?.disconnect();
    };
  }, [footerText, initialFooterSize, maxFooterSize]);
  return (
    <div className={`card-object @container relative aspect-[1.586] w-full overflow-hidden rounded-xl border border-white/15 bg-[#111111] text-[#F7F5F2] shadow-[0_22px_55px_rgba(0,0,0,.20)] ${className}`} aria-label="Preview of the front of your Keep card">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_65%_65%,rgba(255,255,255,.035),transparent_58%)]" />
      <div className="absolute inset-[8%] grid grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto] gap-y-[2%]">
        <img src="/brand/keep-wordmark-ivory.svg" alt="Keep" className="row-start-1 mt-[1.5%] w-[31%] self-start object-contain object-left" />
        {dedication && (
          <p className={`row-start-2 min-w-0 self-center break-words text-left font-display ${denseOpening ? "text-[3.5cqw]" : "text-[4.4cqw]"} leading-[1.27] tracking-[-.018em] text-[#EEE5D9]`}>
            {dedication}
          </p>
        )}
        {!!lines.length && (
          <div ref={footer} style={{ "--keep-engraving-size": `${initialFooterSize}cqw` } as CSSProperties} className={`text-[length:var(--keep-engraving-size)] row-start-3 min-w-0 justify-self-stretch self-end text-left font-sans ${denseDetails ? "tracking-[.10em]" : "tracking-[.15em]"} font-normal uppercase leading-[1.2] text-[#BDB1A6]`}>
            <span ref={footerLine} className="inline-block w-max whitespace-nowrap">{footerText}</span>
          </div>
        )}
      </div>
    </div>
  );
}
