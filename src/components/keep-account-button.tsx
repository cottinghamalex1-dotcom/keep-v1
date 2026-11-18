import { Link } from "@tanstack/react-router";
import { ArrowRight, Gift, Menu, PlayCircle, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { KeepMiniCard } from "@/components/keep-mini-card";

/**
 * Full-height, editorial Keep menu. The overlay is portaled to the document
 * body so the shop's sticky/backdrop-blurred header cannot clip the panel.
 */
export function KeepAccountButton() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  const closeMenu = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open]);

  const handleTabKey = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab") return;
    const focusable = panelRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
    if (!focusable?.length) return;
    const first = focusable.item(0);
    const last = focusable.item(focusable.length - 1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const primaryLink = "group flex min-h-[78px] items-center gap-5 rounded-lg py-2 text-left text-[clamp(19px,2.1vw,24px)] font-normal leading-snug tracking-[-.02em] text-[#FBF8F3] transition-colors hover:text-[#E4CDB5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6D4C0]";
  const secondaryLink = "flex min-h-[46px] items-center text-[17px] font-normal leading-6 text-[#F3EFE8] transition-colors hover:text-[#E4CDB5] focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6D4C0]";

  return <>
    <button
      type="button"
      aria-label="Open navigation menu"
      aria-expanded={open}
      aria-haspopup="dialog"
      onClick={() => setOpen(true)}
      className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground"
    >
      <Menu className="size-5" />
    </button>
    {open && createPortal(
      <div className="fixed inset-0 z-[1000]">
        <button
          type="button"
          tabIndex={-1}
          aria-label="Close menu backdrop"
          className="absolute inset-0 cursor-default bg-[#141615]/55 backdrop-blur-[3px]"
          onClick={closeMenu}
        />
        <aside
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Keep navigation"
          onKeyDown={handleTabKey}
          className="absolute inset-y-0 right-0 flex h-[100dvh] w-[min(92vw,520px)] flex-col overflow-hidden rounded-l-[26px] bg-[#203332] text-[#FBF8F3] shadow-[-24px_0_80px_rgba(7,15,14,.25)] sm:w-[min(87vw,540px)] sm:rounded-l-[32px]"
        >
          <div className="flex shrink-0 items-center justify-between gap-6 px-7 pb-4 pt-[max(26px,env(safe-area-inset-top))] sm:px-9">
            <Link
              to="/app"
              onClick={closeMenu}
              aria-label="Log in / Continue editing"
              className="flex min-h-12 items-center text-[17px] font-semibold text-[#E5CCAA] transition-colors hover:text-white"
            >
              Log in
            </Link>
            <button
              type="button"
              ref={closeRef}
              aria-label="Close navigation menu"
              onClick={closeMenu}
              className="flex size-[52px] shrink-0 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E6D4C0]"
            >
              <X className="size-7" strokeWidth={1.8} />
            </button>
          </div>

          <nav aria-label="Keep menu" className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-7 pb-5 pt-3 sm:px-9">
            <div className="space-y-1 border-b border-[#71817F]/55 pb-6">
              <a href="/shop#package-basic" onClick={closeMenu} className={primaryLink}>
                <Gift className="size-7 shrink-0 text-[#E4D2BA]" strokeWidth={1.4} aria-hidden="true" />
                Shop Basic Keep
              </a>
              <a href="/shop#package-signature" onClick={closeMenu} className={primaryLink}>
                <Sparkles className="size-7 shrink-0 text-[#E4D2BA]" strokeWidth={1.4} aria-hidden="true" />
                Shop Signature Keep
              </a>
              <a href="/shop#how-it-works" onClick={closeMenu} className={primaryLink}>
                <PlayCircle className="size-7 shrink-0 text-[#E4D2BA]" strokeWidth={1.4} aria-hidden="true" />
                How it works
              </a>
            </div>

            <div className="space-y-1 py-7">
              <a href="/shop#experience" onClick={closeMenu} className={secondaryLink}>The experience</a>
              <Link to="/about" onClick={closeMenu} className={secondaryLink}>Our story</Link>
              <a href="/shop#faqs" onClick={closeMenu} className={secondaryLink}>Frequently Asked Questions</a>
              <Link to="/my-keeps" onClick={closeMenu} className={secondaryLink}>See all my Keeps</Link>
              <Link to="/app" hash="account" onClick={closeMenu} className={secondaryLink}>Account</Link>
            </div>

            <a href="/shop#package-signature" onClick={closeMenu} className="group flex items-center gap-4 rounded-xl border border-white/10 bg-[#324746] p-3.5 transition-colors hover:bg-[#3C5350] sm:gap-5 sm:p-4">
              <div className="w-[106px] shrink-0 sm:w-[120px]">
                <KeepMiniCard variant="signature" className="!rounded-[6px] !shadow-[0_8px_20px_rgba(0,0,0,.22)]" />
              </div>
              <div className="min-w-0">
                <p className="text-[16px] font-semibold leading-6 text-[#FFF9F1] sm:text-[17px]">The Signature Keep</p>
                <p className="mt-1.5 text-[12px] leading-5 text-[#D9D5CE] sm:text-[13px]">Your words, beautifully kept.</p>
              </div>
            </a>
            <a href="mailto:support@keep.com" onClick={closeMenu} className="mt-5 inline-flex min-h-10 items-center text-[13px] text-[#DFD5CA] underline-offset-4 hover:underline">Help &amp; Support</a>
          </nav>

          <div className="shrink-0 border-t border-[#71817F]/35 bg-[#203332] px-7 pb-[max(24px,env(safe-area-inset-bottom))] pt-5 sm:px-9">
            <a
              href="/shop#packages"
              onClick={closeMenu}
              className="flex min-h-[62px] w-full items-center justify-center gap-3 rounded-lg bg-[#E8D9BE] px-5 text-center text-[17px] font-semibold text-[#1C2928] transition-colors hover:bg-[#F6EAD5] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Explore Keep packages <ArrowRight className="size-5" aria-hidden="true" />
            </a>
          </div>
        </aside>
      </div>,
      document.body
    )}
  </>;
}
