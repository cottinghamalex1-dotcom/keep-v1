import { viewingLink } from "@/lib/keep-publish";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CreditCard, Gift, Heart, Home, LockKeyhole, LogOut, Plus, ShieldCheck, UserRound, Menu, ChevronDown, BookOpen, CircleHelp, ExternalLink, Link2, Check, PenLine, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app")({ component: KeepDashboard });
const endpoint = "https://lwkzhpwugtosbidxvdcr.supabase.co";
const publicKey = "sb_publishable_K8_SWJByLhV78h7gY4NySw_4sgjEVTi";
type Session = { access_token: string; refresh_token: string; expires_at?: number; user: { id: string; email?: string } };
type Card = { id: string; card_code: string; recipient_label: string | null; status: string; creator_id: string | null; recipient_id: string | null; keep_id: string | null };
type Keep = { id: string; recipient_name: string | null; status: string; recipient_token: string; published_at: string | null };
const sessionKey = "keep-app-session";
function readSession(): Session | null { try { const s = localStorage.getItem(sessionKey); return s ? JSON.parse(s) as Session : null; } catch { return null; } }
function KeepDashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"home" | "given" | "received" | "account">("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [expandedKeep, setExpandedKeep] = useState<string | null>(null);
  const [copiedKeep, setCopiedKeep] = useState<string | null>(null);
  const [keepsOpen, setKeepsOpen] = useState(true);
  useEffect(() => { const hash = window.location.hash.slice(1); if (["home","given","received","account"].includes(hash)) setTab(hash as "home" | "given" | "received" | "account"); }, []);
  const navigate = (next: "home" | "given" | "received" | "account") => { setTab(next); setMenuOpen(false); window.history.replaceState(null, "", next === "home" ? "/app" : "/app#" + next); };
  const [cards, setCards] = useState<Card[]>([]);
  const [keeps, setKeeps] = useState<Keep[]>([]);
  const [cloudDraft, setCloudDraft] = useState<{recipientName?:string;stage?:string}|null>(null);
  const [displayName, setDisplayName] = useState("");
  const api = useCallback(async (path: string, options: RequestInit = {}, token?: string) => {
    const res = await fetch(endpoint + path, { ...options, headers: { apikey: publicKey, "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}), ...options.headers } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.msg || data.error_description || data.message || data.error || "Request failed");
    return data;
  }, []);
  const signOut = useCallback(() => { localStorage.removeItem(sessionKey); setSession(null); setCards([]); setKeeps([]); setTab("home"); }, []);
  useEffect(() => { setSession(readSession()); setReady(true); }, []);
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    const load = async () => {
      try {
        let current = session;
        if (current.expires_at && current.expires_at < Math.floor(Date.now() / 1000) + 90) {
          const renewed = await api("/auth/v1/token?grant_type=refresh_token", { method: "POST", body: JSON.stringify({ refresh_token: current.refresh_token }) });
          current = { ...renewed, expires_at: Math.floor(Date.now() / 1000) + renewed.expires_in };
          if (!cancelled) { localStorage.setItem(sessionKey, JSON.stringify(current)); setSession(current); }
        }
        const [cs, ks, ps, drafts] = await Promise.all([
          api("/rest/v1/keep_cards?select=id,card_code,recipient_label,status,creator_id,recipient_id,keep_id&order=created_at.desc", {}, current.access_token),
          api("/rest/v1/keeps?select=id,recipient_name,status,recipient_token,published_at&order=created_at.desc", {}, current.access_token),
          api("/rest/v1/keep_profiles?select=display_name&user_id=eq." + encodeURIComponent(current.user.id), {}, current.access_token),
          api("/rest/v1/keep_drafts?select=project&owner_id=eq." + encodeURIComponent(current.user.id) + "&limit=1", {}, current.access_token)
        ]);
        if (!cancelled) { setCards(cs); setKeeps(ks); setDisplayName(ps?.[0]?.display_name || ""); setCloudDraft(drafts?.[0]?.project || null); }
      } catch (err) { if (!cancelled) toast.error(err instanceof Error ? err.message : "Couldn't load your account"); }
    };
    void load();
    return () => { cancelled = true; };
  }, [session?.access_token, api]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    try {
      if (register) {
        const result = await api("/auth/v1/signup", { method: "POST", body: JSON.stringify({ email, password, data: { display_name: name } }) });
        if (result.access_token) {
          const next = { ...result, expires_at: Math.floor(Date.now() / 1000) + result.expires_in };
          localStorage.setItem(sessionKey, JSON.stringify(next)); setSession(next);
          if (name.trim()) await api("/rest/v1/keep_profiles", { method: "POST", headers: { Prefer: "resolution=merge-duplicates" }, body: JSON.stringify({ user_id: next.user.id, display_name: name.trim() }) }, next.access_token);
        } else toast.success("Check your email to confirm your account, then sign in.");
      } else {
        const result = await api("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) });
        const next = { ...result, expires_at: Math.floor(Date.now() / 1000) + result.expires_in };
        localStorage.setItem(sessionKey, JSON.stringify(next)); setSession(next);
      }
    } catch (err) { toast.error(err instanceof Error ? err.message : "Couldn't sign in"); }
    finally { setBusy(false); }
  };
  const button = "w-full rounded-xl bg-[#C6B49A] px-5 py-3.5 text-sm font-medium tracking-wide text-[#111111] disabled:opacity-50";
  const secondary = "keep-editorial-surface px-4 py-4 text-sm";
  if (!ready) return <main className="min-h-dvh bg-[#111111]" />;
  return <main className="min-h-dvh bg-[#111111] text-[#F6F3ED]"><div className="mx-auto min-h-dvh max-w-[540px] px-6 pb-12 pt-9">
    <header className="relative mb-12 flex items-center justify-between border-b border-border/50 pb-6"><button onClick={() => navigate("home")} aria-label="Home" className="keep-wordmark">keep</button><button onClick={() => setMenuOpen(!menuOpen)} aria-label="Open navigation menu" aria-expanded={menuOpen} className="flex size-11 items-center justify-center rounded-full border border-white/20"><Menu className="size-5" /></button>{menuOpen && <div className="absolute right-0 top-14 z-50 w-[min(310px,85vw)] rounded-2xl border border-white/15 bg-[#191919] p-4 shadow-2xl"><p className="mb-3 text-xs uppercase tracking-[.2em] text-[#C6B49A]">Menu</p><button onClick={() => navigate("home")} className="flex w-full items-center gap-3 py-3 text-left"><Home className="size-4 text-[#C6B49A]" />Home</button><button onClick={() => setKeepsOpen(!keepsOpen)} className="flex w-full items-center gap-3 py-3 text-left"><Gift className="size-4 text-[#C6B49A]" />My Keeps <ChevronDown className={`ml-auto size-4 transition-transform ${keepsOpen ? "rotate-180" : ""}`} /></button>{keepsOpen && <div className="space-y-1 pl-7 text-sm"><a href="/?create=1" className="block py-2">+ Create a new Keep</a><button onClick={() => navigate("home")} className="block py-2 text-left">See all my Keeps</button><button onClick={() => navigate("given")} className="block py-2 text-left">Keeps given</button><button onClick={() => navigate("received")} className="block py-2 text-left">Keeps received</button></div>}<div className="my-3 border-t border-white/10" /><button onClick={() => navigate("account")} className="flex w-full items-center gap-3 py-3 text-left"><UserRound className="size-4 text-[#C6B49A]" />Account</button><Link to="/about" className="flex items-center gap-3 py-3"><BookOpen className="size-4 text-[#C6B49A]" />What is Keep?</Link><a href="mailto:support@keep.com" className="flex items-center gap-3 py-3"><CircleHelp className="size-4 text-[#C6B49A]" />Help &amp; Support</a></div>}</header>
    {!session ? <section className="mx-auto max-w-sm pt-12">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-[#C6B49A]/30"><LockKeyhole className="text-[#C6B49A]" /></div>
      <h1 className="font-display text-[31px] leading-tight">{register ? "Make something meaningful." : "Welcome back"}</h1>
      <p className="mb-8 mt-4 text-sm leading-7 text-white/55">Your memories, in one place.</p>
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        {register && <label className="block text-xs text-white/70">Your name<input className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 p-4 text-base text-white" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required /></label>}
        <label className="block text-xs text-white/70">Email address<input type="email" className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 p-4 text-base text-white" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
        <label className="block text-xs text-white/70">Password<input type="password" minLength={6} className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 p-4 text-base text-white" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={register ? "new-password" : "current-password"} required /></label>
        <button disabled={busy} className={button}>{busy ? "Please wait…" : register ? "Create account" : "Sign in"}</button>
      </form>
      <button className="mt-6 text-sm text-[#C6B49A]" onClick={() => setRegister(!register)}>{register ? "Already have an account? Sign in" : "New to Keep? Create an account"}</button>
    </section> : <>
      <section className={tab === "home" ? "mb-9 pt-3 text-center" : "mb-10 pt-4"}>{tab === "home" ? <><h1 className="keep-editorial-title">Say what matters.<span className="mt-1 block italic">Keep it forever.</span></h1><p className="keep-page-description mx-auto mt-6">Turn your words and moments into a beautiful, lasting keepsake they can hold onto forever.</p><div className="mt-9 grid grid-cols-3 gap-2 border-y border-white/[.11] py-5 text-[10px] leading-5 text-[#C6B49A]"><span className="flex flex-col items-center gap-2"><PenLine className="size-4" />01 · Your words</span><span className="flex flex-col items-center gap-2"><ImageIcon className="size-4" />02 · Your moments</span><span className="flex flex-col items-center gap-2"><Heart className="size-4" />03 · Their Keep</span></div></> : <h1 className="keep-editorial-title">{tab === "given" ? "Keeps given" : tab === "received" ? "Keeps received" : "Your account"}</h1>}</section>
      {tab === "home" && <div className="space-y-4">
        {cloudDraft && <Link to="/" className="keep-editorial-surface flex items-center justify-between p-5"><span><strong className="block text-base">Continue your Keep</strong><small className="mt-1 block text-white/60">For {cloudDraft.recipientName || "someone special"} · Saved to your account</small></span><ArrowRight className="text-[#C6B49A]" /></Link>}
        <a href="/?create=1" className="keep-premium-action w-full p-5"><span><strong className="block text-base">Create a Keep</strong><small>Your story starts here</small></span><Plus /></a>
        {keeps.length > 0 && <section className="keep-editorial-surface p-5"><h2 className="mb-5 text-sm font-medium tracking-wide">Your creations</h2><div className="space-y-3">{keeps.map((keep) => <div key={keep.id} className="overflow-hidden rounded-xl border border-white/[.13] bg-[#1b1a19]"><button type="button" aria-expanded={expandedKeep === keep.id} onClick={() => setExpandedKeep(expandedKeep === keep.id ? null : keep.id)} className="flex min-h-18 w-full items-center gap-3 px-4 py-4 text-left"><span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#C6B49A]/25 text-[#C6B49A]"><Gift className="size-4" /></span><span className="min-w-0 flex-1 font-display text-[25px] leading-tight">For {keep.recipient_name || "someone special"}</span><span className="text-[10px] capitalize tracking-wide text-[#C6B49A]">{keep.status}</span><ChevronDown className={`size-4 shrink-0 text-white/65 transition-transform ${expandedKeep === keep.id ? "rotate-180" : ""}`} /></button>{expandedKeep === keep.id && <div className="border-t border-white/[.12] px-4 pb-4 pt-4">{keep.status === "ready" && keep.published_at ? <><div className="flex flex-col gap-2 sm:flex-row"><button type="button" className="keep-premium-action min-h-11 flex-1 justify-center px-4 py-3" onClick={async () => {try {await navigator.clipboard.writeText(viewingLink(keep.recipient_token));setCopiedKeep(keep.id);} catch {toast.error("Copy unavailable. Open your Keep and copy its address.");}}}>{copiedKeep === keep.id ? <Check className="size-4" /> : <Link2 className="size-4" />}{copiedKeep === keep.id ? "Link copied" : "Copy viewing link"}</button><a href={viewingLink(keep.recipient_token)} target="_blank" rel="noreferrer" className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/20 px-4 py-3 text-sm"><ExternalLink className="size-4" />Open Keep</a></div><p className="mt-4 text-[11px] leading-5 text-white/45">Your link stays the same when you update this Keep. Use it to link your NFC card.</p></> : <p className="text-xs text-white/55">This Keep isn't ready to share yet.</p>}</div>}</div>)}</div></section>}
        <div className="grid grid-cols-2 gap-3"><button className={secondary} onClick={() => setTab("given")}><Gift className="mb-3 text-[#C6B49A]" />Given Keeps <span className="block pt-1 text-2xl">{cards.filter(c => c.creator_id === session.user.id).length}</span></button><button className={secondary} onClick={() => setTab("received")}><Heart className="mb-3 text-[#C6B49A]" />Received Keeps <span className="block pt-1 text-2xl">{cards.filter(c => c.recipient_id === session.user.id).length}</span></button></div>
        <a href="/?create=1" className="keep-editorial-surface flex items-center justify-between px-5 py-4 text-[#F6F3ED]"><span><strong className="block text-sm font-medium">Create another Keep</strong><small className="mt-1 block text-xs text-white/50">Start a new story</small></span><Plus className="size-5 text-[#C6B49A]" /></a>
      </div>}
      {(tab === "given" || tab === "received") && <div className="space-y-3">{cards.filter(c => tab === "given" ? c.creator_id === session.user.id : c.recipient_id === session.user.id).length ? cards.filter(c => tab === "given" ? c.creator_id === session.user.id : c.recipient_id === session.user.id).map(card => <div key={card.id} className="rounded-xl border border-white/15 p-5"><div className="flex items-center gap-4"><div className="flex h-20 w-14 items-center justify-center rounded-lg bg-[#242424]"><CreditCard className="text-[#C6B49A]" /></div><div><strong className="block">{card.recipient_label || "Physical Keep"}</strong><span className="mt-1 block text-xs capitalize text-white/50">{card.status}</span><span className="mt-2 block text-xs text-white/40">Card ending {card.card_code.slice(-4)}</span></div></div><div className="mt-4 border-t border-white/10 pt-3 text-xs text-white/50"><ShieldCheck className="mr-2 inline size-4" />Card management · Playback requires the physical card</div></div>) : <div className="rounded-xl border border-dashed border-white/20 p-9 text-center"><CreditCard className="mx-auto mb-4 text-[#C6B49A]" /><h2 className="font-display text-2xl">Nothing here yet.</h2><p className="mt-3 text-sm leading-6 text-white/55">Your keepsakes will appear here.</p></div>}</div>}
      {tab === "account" && <div className="space-y-4 rounded-xl border border-white/15 p-5"><UserRound className="text-[#C6B49A]" /><p className="text-sm">{displayName || session.user.email}</p><p className="text-xs text-white/50">{session.user.email}</p><button className={secondary} onClick={signOut}><LogOut className="mr-2 inline size-4" />Sign out</button></div>}
    </>}
  </div>
  </main>;
}
