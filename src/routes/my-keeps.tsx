import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronDown, ExternalLink, Gift, Heart, ImageIcon, Link2, Plus, PenLine, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KeepAccountButton } from "@/components/keep-account-button";
import { viewingLink } from "@/lib/keep-publish";

export const Route = createFileRoute("/my-keeps")({ component: MyKeeps });
const endpoint = "https://lwkzhpwugtosbidxvdcr.supabase.co";
const publicKey = "sb_publishable_K8_SWJByLhV78h7gY4NySw_4sgjEVTi";
type Session = {access_token:string; refresh_token:string; expires_at?:number; user:{id:string}};
type KeepRecord = {id:string;owner_id:string;recipient_name:string|null;occasion:string|null;status:string;recipient_token:string;published_at:string|null;created_at:string;published_project?:{openingMessage?:string;messageParagraphs?:string[];memories?:unknown[]}|null};
type CardRef = {keep_id:string|null};
type Resolved = {project?:{memories?:{kind:string;url?:string}[]}};
const fmt = (value:string|null) => value ? new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric"}).format(new Date(value)) : "Not yet published";

function MyKeeps() {
  const [session,setSession] = useState<Session|null>(null);
  const [keeps,setKeeps] = useState<KeepRecord[]>([]);
  const [linkedIds,setLinkedIds] = useState<string[]>([]);
  const [thumbs,setThumbs] = useState<Record<string,string>>({});
  const [expanded,setExpanded] = useState<string|null>(null);
  const [copied,setCopied] = useState<string|null>(null);
  const [deleting,setDeleting] = useState<string|null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    async function request(path:string, token:string, options:RequestInit={}) {
      const res=await fetch(endpoint+path,{...options,headers:{"apikey":publicKey,"Authorization":"Bearer "+token,"Content-Type":"application/json",...options.headers}});
      const data=await res.json().catch(()=>null);
      if(!res.ok)throw new Error(data?.message||data?.error||"Could not load your Keeps");
      return data;
    }
    async function load() {
      try {
        const raw=localStorage.getItem("keep-app-session");
        if(!raw) { setLoading(false); return; }
        let current=JSON.parse(raw) as Session;
        if(current.expires_at && current.expires_at < Math.floor(Date.now()/1000)+90) {
          const response=await fetch(endpoint+"/auth/v1/token?grant_type=refresh_token",{method:"POST",headers:{"apikey":publicKey,"Content-Type":"application/json"},body:JSON.stringify({refresh_token:current.refresh_token})});
          const renewed=await response.json();
          if(!response.ok)throw new Error("Your session has expired. Please sign in again.");
          current={...renewed,expires_at:Math.floor(Date.now()/1000)+renewed.expires_in};
          localStorage.setItem("keep-app-session",JSON.stringify(current));
        }
        const [records,cards]=await Promise.all([
          request("/rest/v1/keeps?select=id,owner_id,recipient_name,occasion,status,recipient_token,published_at,created_at,published_project&owner_id=eq."+encodeURIComponent(current.user.id)+"&order=created_at.desc",current.access_token),
          request("/rest/v1/keep_cards?select=keep_id&creator_id=eq."+encodeURIComponent(current.user.id),current.access_token)
        ]);
        if(cancelled)return;
        setSession(current);setKeeps(records);setLinkedIds((cards as CardRef[]).map(c=>c.keep_id).filter((id):id is string=>!!id));
        setLoading(false);
        for(const keep of (records as KeepRecord[]).filter(k=>k.published_at).slice(0,24)) {
          // The existing publication resolver signs private media temporarily; no media bucket becomes public.
          try {
            const response=await fetch(endpoint+"/functions/v1/keep-publish",{method:"POST",headers:{"apikey":publicKey,"Content-Type":"application/json"},body:JSON.stringify({action:"resolve",token:keep.recipient_token})});
            if(!response.ok)continue;
            const result=(await response.json()) as Resolved;
            const first=result.project?.memories?.find(m=>m.kind==="image"&&m.url)?.url;
            if(first&&!cancelled)setThumbs(prev=>({...prev,[keep.id]:first}));
          }catch { /* card illustration remains as the fallback */ }
        }
      } catch(e) {if(!cancelled){setError(e instanceof Error?e.message:"Could not load your Keeps");setLoading(false);}}
    }
    void load();return()=>{cancelled=true;};
  },[]);
  const remove = async (keep:KeepRecord) => {
    if(!session||deleting)return;
    if(linkedIds.includes(keep.id)){toast.error("This Keep is linked to a physical card. Unlink it before deleting.");return;}
    if(!window.confirm(`Permanently delete the Keep for ${keep.recipient_name||"someone special"}? Its viewing link will stop working. This cannot be undone.`))return;
    setDeleting(keep.id);
    try {
      const res=await fetch(endpoint+"/rest/v1/keeps?id=eq."+encodeURIComponent(keep.id)+"&owner_id=eq."+encodeURIComponent(session.user.id)+"&select=id",{method:"DELETE",headers:{"apikey":publicKey,"Authorization":"Bearer "+session.access_token,"Prefer":"return=representation"}});
      const body=await res.json().catch(()=>null);
      if(!res.ok)throw new Error(body?.message||"Delete unsuccessful");
      if(!Array.isArray(body)||!body.some((row:{id:string})=>row.id===keep.id))throw new Error("Deletion wasn't confirmed.");
      setKeeps(items=>items.filter(item=>item.id!==keep.id));setExpanded(null);toast.success("Keep deleted");
    }catch(e){toast.error(e instanceof Error?e.message:"Could not delete this Keep");}
    finally{setDeleting(null);}
  };
  return <main className="min-h-dvh bg-background text-foreground"><div className="mx-auto max-w-[640px] px-6 pb-24 pt-8">
    <header className="flex items-center justify-between border-b border-border/80 pb-7"><Link to="/app" className="keep-wordmark" aria-label="Keep home">Keep</Link><KeepAccountButton /></header>
    <div className="pt-10"><Link to="/app" className="inline-flex items-center gap-2 text-xs text-[#6A5849]"><ArrowLeft className="size-3.5"/> Home</Link>
      <h1 className="keep-editorial-title mt-8">Your Keeps.</h1>
      <p className="keep-page-description mt-4">The words you've shared. The moments you've made. All in one place.</p>
    </div>
    <div className="mt-9 flex items-center justify-between gap-4 border-b border-border/80 pb-5"><span className="text-xs uppercase tracking-[.17em] text-muted-foreground">{keeps.length} {keeps.length===1?"creation":"creations"}</span><a href="/shop" className="inline-flex items-center gap-2 text-xs text-[#6A5849]"><Plus className="size-4"/> Purchase a Keep</a></div>
    {loading ? <p className="py-12 text-sm text-muted-foreground" role="status">Gathering your Keeps…</p> : !session ? <div className="py-14"><p className="keep-section-title">Your Keeps are waiting.</p><Link to="/app" className="keep-premium-action mt-7 px-6 py-3">Sign in to view them <ArrowRight className="size-4"/></Link></div> : error ? <p role="alert" className="py-10 text-sm text-red-700">{error}</p> : keeps.length===0 ? <div className="py-16 text-center"><Heart className="mx-auto size-7 text-[#6A5849]"/><h2 className="keep-section-title mt-5">Your first Keep starts here.</h2><p className="mt-4 text-sm text-muted-foreground">Something meaningful is waiting to be made.</p><a href="/?create=1" className="keep-premium-action mx-auto mt-8 px-6 py-3">Create a Keep <ArrowRight className="size-4"/></a></div> :
    <div className="mt-6 space-y-3">{keeps.map(keep=><article key={keep.id} className="keep-editorial-surface overflow-hidden">
      <button type="button" onClick={()=>setExpanded(expanded===keep.id?null:keep.id)} aria-expanded={expanded===keep.id} className="flex w-full items-center gap-4 p-4 text-left">
        <div className="relative flex h-24 w-[76px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/80 bg-[#E6DED3]">
          {thumbs[keep.id] ? <img src={thumbs[keep.id]} alt={`Cover moment for ${keep.recipient_name||"this Keep"}`} className="h-full w-full object-cover" loading="lazy"/> : <Gift className="size-6 text-[#6A5849]/65"/>}
        </div>
        <span className="min-w-0 flex-1"><span className="block truncate font-display text-[30px] leading-none">For {keep.recipient_name||"someone special"}</span><span className="mt-2 block truncate text-xs text-[#6A5849]">{keep.occasion||"A personal Keep"}</span><span className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground"><CalendarDays className="size-3"/>{fmt(keep.published_at||keep.created_at)}</span></span>
        <ChevronDown className={`size-4 shrink-0 text-[#6A5849] transition-transform ${expanded===keep.id?"rotate-180":""}`}/>
      </button>
      <a href={`/?edit=${encodeURIComponent(keep.id)}`} className="keep-premium-action mx-4 mb-4 flex items-center justify-center gap-2 px-4 py-3"><PenLine className="size-4"/>Continue Editing</a>
      {expanded===keep.id&&<div className="border-t border-border/80 px-5 pb-5 pt-5">
        <p className="mb-5 text-sm leading-6 text-foreground/75">{keep.published_project?.openingMessage?.trim() || keep.published_project?.messageParagraphs?.[0]?.slice(0,140) || "A memory made to be kept."}</p>
        {keep.published_at&&keep.status==="ready"?<div className="grid gap-2 sm:grid-cols-2">
          <button className="keep-premium-action min-h-12 justify-center px-4 py-3" onClick={async()=>{try{await navigator.clipboard.writeText(viewingLink(keep.recipient_token));setCopied(keep.id);toast.success("Link copied");}catch{toast.error("Copy unavailable. Open the Keep to copy its address.");}}}>{copied===keep.id?<Check className="size-4"/>:<Link2 className="size-4"/>}{copied===keep.id?"Link copied":"Copy viewing link"}</button>
          <a href={viewingLink(keep.recipient_token)} target="_blank" rel="noreferrer" className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border/80 px-4 py-3 text-sm"><ExternalLink className="size-4"/>Open Keep</a>
        </div>:<p className="text-xs text-muted-foreground">Not yet published</p>}
        <div className="mt-5 border-t border-border/80 pt-3"><button type="button" disabled={deleting===keep.id} onClick={()=>void remove(keep)} className="inline-flex items-center gap-2 py-2 text-xs text-red-700 hover:text-red-700"><Trash2 className="size-3.5"/>{deleting===keep.id?"Deleting…":"Delete this Keep"}</button></div>
      </div>}
    </article>)}</div>}
  </div></main>;
}
