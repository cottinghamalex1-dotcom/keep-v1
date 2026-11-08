import { Link } from "@tanstack/react-router";
import { BookOpen, ChevronDown, CircleHelp, Gift, Home, Menu, UserRound } from "lucide-react";
import { useState } from "react";

export function KeepAccountButton() {
  const [open, setOpen] = useState(false);
  const [keepsOpen, setKeepsOpen] = useState(true);
  return <div className="relative shrink-0">
    <button type="button" aria-label="Open navigation menu" aria-expanded={open} onClick={() => setOpen(!open)} className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground"><Menu className="size-5" /></button>
    {open && <div className="absolute right-0 top-12 z-[100] w-[min(310px,85vw)] rounded-2xl border border-border/80 bg-card p-4 text-foreground shadow-2xl">
      <p className="mb-3 text-xs uppercase tracking-[.2em] text-[#6A5849]">Menu</p>
      <Link to="/app" onClick={() => setOpen(false)} className="flex items-center gap-3 py-3"><Home className="size-4 text-[#6A5849]" />Home</Link>
      <button onClick={() => setKeepsOpen(!keepsOpen)} className="flex w-full items-center gap-3 py-3 text-left"><Gift className="size-4 text-[#6A5849]" />My Keeps<ChevronDown className={`ml-auto size-4 ${keepsOpen ? "rotate-180" : ""}`} /></button>
      {keepsOpen && <div className="space-y-1 pl-7 text-sm">
        <a href="/?create=1" className="block py-2">+ Create a new Keep</a>
        <Link to="/my-keeps" onClick={() => setOpen(false)} className="block py-2">See all my Keeps</Link>
        <a href="/app#given" className="block py-2">Keeps given</a>
        <a href="/app#received" className="block py-2">Keeps received</a>
      </div>}
      <div className="my-3 border-t border-border/80" />
      <a href="/app#account" className="flex items-center gap-3 py-3"><UserRound className="size-4 text-[#6A5849]" />Account</a>
      <a href="/about" className="flex items-center gap-3 py-3"><BookOpen className="size-4 text-[#6A5849]" />What is Keep?</a>
      <a href="mailto:support@keep.com" className="flex items-center gap-3 py-3"><CircleHelp className="size-4 text-[#6A5849]" />Help &amp; Support</a>
    </div>}
  </div>;
}
