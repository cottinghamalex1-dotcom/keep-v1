import { viewingLink } from "@/lib/keep-publish";
import { claimAndListPurchases, isKeepAdmin } from "@/lib/keep-commerce-client";
import { KeepLibraryCard } from "@/components/keep-library-card";
import { KeepCreateCTA } from "@/components/keep-create-cta";
import { KeepCollectionCard } from "@/components/keep-collection-card";
import { KeepAccountDashboard } from "@/components/keep-account-dashboard";
import { deleteOwnedKeep, keepDeleteConfirmation } from "@/lib/keep-delete";
import { clearDraft, loadDraft, projectBlobIds } from "@/lib/keep-project";
import { deleteBlobs } from "@/lib/keep-media-store";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, CreditCard, Gift, Heart, Home, LockKeyhole, LogOut, Plus, ShieldCheck, UserRound, Menu, ChevronDown, BookOpen, CircleHelp, ExternalLink, Link2, Check, PenLine, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/app")({ component: KeepDashboard });
const endpoint = "https://lwkzhpwugtosbidxvdcr.supabase.co";
const publicKey = "sb_publishable_K8_SWJByLhV78h7gY4NySw_4sgjEVTi";
type Session = { access_token: string; refresh_token: string; expires_at?: number; user: { id: string; email?: string } };
type Card = { id: string; card_code: string; recipient_label: string | null; status: string; creator_id: string | null; recipient_id: string | null; keep_id: string | null };
type Keep = { id: string; recipient_name: string | null; status: string; recipient_token: string; published_at: string | null; created_at?: string | null; occasion?: string | null; published_project?: {openingMessage?:string;messageParagraphs?:string[]}|null };
const sessionKey = "keep-app-session";
function readSession(): Session | null { try { const s = localStorage.getItem(sessionKey); return s ? JSON.parse(s) as Session : null; } catch { return null; } }
function KeepDashboard() {
  const [session, setSession] = useState<Session | null>(null);
  const [paidAccess, setPaidAccess] = useState<"loading"|"paid"|"unpaid"|"error">("loading");
  const [adminAccess, setAdminAccess] = useState(false);
  const [accountDataLoaded, setAccountDataLoaded] = useState(false);
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
  const [deletingKeep, setDeletingKeep] = useState<string | null>(null);
  const [deletingDraft, setDeletingDraft] = useState(false);
  const [expandedDraft, setExpandedDraft] = useState(false);
  const [thumbnails, setThumbnails] = useState<Record<string,string>>({});
  const [keepsOpen, setKeepsOpen] = useState(true);
  const clearMatchingLocalDraft = (publicationId?: string) => {
    // Do not delete a different Keep's local edits.
    const local = loadDraft();
    if (local && (publicationId ? local.publicationId === publicationId : !local.publicationId)) {
      clearDraft();
      void deleteBlobs(projectBlobIds(local));
    }
  };
  const removeStandaloneDraft = async () => {
    if (!session || deletingDraft || !cloudDraft?.active || keeps.some(k => k.id === cloudDraft.publicationId)) return;
    if (!window.confirm(`Delete your unfinished Keep for ${cloudDraft.recipientName || "someone special"}? This draft cannot be recovered.`)) return;
    setDeletingDraft(true);
    try {
      const response = await api("/rest/v1/keep_drafts?owner_id=eq." + encodeURIComponent(session.user.id) + "&select=project", {}, session.access_token);
      if (!Array.isArray(response) || !response[0]?.project || response[0].project.publicationId !== cloudDraft.publicationId) throw new Error("Your draft changed. Refresh before deleting.");
      await api("/rest/v1/keep_drafts?owner_id=eq." + encodeURIComponent(session.user.id), { method: "DELETE" }, session.access_token);
      clearMatchingLocalDraft(cloudDraft.publicationId);
      setCloudDraft(null);
      toast.success("Draft deleted");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not delete this draft"); }
    finally { setDeletingDraft(false); }
  };
  const removeKeep = async (keep: Keep) => {
    if (!session || deletingKeep) return;
    const published = keep.status === "ready" && !!keep.published_at;
    const hasCard = cards.some(c => c.keep_id === keep.id);
    if (!window.confirm(keepDeleteConfirmation(keep.recipient_name, published, hasCard))) return;
    setDeletingKeep(keep.id);
    try {
      const result = await deleteOwnedKeep(keep.id, session.access_token);
      // The server deletes only the matching recent draft. Never erase another creation.
      if (cloudDraft?.publicationId === keep.id) setCloudDraft(null);
      clearMatchingLocalDraft(keep.id);
      setKeeps(prev => prev.filter(k => k.id !== keep.id));
      setThumbnails(prev => {const copy={...prev};delete copy[keep.id];return copy;});
      setCards(prev => prev.map(card => card.keep_id === keep.id ? { ...card, keep_id: null } : card));
      if (expandedKeep === keep.id) setExpandedKeep(null);
      if (result.mediaCleanupPending) {
        toast.warning("Keep deleted and viewing link disabled, but some media cleanup needs attention.");
      } else {
        toast.success(published ? "Keep permanently deleted. Viewing link disabled." : "Keep deleted.");
      }
    } catch(e) { toast.error(e instanceof Error ? e.message : "Could not delete this Keep"); }
    finally { setDeletingKeep(null); }
  };
  useEffect(() => { const hash = window.location.hash.slice(1); if (["home","given","received","account"].includes(hash)) setTab(hash as "home" | "given" | "received" | "account"); }, []);
  const navigate = (next: "home" | "given" | "received" | "account") => { setTab(next); setMenuOpen(false); window.history.replaceState(null, "", next === "home" ? "/app" : "/app#" + next); };
  const [cards, setCards] = useState<Card[]>([]);
  const [keeps, setKeeps] = useState<Keep[]>([]);
  const [cloudDraft, setCloudDraft] = useState<{recipientName?:string;stage?:string;publicationId?:string;active?:boolean}|null>(null);
  const [displayName, setDisplayName] = useState("");
  const api = useCallback(async (path: string, options: RequestInit = {}, token?: string) => {
    const res = await fetch(endpoint + path, { ...options, headers: { apikey: publicKey, "Content-Type": "application/json", ...(token ? { Authorization: "Bearer " + token } : {}), ...options.headers } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.msg || data.error_description || data.message || data.error || "Request failed");
    return data;
  }, []);
  const signOut = useCallback(() => { localStorage.removeItem(sessionKey); setSession(null); setCards([]); setKeeps([]); setThumbnails({}); setTab("home"); setPaidAccess("loading"); setAdminAccess(false); }, []);
  useEffect(() => { setSession(readSession()); setReady(true); }, []);
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    void (async () => {
      try {
        const [verified, operator] = await Promise.all([claimAndListPurchases(session), isKeepAdmin(session)]);
        if (!cancelled) { setPaidAccess(verified.some(p => ["paid","reserved","approved","in_production","shipped"].includes(p.status)) ? "paid" : "unpaid"); setAdminAccess(operator); }
      } catch { if (!cancelled) setPaidAccess("error"); }
    })();
    return () => { cancelled = true; };
  }, [session?.access_token]);
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
          api("/rest/v1/keeps?select=id,recipient_name,status,recipient_token,published_at,created_at,occasion,published_project&owner_id=eq." + encodeURIComponent(current.user.id) + "&order=updated_at.desc", {}, current.access_token),
          api("/rest/v1/keep_profiles?select=display_name&user_id=eq." + encodeURIComponent(current.user.id), {}, current.access_token),
          api("/rest/v1/keep_drafts?select=project&owner_id=eq." + encodeURIComponent(current.user.id) + "&limit=1", {}, current.access_token)
        ]);
        if (!cancelled) { setCards(cs); setKeeps(ks); setDisplayName(ps?.[0]?.display_name || ""); setCloudDraft(drafts?.[0]?.project || null); setAccountDataLoaded(true); }
        // Reuse My Keeps' privately signed cover images; never make the
        // underlying media storage public or persist expiring URLs.
        void Promise.all((ks as Keep[]).filter(k=>k.published_at).slice(0,16).map(async keep=>{
          try {
            const res=await fetch(endpoint+"/functions/v1/keep-publish",{method:"POST",headers:{apikey:publicKey,"Content-Type":"application/json"},body:JSON.stringify({action:"resolve",token:keep.recipient_token})});
            if(!res.ok)return null;
            const data=await res.json();
            const url=(data?.project?.memories as {kind?:string;url?:string}[]|undefined)?.find(m=>m.kind==="image"&&m.url)?.url;
            return url ? {id:keep.id,url} : null;
          } catch {return null;}
        })).then(results=>{
          if(cancelled)return;
          setThumbnails(Object.fromEntries(results.filter((r):r is {id:string;url:string}=>!!r).map(r=>[r.id,r.url])));
        });
      } catch (err) { if (!cancelled) { setAccountDataLoaded(true); toast.error(err instanceof Error ? err.message : "Couldn't load your account"); } }
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
  const button = "w-full rounded-xl bg-primary px-5 py-3.5 text-sm font-medium text-primary-foreground disabled:opacity-50 hover:bg-primary/90";
  const secondary = "keep-editorial-surface px-4 py-4 text-sm";
  if (!ready) return <main className="min-h-dvh bg-background" />;
  return <main className="min-h-dvh bg-background text-foreground"><div className="mx-auto min-h-dvh max-w-[540px] px-6 pb-12 pt-9">
    <header className="relative mb-12 flex items-center justify-between border-b border-border/50 pb-6"><button onClick={() => navigate("home")} aria-label="Home" className="keep-wordmark">Keep</button><button onClick={() => setMenuOpen(!menuOpen)} aria-label="Open navigation menu" aria-expanded={menuOpen} className="flex size-11 items-center justify-center rounded-full border border-border/80"><Menu className="size-5" /></button>{menuOpen && <div className="absolute right-0 top-14 z-50 w-[min(310px,85vw)] rounded-2xl border border-border/80 bg-card p-4 shadow-2xl"><p className="mb-3 text-xs uppercase tracking-[.2em] text-[#6A5849]">Menu</p><button onClick={() => navigate("home")} className="flex w-full items-center gap-3 py-3 text-left"><Home className="size-4 text-[#6A5849]" />Home</button><button onClick={() => setKeepsOpen(!keepsOpen)} className="flex w-full items-center gap-3 py-3 text-left"><Gift className="size-4 text-[#6A5849]" />My Keeps <ChevronDown className={`ml-auto size-4 transition-transform ${keepsOpen ? "rotate-180" : ""}`} /></button>{keepsOpen && <div className="space-y-1 pl-7 text-sm"><a href="/?create=1" className="block py-2">+ Create a new Keep</a><Link to="/my-keeps" onClick={() => setMenuOpen(false)} className="block py-2 text-left">See all my Keeps</Link></div>}<div className="my-3 border-t border-border/80" /><button onClick={() => navigate("account")} className="flex w-full items-center gap-3 py-3 text-left"><UserRound className="size-4 text-[#6A5849]" />Account</button><Link to="/personalize" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 py-3"><CreditCard className="size-4 text-[#6A5849]" />Personalize cards</Link>{adminAccess && <Link to="/admin" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 py-3"><ShieldCheck className="size-4 text-[#6A5849]"/>Keep admin</Link>}<Link to="/support" onClick={() => setMenuOpen(false)} className="flex items-center gap-3 py-3"><CircleHelp className="size-4 text-[#6A5849]" />Help &amp; Support</Link></div>}</header>
    {!session ? <section className="mx-auto max-w-sm pt-12">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-xl border border-[#B8A999]/30"><LockKeyhole className="text-[#6A5849]" /></div>
      <h1 className="font-display text-[31px] leading-tight">{register ? "Make something meaningful." : "Welcome back"}</h1>
      <p className="mb-8 mt-4 text-sm leading-7 text-muted-foreground">Your memories, in one place.</p>
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        {register && <label className="block text-xs text-foreground/75">Your name<input className="mt-2 w-full rounded-xl border border-border/80 bg-card p-4 text-base text-foreground" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required /></label>}
        <label className="block text-xs text-foreground/75">Email address<input type="email" className="mt-2 w-full rounded-xl border border-border/80 bg-card p-4 text-base text-foreground" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /></label>
        <label className="block text-xs text-foreground/75">Password<input type="password" minLength={6} className="mt-2 w-full rounded-xl border border-border/80 bg-card p-4 text-base text-foreground" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={register ? "new-password" : "current-password"} required /></label>
        <button disabled={busy} className={button}>{busy ? "Please wait…" : register ? "Create account" : "Sign in"}</button>
      </form>
      <button className="mt-6 text-sm text-[#6A5849]" onClick={() => setRegister(!register)}>{register ? "Already have an account? Sign in" : "New to Keep? Create an account"}</button>
    </section> : (paidAccess === "loading" || !accountDataLoaded) ? <section className="mx-auto max-w-sm pt-12 text-center text-sm text-[#796C5C]">Checking your Keep account and saved creations…</section> : paidAccess !== "paid" && keeps.length === 0 && !cloudDraft?.active && !adminAccess ? <section className="mx-auto max-w-sm pt-10">
      <div className="mb-5 flex size-14 items-center justify-center rounded-xl border border-[#C9B8A7]"><CreditCard className="size-6 text-[#826A56]"/></div>
      <h1 className="font-display text-[32px] leading-tight">Your Keep account is ready.</h1>
      <p className="mt-4 text-sm leading-7 text-muted-foreground">Welcome to Keep. Choose your card package to unlock the creator and begin making something meaningful.</p>
      <Link to="/shop" hash="packages" className="mt-7 flex min-h-12 items-center justify-between rounded-xl bg-[#29231E] px-5 text-sm font-medium text-white">Explore Basic, Signature &amp; Deluxe <ArrowRight className="size-4"/></Link>
      <p className="mt-5 text-xs leading-6 text-[#817163]">Already purchased? Sign in using the email on your order, verify that address, then refresh this page. Only confirmed payments unlock your Keep.</p>
    </section> : <>
      <section className={tab === "home" ? "keep-horizon-hero relative mb-9 pt-11 text-center" : "mb-10 pt-4"}>{tab === "home" ? <><h1 className="keep-editorial-title relative z-10">Say what matters.<span className="mt-1 block italic">Keep it forever.</span></h1><p className="keep-page-description relative z-10 mx-auto mt-6">Turn your words and moments into a beautiful, lasting keepsake they can hold onto forever.</p><KeepCreateCTA /></> : <h1 className="keep-editorial-title">{tab === "given" ? "Keeps given" : tab === "received" ? "Keeps received" : "Your account"}</h1>}</section>
      {tab === "home" && <div className="space-y-4">

        {(keeps.length > 0 || cloudDraft?.active) && <section aria-labelledby="your-creations-heading" className="keep-creations-frame relative isolate overflow-hidden rounded-[24px] p-4 sm:p-5">
          <div className="relative z-10 mb-4 flex items-center justify-between gap-3 border-b border-[#8D7760]/40 pb-4 sm:mb-5">
            <h2 id="your-creations-heading" className="font-display text-[clamp(28px,6vw,36px)] font-normal leading-[1.1] tracking-[-.03em] text-[#FFF9F0]">Your creations</h2>
            <Link to="/my-keeps" className="flex min-h-10 shrink-0 items-center gap-1.5 text-xs font-medium text-[#DBC6AA] transition-colors hover:text-white focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C5AB8D]">View all <ArrowRight className="size-4" aria-hidden="true" /></Link>
          </div>
          <div className="relative z-10 space-y-3">
            {cloudDraft?.active && !keeps.some(k=>k.id===cloudDraft.publicationId) &&
              <article className="keep-editorial-surface overflow-hidden border border-[#DED8D1]">
                <button type="button" onClick={()=>setExpandedDraft(!expandedDraft)} aria-label="Options for unfinished draft" aria-expanded={expandedDraft} className="flex w-full items-center gap-4 p-4 text-left">
                  <span className="flex h-24 w-[76px] shrink-0 items-center justify-center rounded-lg border border-border/70 bg-[#E8E0D5]"><Gift className="size-6 text-[#7D6A56]"/></span>
                  <span className="min-w-0 flex-1"><span className="block truncate font-display text-[29px]">For {cloudDraft.recipientName||"someone special"}</span><span className="mt-2 block text-xs text-[#796957]">Unfinished draft</span></span>
                  <ChevronDown className={`size-5 shrink-0 text-[#685747] transition-transform ${expandedDraft?"rotate-180":""}`}/>
                </button>
                {expandedDraft && <div className="space-y-3 border-t border-border/75 px-5 py-5">
                  <a href="/?resume=1" className="keep-premium-action flex min-h-12 items-center justify-center gap-2 px-4 py-3 text-sm"><PenLine className="size-4"/> Continue editing</a>
                  <button type="button" disabled={deletingDraft} onClick={()=>void removeStandaloneDraft()} className="flex min-h-11 items-center gap-2 text-xs text-[#8C574C] disabled:opacity-50"><Trash2 className="size-4"/>{deletingDraft?"Deleting…":"Delete draft"}</button>
                </div>}
              </article>}
            {keeps.map(keep=><KeepLibraryCard key={keep.id} keep={keep} thumbnail={thumbnails[keep.id]}
              expanded={expandedKeep===keep.id} copied={copiedKeep===keep.id} deleting={deletingKeep===keep.id}
              onToggle={()=>setExpandedKeep(expandedKeep===keep.id?null:keep.id)}
              onCopy={()=>void (async()=>{try{await navigator.clipboard.writeText(viewingLink(keep.recipient_token));setCopiedKeep(keep.id);toast.success("Link copied");}catch{toast.error("Copy unavailable. Open the Keep and copy its address.");}})()}
              onDelete={()=>void removeKeep(keep)}/>)}
          </div>
        </section>}
        <div className="grid grid-cols-2 gap-3">
          <KeepCollectionCard kind="given" count={cards.filter(c => c.creator_id === session.user.id).length} onClick={() => setTab("given")} />
          <KeepCollectionCard kind="received" count={cards.filter(c => c.recipient_id === session.user.id).length} onClick={() => setTab("received")} />
        </div>
      </div>}
      {(tab === "given" || tab === "received") && <div className="space-y-3">{cards.filter(c => tab === "given" ? c.creator_id === session.user.id : c.recipient_id === session.user.id).length ? cards.filter(c => tab === "given" ? c.creator_id === session.user.id : c.recipient_id === session.user.id).map(card => <div key={card.id} className="rounded-xl border border-border/80 p-5"><div className="flex items-center gap-4"><div className="flex h-20 w-14 items-center justify-center rounded-lg bg-secondary"><CreditCard className="text-[#6A5849]" /></div><div><strong className="block">{card.recipient_label || "Physical Keep"}</strong><span className="mt-1 block text-xs capitalize text-muted-foreground">{card.status}</span><span className="mt-2 block text-xs text-muted-foreground">Card ending {card.card_code.slice(-4)}</span></div></div><div className="mt-4 border-t border-border/80 pt-3 text-xs text-muted-foreground"><ShieldCheck className="mr-2 inline size-4" />Card management · Playback requires the physical card</div></div>) : <div className="rounded-xl border border-dashed border-border/80 p-9 text-center"><CreditCard className="mx-auto mb-4 text-[#6A5849]" /><h2 className="font-display text-2xl">Nothing here yet.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">Your keepsakes will appear here.</p></div>}</div>}
      {tab === "account" && <KeepAccountDashboard key={session.user.id + ":" + displayName}
        displayName={displayName} email={session.user.email ?? ""}
        created={keeps.length + (cloudDraft?.active&&!keeps.some(k=>k.id===cloudDraft.publicationId)?1:0)}
        published={keeps.filter(k=>k.status==="ready"&&!!k.published_at).length}
        drafts={keeps.filter(k=>k.status!=="ready"||!k.published_at).length + (cloudDraft?.active&&!keeps.some(k=>k.id===cloudDraft.publicationId)?1:0)}
        given={cards.filter(c=>c.creator_id===session.user.id).length}
        received={cards.filter(c=>c.recipient_id===session.user.id).length}
        onSaveName={async value=>{await api("/rest/v1/keep_profiles?on_conflict=user_id",{method:"POST",headers:{Prefer:"resolution=merge-duplicates"},body:JSON.stringify({user_id:session.user.id,display_name:value})},session.access_token);setDisplayName(value);}}
        onChangePassword={async password=>{await api("/auth/v1/user",{method:"PUT",body:JSON.stringify({password})},session.access_token);}}
        onExport={()=>{
          const payload={exportedAt:new Date().toISOString(),account:{email:session.user.email,displayName},
            keeps:keeps.map(k=>({id:k.id,recipient:k.recipient_name,occasion:k.occasion,status:k.status,createdAt:k.created_at,publishedAt:k.published_at,openingMessage:k.published_project?.openingMessage,transcript:k.published_project?.messageParagraphs})),
            activeDraft:cloudDraft?{recipient:(cloudDraft as {recipientName?:string}).recipientName,stage:(cloudDraft as {stage?:string}).stage,messageParagraphs:(cloudDraft as {messageParagraphs?:string[]}).messageParagraphs}:null,
            note:"This export contains metadata and written words, not your photos, videos, audio, or full account archive."};
          const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}));
          const anchor=document.createElement("a");anchor.href=url;anchor.download="my-keep-details.json";document.body.appendChild(anchor);anchor.click();anchor.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);
          toast.success("Keep details downloaded");
        }}
        onSignOut={signOut}/>} 
    </>}
  </div>
  </main>;
}
