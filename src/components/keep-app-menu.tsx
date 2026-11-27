import { ChevronDown, ChevronRight, CircleHelp, Gift, Home, Layers, Menu, Plus, UserRound, type LucideIcon } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import "./keep-app-menu.css";

function MenuIcon({ icon: Icon }: { icon: LucideIcon }) {
  return <span className="keep-app-menu__icon" aria-hidden="true"><Icon size={18} strokeWidth={1.65} /></span>;
}

function MenuArrow() {
  return <ChevronRight className="keep-app-menu__arrow" aria-hidden="true" />;
}

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
  const linkClass = "keep-app-menu__option";

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
          className="keep-app-menu__panel absolute overflow-y-auto overscroll-contain">
          <p className="keep-app-menu__eyebrow">Menu</p>
          <nav aria-label="Keep app menu" className="keep-app-menu__nav">
            <a ref={firstLinkRef} href="/app" className={linkClass}
              onClick={event => { close(); if (onHome) { event.preventDefault(); onHome(); } }}>
              <MenuIcon icon={Home} /><span className="keep-app-menu__label">Home</span><MenuArrow />
            </a>
            <button type="button" className={linkClass} aria-expanded={keepsOpen}
              onClick={() => setKeepsOpen(current => !current)}>
              <MenuIcon icon={Gift} />
              <span className="keep-app-menu__label">My Keeps</span>
              <ChevronDown className={`keep-app-menu__arrow keep-app-menu__chevron ${keepsOpen ? "keep-app-menu__chevron--open" : ""}`} aria-hidden="true" />
            </button>
            {keepsOpen && <div className="keep-app-menu__submenu">
              <a href="/?create=1" onClick={close} aria-label="+ Create a new Keep"
                className={`${linkClass} keep-app-menu__option--primary`}>
                <MenuIcon icon={Plus} /><span className="keep-app-menu__label">Create a new Keep</span><MenuArrow />
              </a>
              <a href="/my-keeps" onClick={close} className={linkClass}>
                <MenuIcon icon={Layers} /><span className="keep-app-menu__label">See all my Keeps</span><MenuArrow />
              </a>
            </div>}
            <div className="keep-app-menu__divider" />
            <a href="/app#account" className={linkClass}
              onClick={event => { close(); if (onAccount) { event.preventDefault(); onAccount(); } }}>
              <MenuIcon icon={UserRound} /><span className="keep-app-menu__label">Account</span><MenuArrow />
            </a>
            <a href="mailto:support@keep.com" className={linkClass} onClick={close}>
              <MenuIcon icon={CircleHelp} /><span className="keep-app-menu__label">Help &amp; Support</span><MenuArrow />
            </a>
          </nav>
        </aside>
      </div>,
      document.body
    )}
  </>;
}
