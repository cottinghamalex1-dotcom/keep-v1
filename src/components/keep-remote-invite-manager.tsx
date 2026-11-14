import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, CircleCheck, Clipboard, Heart, Images, Link2, Mail, MessageCircle, RefreshCw, Send, Users, X } from "lucide-react";
import { activeKeepSession, saveCloudDraft } from "@/lib/keep-cloud";
import { createRemoteInvite, listRemoteInvites, listRemoteMedia, revokeRemoteInvite, type RemoteInviteStatus, type RemoteScriptPart, type RemoteMediaItem } from "@/lib/keep-remote";
import type { KeepProject } from "@/lib/keep-project";

type Props = {
  project: KeepProject; onContinue: () => void; onCombine: () => Promise<void>;
  onImportMedia: (media:RemoteMediaItem[]) => Promise<number>;
  onBack: () => void; combining: boolean;
};
export const getSpeakerParts = (project: KeepProject, contributorId: string): RemoteScriptPart[] =>
  project.messageParagraphs.map((text,index)=>({
    index,text:text.trim(),
    speaker:project.paragraphSpeakers?.[index]||project.contributors?.[index%Math.max(1,project.contributors.length)]?.id||"",
  })).filter(part=>part.text && part.speaker===contributorId).map(({index,text})=>({index,text}));

export function KeepRemoteInviteManager({ project,onContinue,onCombine,onImportMedia,onBack,combining }:Props) {
  const [statuses,setStatuses]=useState<RemoteInviteStatus[]>([]);
  const [emailEnabled,setEmailEnabled]=useState<boolean|null>(null);
  const [links,setLinks]=useState<Record<string,string>>({});
  const [creatorName,setCreatorName]=useState(project.contributors?.[0]?.name||"");
  const [busyId,setBusyId]=useState("");
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState("");
  const [mediaOpen,setMediaOpen]=useState(false);
  const [mediaLoading,setMediaLoading]=useState(false);
  const [mediaImporting,setMediaImporting]=useState(false);
  const [sharedMedia,setSharedMedia]=useState<RemoteMediaItem[]>([]);
  const [selectedMedia,setSelectedMedia]=useState<string[]>([]);
  const keepId=project.publicationId||"";
  const people=useMemo(()=> (project.contributors??[]).filter(person=>getSpeakerParts(project,person.id).length>0),
    [project.contributors,project.messageParagraphs,project.paragraphSpeakers]);
  const refresh=useCallback(async ()=>{
    if(!keepId)return;
    setLoading(true);
    try {const result=await listRemoteInvites(keepId);setStatuses(result.invites);setEmailEnabled(!!result.notificationsEnabled);}
    catch(error){setMessage(error instanceof Error?error.message:"Unable to check recording invitations.");}
    finally{setLoading(false);}
  },[keepId]);
  useEffect(()=>{
    void refresh();
    const timer=window.setInterval(()=>void refresh(),30000);
    const onFocus=()=>void refresh();
    window.addEventListener("focus",onFocus);
    return ()=>{window.clearInterval(timer);window.removeEventListener("focus",onFocus);};
  },[refresh]);
  const shareText=(name:string,url:string)=>
    `Hi ${name}! ${creatorName.trim()||"I"} is making a special Keep for ${project.recipientName||"someone special"} and would love your voice and a few photos or short video memories, if you have them. This private link walks you through the recording and sharing steps—no app or login needed: ${url}`;
  const invite=async(id:string,name:string)=>{
    setBusyId(id);setMessage("");
    try {
      if(!keepId)throw new Error("Save your Keep before inviting someone.");
      const session=await activeKeepSession();
      if(!session)throw new Error("Sign in to Keep before inviting someone to record.");
      await saveCloudDraft(project,session);
      const result=await createRemoteInvite({
        keepId,contributorId:id,contributorName:name,creatorName:creatorName.trim()||"A loved one",
        recipientName:project.recipientName,occasion:project.occasion,parts:getSpeakerParts(project,id),
      });
      setLinks(old=>({...old,[id]:result.url}));
      await refresh();
      setMessage(`Private recording link ready for ${name}. Share it by text below.`);
    } catch(error){setMessage(error instanceof Error?error.message:"Couldn't create a link. Try again.");}
    finally{setBusyId("");}
  };
  const copy=async(name:string,url:string)=>{
    try {await navigator.clipboard.writeText(shareText(name,url));setMessage(`Copied the message and private link for ${name}.`);}
    catch{setMessage("Copy wasn't available. Tap Share by text instead.");}
  };
  const share=async(name:string,url:string)=>{
    if(navigator.share) {
      try {await navigator.share({text:shareText(name,url)});return;}
      catch{ /* The guest dismissed the share sheet; text is still available. */ }
    }
    window.location.href="sms:&body="+encodeURIComponent(shareText(name,url));
  };
  const totalMoments=statuses.reduce((sum,status)=>sum+(status.mediaCount??0),0);
  const importedIds=new Set(project.memories.map(moment=>moment.remoteMediaId).filter(Boolean));
  const openMediaReview=async()=>{
    if(!keepId)return;
    setMediaLoading(true);setMessage("");
    try{
      const {media}=await listRemoteMedia(keepId);
      setSharedMedia(media);
      setSelectedMedia(media.filter(item=>!importedIds.has(item.id)).map(item=>item.id));
      setMediaOpen(true);
    }catch(issue){setMessage(issue instanceof Error?issue.message:"Couldn't load the shared moments.");}
    finally{setMediaLoading(false);}
  };
  const importSelected=async()=>{
    const choices=sharedMedia.filter(item=>selectedMedia.includes(item.id)&&!importedIds.has(item.id));
    if(!choices.length)return;
    setMediaImporting(true);setMessage("");
    try{
      // Renew signed URLs just before import, in case the creator left the
      // review page open longer than the short-lived download allowance.
      const latest=await listRemoteMedia(keepId);
      const fresh=latest.media.filter(item=>choices.some(choice=>choice.id===item.id));
      if(fresh.length!==choices.length)throw new Error("A shared moment is no longer available. Refresh and try again.");
      const count=await onImportMedia(fresh);
      setSelectedMedia([]);
      setMessage(`${count} shared ${count===1?"moment":"moments"} added to your Keep. You can arrange them in Photos.`);
      await refresh();
    }catch(issue){setMessage(issue instanceof Error?issue.message:"Couldn't add the moments. Your original Keep is unchanged.");}
    finally{setMediaImporting(false);}
  };
  const allReady=people.length>0 && people.every(person=>{
    const s=statuses.find(item=>item.contributorId===person.id);
    return s && s.total===getSpeakerParts(project,person.id).length && s.completed===s.total;
  });
  return <main className="mx-auto max-w-[640px] px-5 pb-16 pt-8 text-[#30271F] sm:px-7">
    <button type="button" onClick={onBack} className="mb-7 flex min-h-10 items-center text-sm text-[#6A5849]">← Back to your words</button>
    <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-[#8F775E]">CREATE TOGETHER · FROM ANYWHERE</p>
    <h1 className="mt-4 font-display text-[clamp(38px,10vw,55px)] leading-[1.12] tracking-[-.035em]">Every voice belongs.</h1>
    <p className="mt-4 text-[14px] leading-7 text-[#6F6256]">
      Share a private link with each person. They'll see their exact words, record with an auto-scrolling teleprompter,
      and send their voice straight back to this Keep. No account or extra app required.
    </p>
    <label className="mt-7 block text-xs text-[#6A5849]">
      Your name (shown in the invitation)
      <input value={creatorName} onChange={e=>setCreatorName(e.target.value.slice(0,60))} placeholder="Diane"
        className="mt-2 min-h-12 w-full rounded-xl border border-[#D7CABD] bg-[#FFFDF9] px-4 text-[16px] text-[#35291F] outline-none focus:border-[#8F775E]" />
    </label>
    {message && <p role="status" className="mt-4 rounded-xl border border-[#D8C7B2] bg-[#FBF2E7] p-3 text-[12px] leading-5">{message}</p>}
    <div className="mt-6 flex items-center justify-between">
      <h2 className="font-display text-[27px]">Invite your people</h2>
      <button type="button" disabled={loading} onClick={()=>void refresh()} className="inline-flex min-h-10 items-center gap-1.5 text-xs text-[#6A5849] disabled:opacity-40">
        <RefreshCw className="size-4" /> Refresh
      </button>
    </div>
    <div className="mt-3 space-y-3">
      {people.map(person=>{
        const parts=getSpeakerParts(project,person.id);
        const status=statuses.find(item=>item.contributorId===person.id);
        const complete=status?.completed??0;
        const finished=!!status&&status.total===parts.length&&complete===status.total;
        const url=links[person.id];
        return <section key={person.id} className="rounded-[18px] border border-[#D8CCBF] bg-[#FFFDF9] px-4 py-4 shadow-[0_6px_20px_rgba(57,44,29,.045)]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#D7C4AE] bg-[#F4EBE0]"><Users className="size-[19px] text-[#8A7056]"/></div>
              <div><h3 className="font-display text-[25px] leading-7">{person.name}</h3>
                <p className="mt-1 text-[11px] text-[#827568]">{parts.length} speaking {parts.length===1?"part":"parts"} · {status?.mediaCount??0} shared moments</p>
              </div>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${finished?"bg-[#E7F1E5] text-[#437045]":"bg-[#F2E9DC] text-[#8B6B45]"}`}>
              {finished?"Complete":status?`${complete} of ${parts.length} saved`:"Not invited"}
            </span>
          </div>
          <div className="mt-4">
            <button type="button" disabled={!!busyId} onClick={()=>void invite(person.id,person.name)}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#171512] px-3 text-[12px] font-semibold text-[#F8F0E6] disabled:opacity-50">
              <Link2 className="size-4" /> {busyId===person.id?"Preparing link…":status?"Refresh private invitation link":"Create private voice + moments link"}
            </button>
            {url && <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={()=>void share(person.name,url)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#BEA994] text-[11px] font-medium"><MessageCircle className="size-4"/> Share by text</button>
              <button type="button" onClick={()=>void copy(person.name,url)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#BEA994] text-[11px] font-medium"><Clipboard className="size-4"/> Copy invite</button>
            </div>}
          </div>}
          {finished && <div className="mt-3 flex items-center gap-2 text-[11px] text-[#527052]"><CircleCheck className="size-4"/> Voice received {status?.emailSent?"· Email sent":""}. They can still use this link for photos and videos.</div>}
          {status&&!finished&&new Date(status.expiresAt).getTime()<Date.now() && <p className="mt-2 text-[11px] text-[#925E4E]">That invitation has expired. Generate a new link.</p>}
          {status&&<button type="button" className="mt-3 inline-flex min-h-8 items-center gap-1.5 text-[10px] text-[#8F705B]" onClick={async()=>{
            if(!window.confirm(`Revoke ${person.name}'s invitation? Their submitted audio will no longer be accessible through the link.`))return;
            try{await revokeRemoteInvite(keepId,status.id);setLinks(old=>{const next={...old};delete next[person.id];return next;});await refresh();}
            catch(error){setMessage(error instanceof Error?error.message:"Couldn't revoke invitation.");}
          }}><X className="size-3"/> Revoke invitation</button>}
        </section>;
      })}
    </div>
    <section className="mt-7 rounded-[20px] border border-[#D4C2AD] bg-[#FCF8F1] p-5" aria-label="Contributed photos and videos">
      <div className="flex items-center gap-2"><Images className="size-5 text-[#886D51]"/><h3 className="font-display text-[26px]">Shared moments.</h3></div>
      <p className="mt-2 text-[12px] leading-6 text-[#726355]">
        {totalMoments} photos or videos received. Each contributor uses their existing private recording link.
        Review the moments before adding them to your Keep.
      </p>
      <button type="button" disabled={mediaLoading||!totalMoments} onClick={()=>void (mediaOpen?setMediaOpen(false):openMediaReview())}
        className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#211D19] px-4 text-[12px] font-semibold text-[#FCF5EC] disabled:opacity-45">
        <Images className="size-4"/>{mediaLoading?"Opening shared moments…":mediaOpen?"Close media review":`Review & add ${totalMoments} shared moments`}
      </button>
      {mediaOpen&&<div className="mt-4 space-y-3 border-t border-[#E3D6C6] pt-4">
        {sharedMedia.map(item=>{
          const already=importedIds.has(item.id);
          return <label key={item.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border px-2.5 py-2.5 ${already?"border-[#E6DED5] bg-[#F0EDE8] opacity-70":"border-[#DDD0C1] bg-white"}`}>
            <input type="checkbox" disabled={already||mediaImporting} checked={already||selectedMedia.includes(item.id)}
              onChange={event=>setSelectedMedia(old=>event.target.checked?[...old,item.id]:old.filter(id=>id!==item.id))}
              aria-label={`Select ${item.name} from ${item.contributorName}`} className="size-4 shrink-0 accent-[#81674D]"/>
            <div className="flex size-[62px] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#EAE1D5]">
              {item.kind==="image"?
                <img src={item.signedUrl} alt="" loading="lazy" referrerPolicy="no-referrer" className="h-full w-full object-cover"/>:
                <video src={item.signedUrl} muted playsInline preload="metadata" className="h-full w-full object-cover"/>}
            </div>
            <div className="min-w-0 flex-1"><p className="truncate text-[12px] font-medium">{item.name}</p>
              <p className="mt-1 text-[10px] text-[#826F5D]">{item.contributorName} · {item.kind==="image"?"Photo":"Video"} · {already?"Already in your Keep":"Ready to add"}</p></div>
          </label>;
        })}
        {!sharedMedia.length&&<p className="text-xs text-[#786657]">No moments have arrived yet. Tap Refresh above to check again.</p>}
        <button type="button" disabled={!selectedMedia.length||mediaImporting} onClick={()=>void importSelected()}
          className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#211D19] px-4 text-[12px] font-semibold text-white disabled:opacity-45">
          {mediaImporting?"Adding moments to your Keep…":`Add ${selectedMedia.length} selected ${selectedMedia.length===1?"moment":"moments"}`}
        </button>
      </div>}
    </section>
    <div className="mt-7 rounded-[20px] border border-[#DACDBD] bg-[#F5EFE6] p-5">
      <div className="flex items-center gap-2"><Heart className="size-[19px] text-[#866B52]"/><h3 className="font-display text-[24px]">Beautifully together.</h3></div>
      <p className="mt-2 text-xs leading-6 text-[#6D5E50]">
        Keep gathers the recordings, balances each speaker's level, adds the same voice polish throughout,
        and places them in script order before your music and photos.
      </p>
      {allReady ?
        <button type="button" disabled={combining} onClick={()=>void onCombine()} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#171512] px-4 font-medium text-[#F7F1E9] disabled:opacity-50">
          <Check className="size-4"/>{combining?"Preparing all voices…":"Bring every voice together"}
        </button>
      : <button type="button" onClick={onContinue} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#171512] px-4 text-[12px] font-semibold text-[#F7F1E9]">
          Continue with photos while they record <ArrowRight className="size-4"/>
        </button>}
      {emailEnabled===false && <p className="mt-3 flex items-start gap-2 rounded-lg border border-[#DECDB8] bg-[#FFFAF3] px-3 py-2 text-[11px] leading-5 text-[#766454]">
        <Mail className="mt-0.5 size-4 shrink-0"/> Recordings are tracked here. Automatic email alerts are not yet configured for this Keep account.
      </p>}
      <p className="mt-3 text-center text-[11px] leading-5 text-[#7D6F61]">
        Invitations expire after 30 days. You can leave and come back to this Keep whenever you like.
      </p>
    </div>
  </main>;
}
