import { Link } from "@tanstack/react-router";
import { ChevronDown, CircleHelp, Gift, Home, LockKeyhole, LogIn, Menu, Shield, UserRound, PenLine } from "lucide-react";
import { useEffect, useState } from "react";
import { activeKeepSession } from "@/lib/keep-cloud";
import { isKeepAdmin } from "@/lib/keep-commerce-client";

export function KeepAccountButton() {
  const [open, setOpen] = useState(false);
  const [keepsOpen, setKeepsOpen] = useState(true);
  const [signedIn,setSignedIn] = useState(false);
  const [admin,setAdmin] = useState(false);
  useEffect(() => {
    let cancelled=false;
    void (async()=>{
      try {
        const session=await activeKeepSession();
        if(cancelled)return;
        setSignedIn(!!session);
        if(session)setAdmin(await isKeepAdmin(session));
      } catch { if(!cancelled)setAdmin(false); }
    })();
    return()=>{cancelled=true;};
  },[open]);
  const close=()=>setOpen(false);
  return <div className="relative shrink-0">
    <button type="button" aria-label="Open navigation menu" aria-expanded={open} onClick={() => setOpen(!open)} className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-foreground"><Menu className="size-5" /></button>
    {open && <div className="absolute right-0 top-12 z-[100] w-[min(310px,85vw)] rounded-2xl border border-border/80 bg-card p-4 text-foreground shadow-2xl">
      <p className="mb-3 text-xs uppercase tracking-[.2em] text-[#6A5849]">Menu</p>
      <Link to="/shop" onClick={close} className="flex items-center gap-3 py-3"><Home className="size-4 text-[#6A5849]" />Website home</Link>
      <Link to="/app" onClick={close} className="flex items-center gap-3 py-3"><LogIn className="size-4 text-[#6A5849]" />{signedIn?"My Keep home":"Log in"}</Link>
      {signedIn && <>
        <button onClick={() => setKeepsOpen(!keepsOpen)} className="flex w-full items-center gap-3 py-3 text-left"><Gift className="size-4 text-[#6A5849]" />My Keeps<ChevronDown className={"ml-auto size-4 "+(keepsOpen?"rotate-180":"")} /></button>
        {keepsOpen && <div className="space-y-1 pl-7 text-sm">
          <a href="/?create=1" className="block py-2">+ Create a new Keep</a>
          <Link to="/my-keeps" onClick={close} className="block py-2">See all my Keeps</Link>
        </div>}
        <Link to="/personalize" onClick={close} className="flex items-center gap-3 py-3"><PenLine className="size-4 text-[#6A5849]"/>Personalize my cards</Link>
        <Link to="/app#account" onClick={close} className="flex items-center gap-3 py-3"><UserRound className="size-4 text-[#6A5849]"/>Account</Link>
        {admin && <Link to="/admin" onClick={close} className="flex items-center gap-3 py-3"><Shield className="size-4 text-[#6A5849]"/>Keep admin</Link>}
      </>}
      <div className="my-3 border-t border-border/80" />
      <Link to="/support" onClick={close} className="flex items-center gap-3 py-3"><CircleHelp className="size-4 text-[#6A5849]" />Help &amp; Support</Link>
      {!signedIn && <Link to="/app" onClick={close} className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-[#25211D] px-4 py-3 text-sm font-semibold text-white"><LockKeyhole className="size-4"/>Create a Keep account</Link>}
    </div>}
  </div>;
}
