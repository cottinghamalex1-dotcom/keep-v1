import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronDown, ExternalLink, Gift, Heart, ImageIcon, Link2, Plus, PenLine, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KeepAccountButton } from "@/components/keep-account-button";
import { KeepLibraryCard } from "@/components/keep-library-card";
import { viewingLink } from "@/lib/keep-publish";
import { deleteOwnedKeep, keepDeleteConfirmation } from "@/lib/keep-delete";
import { clearDraft, loadDraft, projectBlobIds } from "@/lib/keep-project";
import { deleteBlobs } from "@/lib/keep-media-store";

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
    const published = keep.status === "ready" && !!keep.published_at;
    if(!window.confirm(keepDeleteConfirmation(keep.recipient_name,published,linkedIds.includes(keep.id))))return;
    setDeleting(keep.id);
    try {
      const result=await deleteOwnedKeep(keep.id,session.access_token);
      const local=loadDraft();
      if(local?.publicationId===keep.id) {
        clearDraft();
        void deleteBlobs(projectBlobIds(local));
      }
      setKeeps(items=>items.filter(item=>item.id!==keep.id));
      setLinkedIds(ids=>ids.filter(id=>id!==keep.id));
      setThumbs(items=>{const next={...items};delete next[keep.id];return next;});
      setExpanded(null);
      if(result.mediaCleanupPending) toast.warning("Keep deleted and viewing link disabled, but some media cleanup needs attention.");
      else toast.success(published?"Keep permanently deleted. Viewing link disabled.":"Keep deleted.");
    }catch(e){toast.error(e instanceof Error?e.message:"Could not delete this Keep");}
    finally{setDeleting(null);}
  };
  return <main className="min-h-dvh bg-background text-foreground"><div className="mx-auto max-w-[640px] px-6 pb-24 pt-8">
    <header className="flex items-center justify-between border-b border-border/80 pb-7"><Link to="/app" className="keep-wordmark" aria-label="Keep home">Keep</Link><KeepAccountButton /></header>
    <div className="pt-10"><Link to="/app" className="inline-flex items-center gap-2 text-xs text-[#6A5849]"><ArrowLeft className="size-3.5"/> Home</Link>
      <h1 className="keep-editorial-title mt-8">Your Keeps.</h1>
      <p className="keep-page-description mt-4">The words you've shared. The moments you've made. All in one place.</p>
    </div>
    <div className="mt-9 flex items-center justify-between gap-4 border-b border-border/80 pb-5"><span className="text-xs uppercase tracking-[.17em] text-muted-foreground">{keeps.length} {keeps.length===1?"creation":"creations"}</span><a href="/?create=1" className="inline-flex items-center gap-2 text-xs text-[#6A5849]"><Plus className="size-4"/> Create a Keep</a></div>
    {loading ? <p className="py-12 text-sm text-muted-foreground" role="status">Gathering your Keeps…</p> : !session ? <div className="py-14"><p className="keep-section-title">Your Keeps are waiting.</p><Link to="/app" className="keep-premium-action mt-7 px-6 py-3">Sign in to view them <ArrowRight className="size-4"/></Link></div> : error ? <p role="alert" className="py-10 text-sm text-red-700">{error}</p> : keeps.length===0 ? <div className="py-16 text-center"><Heart className="mx-auto size-7 text-[#6A5849]"/><h2 className="keep-section-title mt-5">Your first Keep starts here.</h2><p className="mt-4 text-sm text-muted-foreground">Something meaningful is waiting to be made.</p><a href="/?create=1" className="keep-premium-action mx-auto mt-8 px-6 py-3">Create a Keep <ArrowRight className="size-4"/></a></div> :
    <div className="mt-6 space-y-3">{keeps.map(keep=>
      <KeepLibraryCard key={keep.id} keep={keep} thumbnail={thumbs[keep.id]} expanded={expanded===keep.id}
        copied={copied===keep.id} deleting={deleting===keep.id}
        onToggle={()=>setExpanded(expanded===keep.id?null:keep.id)}
        onCopy={()=>void (async()=>{try{await navigator.clipboard.writeText(viewingLink(keep.recipient_token));setCopied(keep.id);toast.success("Link copied");}catch{toast.error("Copy unavailable. Open the Keep to copy its address.");}})()}
        onDelete={()=>void remove(keep)} />
    )}</div>}
  </div></main>;
}
