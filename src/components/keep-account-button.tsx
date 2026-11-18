import { Link } from "@tanstack/react-router";
import { BookOpen, ChevronDown, CircleHelp, Gift, Home, LogIn, Menu, UserRound } from "lucide-react";
import { useState } from "react";

/** Shared navigation for the Keep website and creator pages. */
export function KeepAccountButton() {
  const [open, setOpen] = useState(false);
  const [keepsOpen, setKeepsOpen] = useState(true);
  const closeMenu = () => setOpen(false);
  const linkClass = "flex min-h-11 items-center gap-3 py-2 text-sm hover:text-[#6A5849]";

  return <div className="relative shrink-0">
    <button type="button" aria-label="Open navigation menu" aria-expanded={open} onClick={() => setOpen(!open)} className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground"><Menu className="size-5" /></button>
    {open && <nav aria-label="Keep menu" className="absolute right-0 top-12 z-[100] max-h-[min(80dvh,650px)] w-[min(330px,88vw)] overflow-y-auto rounded-2xl border border-border/80 bg-[#FBF9F6] p-5 text-foreground shadow-2xl">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-[.19em] text-[#6A5849]">Explore Keep</p>
      <Link to="/shop" onClick={closeMenu} className={linkClass}><Home className="size-4 text-[#6A5849]" />Home</Link>
      <a href="/shop#experience" onClick={closeMenu} className={linkClass}>The experience</a>
      <a href="/shop#how-it-works" onClick={closeMenu} className={linkClass}>How it works</a>
      <a href="/shop#packages" onClick={closeMenu} className={linkClass}>Packages</a>
      <Link to="/about" onClick={closeMenu} className={linkClass}><BookOpen className="size-4 text-[#6A5849]" />Our story</Link>
      <div className="my-3 border-t border-border/80" />
      <p className="mb-2 text-[10px] font-medium uppercase tracking-[.19em] text-[#6A5849]">Your Keeps</p>
      <Link to="/app" onClick={closeMenu} className={linkClass}><LogIn className="size-4 text-[#6A5849]" />Log in / Continue editing</Link>
      <button type="button" onClick={() => setKeepsOpen(!keepsOpen)} aria-expanded={keepsOpen} className={linkClass + " w-full text-left"}><Gift className="size-4 text-[#6A5849]" />My Keeps<ChevronDown className={`ml-auto size-4 transition-transform ${keepsOpen ? "rotate-180" : ""}`} /></button>
      {keepsOpen && <div className="space-y-1 pl-7 text-sm">
        <a href="/?create=1" onClick={closeMenu} className="block py-2">+ Create a new Keep</a>
        <Link to="/my-keeps" onClick={closeMenu} className="block py-2">See all my Keeps</Link>
      </div>}
      <Link to="/app" hash="account" onClick={closeMenu} className={linkClass}><UserRound className="size-4 text-[#6A5849]" />Account</Link>
      <div className="my-3 border-t border-border/80" />
      <a href="mailto:support@keep.com" onClick={closeMenu} className={linkClass}><CircleHelp className="size-4 text-[#6A5849]" />Help &amp; Support</a>
    </nav>}
  </div>;
}
