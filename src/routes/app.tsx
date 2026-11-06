import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CreditCard, Gift, Heart, Home, LockKeyhole, LogOut, Plus, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app")({ component: KeepDashboard });
const endpoint = "https://lwkzhpwugtosbidxvdcr.supabase.co";
const publicKey = "sb_publishable_K8_SWJByLhV78h7gY4NySw_4sgjEVTi";
type Session = { access_token: string; refresh_token: string; expires_at?: number; user: { id: string; email?: string } };
type Card = { id: string; card_code: string; recipient_label: string | null; status: string; creator_id: string | null; recipient_id: string | null; keep_id: string | null };
type Keep = { id: string; recipient_name: string | null; status: string };
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
          api("/rest/v1/keeps?select=id,recipient_name,status&order=created_at.desc", {}, current.access_token),
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
  const secondary = "rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm";
  if (!ready) return <main className="min-h-dvh bg-[#111111]" />;
  return <main className="min-h-dvh bg-[#111111] text-[#F6F3ED]"><div className="mx-auto min-h-dvh max-w-[540px] px-6 pb-28 pt-9">
    <header className="mb-12 flex items-center justify-between border-b border-border/50 pb-6"><span className="font-display text-[28px] tracking-tight">keep</span></header>
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
      <section className="mb-9"><p className="eyebrow">Your Keep app</p><h1 className="mt-3 font-display text-3xl">{tab === "home" ? "Your collection" : tab === "given" ? "Given" : tab === "received" ? "Received" : "Account"}</h1><p className="mt-3 text-sm leading-6 text-white/55">{tab === "home" ? "" : tab === "account" ? "" : ""}</p></section>
      {tab === "home" && <div className="space-y-4">
        {cloudDraft && <Link to="/" className="flex items-center justify-between rounded-xl border border-border bg-[#C6B49A]/[.06] p-5"><span><strong className="block text-base">Continue your Keep</strong><small className="mt-1 block text-white/60">For {cloudDraft.recipientName || "someone special"} · Saved to your account</small></span><ArrowRight className="text-[#C6B49A]" /></Link>}
        <Link to="/" className="flex items-center justify-between rounded-xl bg-[#C6B49A] p-5 text-[#111111]"><span><strong className="block text-base">Create a Keep</strong><small>Your story starts here</small></span><Plus /></Link>
        {keeps.length > 0 && <div className="rounded-xl border border-white/15 p-5"><h2 className="mb-3 text-sm font-medium">Your creations</h2>{keeps.map((keep) => <div key={keep.id} className="flex items-center justify-between border-t border-white/10 py-3 text-sm"><span>For {keep.recipient_name || "someone special"}</span><span className="text-xs text-white/50">{keep.status}</span></div>)}<p className="mt-2 text-xs text-white/40">Published Keeps are experienced through their physical cards.</p></div>}
        <div className="grid grid-cols-2 gap-3"><button className={secondary} onClick={() => setTab("given")}><Gift className="mb-3 text-[#C6B49A]" />Given Keeps <span className="block pt-1 text-2xl">{cards.filter(c => c.creator_id === session.user.id).length}</span></button><button className={secondary} onClick={() => setTab("received")}><Heart className="mb-3 text-[#C6B49A]" />Received Keeps <span className="block pt-1 text-2xl">{cards.filter(c => c.recipient_id === session.user.id).length}</span></button></div>
        <div className="rounded-xl border border-border bg-[#C6B49A]/[.03] p-5"><CreditCard className="mb-3 text-[#C6B49A]" /><h2 className="font-display text-2xl">A memory you can hold.</h2><p className="mt-2 text-sm leading-6 text-white/55">One tap, and it all comes back.</p></div>
      </div>}
      {(tab === "given" || tab === "received") && <div className="space-y-3">{cards.filter(c => tab === "given" ? c.creator_id === session.user.id : c.recipient_id === session.user.id).length ? cards.filter(c => tab === "given" ? c.creator_id === session.user.id : c.recipient_id === session.user.id).map(card => <div key={card.id} className="rounded-xl border border-white/15 p-5"><div className="flex items-center gap-4"><div className="flex h-20 w-14 items-center justify-center rounded-lg bg-[#242424]"><CreditCard className="text-[#C6B49A]" /></div><div><strong className="block">{card.recipient_label || "Physical Keep"}</strong><span className="mt-1 block text-xs capitalize text-white/50">{card.status}</span><span className="mt-2 block text-xs text-white/40">Card ending {card.card_code.slice(-4)}</span></div></div><div className="mt-4 border-t border-white/10 pt-3 text-xs text-white/50"><ShieldCheck className="mr-2 inline size-4" />Card management · Playback requires the physical card</div></div>) : <div className="rounded-xl border border-dashed border-white/20 p-9 text-center"><CreditCard className="mx-auto mb-4 text-[#C6B49A]" /><h2 className="font-display text-2xl">Nothing here yet.</h2><p className="mt-3 text-sm leading-6 text-white/55">Your keepsakes will appear here.</p></div>}</div>}
      {tab === "account" && <div className="space-y-4 rounded-xl border border-white/15 p-5"><UserRound className="text-[#C6B49A]" /><p className="text-sm">{displayName || session.user.email}</p><p className="text-xs text-white/50">{session.user.email}</p><button className={secondary} onClick={signOut}><LogOut className="mr-2 inline size-4" />Sign out</button></div>}
    </>}
  </div>
  {session && <nav className="fixed bottom-0 left-1/2 z-20 flex w-full max-w-[540px] -translate-x-1/2 justify-around border-t border-white/10 bg-[#171717]/95 px-2 pb-[max(16px,env(safe-area-inset-bottom))] pt-3 backdrop-blur">{([{ id: "home", label: "Home", Icon: Home }, { id: "given", label: "Given", Icon: Gift }, { id: "received", label: "Received", Icon: Heart }, { id: "account", label: "Account", Icon: UserRound }] as const).map(({ id, label, Icon }) => <button key={id} onClick={() => setTab(id)} className={`flex min-w-16 flex-col items-center gap-1 text-[11px] ${tab === id ? "text-[#C6B49A]" : "text-white/50"}`}><Icon className="size-5" />{label}</button>)}</nav>}
  </main>;
}
