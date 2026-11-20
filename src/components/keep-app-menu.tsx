import { ChevronDown, CircleHelp, Gift, Home, Menu, UserRound } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";

/**
 * Creator-side navigation. Keep's public /shop pages intentionally use the
 * separate editorial storefront menu; all creator/app pages use this menu.
 */
export function KeepAppMenu({ onHome, onAccount }: {
  onHome?: () => void;
  onAccount?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [keepsOpen, setKeepsOpen] = useState(true);
  const [position, setPosition] = useState({ top: 72, right: 16 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const firstLinkRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    const oldOverflow = document.body.style.overflow;
    const oldFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    firstLinkRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const closeOnResize = () => setOpen(false);
    document.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnResize);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnResize);
      document.body.style.overflow = oldOverflow;
      if (oldFocus?.isConnected) oldFocus.focus();
    };
  }, [open]);

  const toggle = () => {
    if (open) { setOpen(false); return; }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPosition({
      top: Math.max(12, Math.round(rect.bottom + 10)),
      right: Math.max(14, Math.round(window.innerWidth - rect.right)),
    });
    setOpen(true);
  };

  const trapFocus = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab") return;
    const controls = panelRef.current?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
    if (!controls?.length) return;
    const first = controls.item(0), last = controls.item(controls.length - 1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first?.focus();
    }
  };

  const close = () => setOpen(false);
  const linkClass = "flex min-h-12 w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-[15px] text-[#211B17] transition-colors hover:bg-[#F4EEE7] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#8B755F]";

  return <>
    <button ref={triggerRef} type="button" aria-label="Open navigation menu"
      aria-expanded={open} aria-haspopup="dialog" onClick={toggle}
      className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-[#D7CFC6] bg-[#FFFCF8] text-[#221D19]">
      <Menu className="size-5" aria-hidden="true" />
    </button>
    {open && createPortal(
      <div className="fixed inset-0 z-[1000]">
        <button type="button" tabIndex={-1} aria-label="Close app menu" onClick={close}
          className="absolute inset-0 cursor-default bg-transparent" />
        <aside ref={panelRef} role="dialog" aria-modal="true" aria-label="Keep app navigation"
          onKeyDown={trapFocus}
          style={{ top: position.top, right: position.right,
            maxHeight: `calc(100dvh - ${position.top + 16}px)` }}
          className="absolute w-[min(310px,calc(100vw-28px))] overflow-y-auto overscroll-contain rounded-2xl border border-[#E0D7CE] bg-[#FFFCF9] p-4 text-[#211B17] shadow-[0_14px_45px_rgba(38,28,18,.22)]">
          <p className="mb-3 px-2 text-[11px] uppercase tracking-[.2em] text-[#786657]">Menu</p>
          <nav aria-label="Keep app menu">
            <a ref={firstLinkRef} href="/app" className={linkClass}
              onClick={event => { close(); if (onHome) { event.preventDefault(); onHome(); } }}>
              <Home className="size-[18px] shrink-0 text-[#756350]" strokeWidth={1.7} aria-hidden="true" />Home
            </a>
            <button type="button" className={linkClass} aria-expanded={keepsOpen}
              onClick={() => setKeepsOpen(current => !current)}>
              <Gift className="size-[18px] shrink-0 text-[#756350]" strokeWidth={1.7} aria-hidden="true" />
              My Keeps
              <ChevronDown className={`ml-auto size-4 transition-transform ${keepsOpen ? "rotate-180" : ""}`} aria-hidden="true" />
            </button>
            {keepsOpen && <div className="space-y-1 pb-1 pl-[38px] text-[14px]">
              <a href="/?create=1" onClick={close} className="block rounded-md py-2 text-[#211B17] hover:text-[#856C54]">+ Create a new Keep</a>
              <a href="/my-keeps" onClick={close} className="block rounded-md py-2 text-[#211B17] hover:text-[#856C54]">See all my Keeps</a>
            </div>}
            <div className="my-3 border-t border-[#E1D8CD]" />
            <a href="/app#account" className={linkClass}
              onClick={event => { close(); if (onAccount) { event.preventDefault(); onAccount(); } }}>
              <UserRound className="size-[18px] shrink-0 text-[#756350]" strokeWidth={1.7} aria-hidden="true" />Account
            </a>
            <a href="mailto:support@keep.com" className={linkClass} onClick={close}>
              <CircleHelp className="size-[18px] shrink-0 text-[#756350]" strokeWidth={1.7} aria-hidden="true" />Help &amp; Support
            </a>
          </nav>
        </aside>
      </div>,
      document.body
    )}
  </>;
}
