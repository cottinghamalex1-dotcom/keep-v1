import { useLayoutEffect, useRef, type CSSProperties } from "react";
import { KeepTapPhoneIcon } from "@/components/keep-tap-phone-icon";
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
  // Preserve the editable field order while balancing the single footer row.
  // With the usual Title / From / Date selection, the title sits at the
  // left and the sender and date appear together at the right.
  const split = Math.max(1, Math.floor(lines.length / 2));
  const leftDetails = lines.slice(0, split).join(" • ");
  const rightDetails = lines.slice(split).join(" • ");
  const detailLength = lines.join(" ").length;
  const denseDetails = detailLength > 105;
  const footer = useRef<HTMLDivElement>(null);
  const leftLine = useRef<HTMLSpanElement>(null);
  const rightLine = useRef<HTMLSpanElement>(null);
  const maxFooterSize = denseDetails ? 2.05 : 2.55;
  // The footer depends solely on its own fields, never on the opening line.
  const initialFooterSize = Math.min(maxFooterSize, 79 / Math.max(1, Array.from(`${leftDetails} ${rightDetails}`).length * 1.25));
  useLayoutEffect(() => {
    const container = footer.current;
    const left = leftLine.current;
    if (!container || !left) return;
    let active = true;
    const fit = () => {
      if (!active || !container.clientWidth) return;
      container.style.setProperty("--keep-engraving-size", `${maxFooterSize}cqw`);
      const right = rightLine.current;
      const width = left.getBoundingClientRect().width + (right?.getBoundingClientRect().width ?? 0);
      const available = container.clientWidth * (right ? 0.96 : 1) - 1;
      if (!width) {
        container.style.setProperty("--keep-engraving-size", `${initialFooterSize}cqw`);
        return;
      }
      if (width > available) {
        const size = maxFooterSize * available / width;
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
  }, [leftDetails, rightDetails, initialFooterSize, maxFooterSize]);

  const openingArea = useRef<HTMLDivElement>(null);
  const openingLine = useRef<HTMLParagraphElement>(null);
  const maxOpeningSize = 5.8;
  const initialOpeningSize = Math.min(maxOpeningSize, maxOpeningSize * Math.sqrt(110 / Math.max(1, dedication.length)));
  useLayoutEffect(() => {
    const area = openingArea.current;
    const line = openingLine.current;
    if (!area || !line) return;
    let active = true;
    const fit = () => {
      if (!active || !area.clientWidth || !area.clientHeight) return;
      const setSize = (size: number) => area.style.setProperty("--keep-opening-size", `${size}cqw`);
      const fits = () => line.scrollHeight <= area.clientHeight && line.scrollWidth <= area.clientWidth;
      setSize(maxOpeningSize);
      if (fits()) return;
      // Let longer dedications scale into the available central area without
      // moving the logo, tap cue or engraving footer, or clipping any words.
      let low = 0.5;
      let high = maxOpeningSize;
      for (let i = 0; i < 12; i++) {
        const mid = (low + high) / 2;
        setSize(mid);
        if (fits()) low = mid;
        else high = mid;
      }
      setSize(Math.floor(low * 1000) / 1000);
    };
    fit();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(fit) : undefined;
    observer?.observe(area);
    void document.fonts?.ready.then(fit);
    return () => {
      active = false;
      observer?.disconnect();
    };
  }, [dedication, leftDetails, rightDetails]);

  return (
    <div className={`card-object @container relative aspect-[1.586] w-full overflow-hidden rounded-xl border border-white/15 bg-[#111111] text-[#F7F5F2] shadow-[0_22px_55px_rgba(0,0,0,.20)] ${className}`} aria-label="Preview of the front of your Keep card">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_65%_65%,rgba(255,255,255,.035),transparent_58%)]" />
      <div className="absolute inset-[8%] grid grid-cols-[minmax(0,1fr)] grid-rows-[auto_minmax(0,1fr)_auto] gap-y-[4%]" style={{ fontFamily: '"Keep Film Playfair", Georgia, serif' }}>
        <img src="/brand/keep-wordmark-ivory.svg" alt="Keep" className="row-start-1 mt-[1.5%] aspect-[231.25/98.5] w-[21%] self-start object-contain object-left" />
        <KeepTapPhoneIcon className="pointer-events-none absolute top-[1.5%] right-0 w-[4.8cqw] text-[#D9CFC2]" />
        {dedication && (
          <div ref={openingArea} style={{ "--keep-opening-size": `${initialOpeningSize}cqw` } as CSSProperties} className="row-start-2 flex min-h-0 min-w-0 items-center">
            <p ref={openingLine} className="w-full min-w-0 text-[length:var(--keep-opening-size)] text-left font-normal italic leading-[1.18] tracking-[-.025em] text-[#F1EBE3] [overflow-wrap:anywhere]">
              {dedication}
            </p>
          </div>
        )}
        {!!lines.length && (
          <div ref={footer} style={{ "--keep-engraving-size": `${initialFooterSize}cqw` } as CSSProperties} className={`row-start-3 flex w-full min-w-0 items-end justify-between gap-[4%] self-end text-[length:var(--keep-engraving-size)] ${denseDetails ? "tracking-[.08em]" : "tracking-[.13em]"} font-normal uppercase leading-[1.2] text-[#D9CFC2]`}>
            <span ref={leftLine} className="shrink-0 whitespace-nowrap text-left">{leftDetails}</span>
            {rightDetails && <>{" "}<span ref={rightLine} className="shrink-0 whitespace-nowrap text-right">{rightDetails}</span></>}
          </div>
        )}
      </div>
    </div>
  );
}
