import { useKeepGiftActivities } from "@/components/keep-gift-activity";
import { activeKeepSession } from "@/lib/keep-cloud";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BookOpen, LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KeepAppMenu } from "@/components/keep-app-menu";
import { KeepLoadingScreen } from "@/components/keep-loading-screen";
import { KeepMyKeepsCollection } from "@/components/keep-my-keeps-collection";
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

function MyKeeps() {
  const [session,setSession] = useState<Session|null>(null);
  const [keeps,setKeeps] = useState<KeepRecord[]>([]);
  const gift = useKeepGiftActivities(session ? keeps.filter(k=>k.status==="ready"&&k.published_at).map(k=>k.id) : []);
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
        const current = await activeKeepSession();
        if(cancelled)return;
        if(!current) { setLoading(false); return; }
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
      const local=loadDraft(keep.id);
      if(local?.publicationId===keep.id) {
        clearDraft(keep.id);
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
  if (loading) return <KeepLoadingScreen />;
  return <main className="min-h-dvh bg-background text-foreground">
    <div className="mx-auto min-h-dvh max-w-[540px] px-6 pb-20 pt-9">
      <header className="flex items-center justify-between border-b border-border/70 pb-6">
        <Link to="/app" className="keep-wordmark" aria-label="Keep home">Keep</Link>
        <KeepAppMenu />
      </header>
      <Link to="/app" className="mb-5 mt-8 inline-flex min-h-10 items-center gap-2 text-xs font-medium text-[#776451] transition-colors hover:text-[#2C221A]">
        <ArrowLeft className="size-4" aria-hidden="true" strokeWidth={1.6}/> Back to home
      </Link>

      {!session ? <div className="mt-6 rounded-[24px] border border-[#DDD0C2] bg-[#FFFCF8] px-7 py-12 text-center">
        <LockKeyhole className="mx-auto size-7 text-[#8A735B]" strokeWidth={1.4} aria-hidden="true"/>
        <h1 className="mt-5 font-display text-[29px] text-[#32251D]">Your Keeps are waiting.</h1>
        <p className="mt-3 text-[13px] leading-6 text-[#746758]">Sign in to see your personal collection.</p>
        <Link to="/app" className="mt-7 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#211B17] text-[13px] font-medium text-[#FFF9F1]">
          Sign in to view them <ArrowRight className="size-4" aria-hidden="true"/>
        </Link>
      </div> : error ? <div role="alert" className="mt-6 rounded-[20px] border border-[#DECABB] bg-[#FFF9F3] px-6 py-8 text-[13px] leading-6 text-[#805442]">{error}</div> :
      <KeepMyKeepsCollection
        keeps={keeps} thumbnails={thumbs} giftActivities={gift.activities} giftActivityFailed={gift.failed}
        expandedId={expanded} copiedId={copied} deletingId={deleting}
        onToggle={id=>setExpanded(expanded===id?null:id)}
        onCopy={keep=>void (async()=>{
          try {
            await navigator.clipboard.writeText(viewingLink(keep.recipient_token));
            setCopied(keep.id);
            toast.success("Link copied");
          } catch { toast.error("Copy unavailable. Open the Keep to copy its address."); }
        })()}
        onDelete={keep=>{ const selected = keeps.find(item=>item.id===keep.id); if (selected) void remove(selected); }}
      />}
    </div>
  </main>;
}
