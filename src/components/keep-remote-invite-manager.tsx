import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CircleCheck, Clipboard, Images, Link2, Mail, MessageCircle, Mic, RefreshCw, Users, X } from "lucide-react";
import { activeKeepSession, saveCloudDraft } from "@/lib/keep-cloud";
import { createRemoteInvite, releaseRemoteScript, listRemoteInvites, listRemoteMedia, revokeRemoteInvite, type RemoteInviteStatus, type RemoteScriptPart, type RemoteMediaItem } from "@/lib/keep-remote";
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
  const [step,setStep]=useState(0);
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
  const invite=async(id:string,name:string,recordMyPart=false)=>{
    // Opening synchronously from the tap lets mobile Safari create the recording tab.
    // The invite is prepared asynchronously after the draft is safely saved.
    const recordingTab=recordMyPart?window.open("about:blank","_blank"):null;
    if(recordingTab)recordingTab.opener=null;
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
      if(recordMyPart){
        if(recordingTab)recordingTab.location.replace(result.url);
        setMessage(recordingTab
          ? "Your recording opened in a separate tab. Your voice saves directly to this Keep."
          : "Your recording is ready. Tap Record here to begin.");
      }else setMessage(`Private recording link ready for ${name}. Share it by text below.`);
    } catch(error){
      if(recordingTab&&!recordingTab.closed)recordingTab.close();
      setMessage(error instanceof Error?error.message:"Couldn't create a link. Try again.");
    }
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
  const releaseAll=async()=>{
    setBusyId("release");setMessage("");
    try{
      const session=await activeKeepSession();if(!session)throw new Error("Sign in to release the shared message.");
      await saveCloudDraft(project,session);
      const pending=people.filter(person=>person.id!==project.contributors?.[0]?.id&&statuses.some(s=>s.contributorId===person.id&&s.creativeStory?.completed&&!s.total));
      for(const person of pending)await releaseRemoteScript({keepId,contributorId:person.id,contributorName:person.name,creatorName:creatorName.trim(),recipientName:project.recipientName,occasion:project.occasion,parts:getSpeakerParts(project,person.id)});
      await refresh();
      setMessage("Their speaking parts are ready on the same private links. They can return to review their own words and record.");
    }catch(e){setMessage(e instanceof Error?e.message:"Couldn't share the script. Please try again.");}finally{setBusyId("");}
  };
  const totalMoments=statuses.reduce((sum,status)=>sum+(status.mediaCount??0),0);
  const importedIds=new Set([...project.memories,...(project.selfieVideos??[])].map(moment=>moment.remoteMediaId).filter(Boolean));
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
  const readyCount=people.filter(person=>{
    const s=statuses.find(item=>item.contributorId===person.id);
    return s && s.total===getSpeakerParts(project,person.id).length && s.completed===s.total;
  }).length;
  const allReady=people.length>0 && readyCount===people.length;
  const navigationBusy=combining||mediaImporting||!!busyId;
  const goToStep=(next:number)=>{
    if(next===step||navigationBusy)return;
    setStep(next);
    window.requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:"auto"}));
  };
  const steps=["Voices","Photos","Finish"];
  const nextButton=(label:string,next:number)=>(
    <button type="button" className="keep-message-actions__primary w-full" disabled={navigationBusy} onClick={()=>goToStep(next)}>
      <span>{label}</span><span className="keep-message-actions__arrow" aria-hidden="true"><ArrowRight size={19} strokeWidth={1.6}/></span>
    </button>
  );
  const refreshButton=(
    <button type="button" disabled={loading} onClick={()=>void refresh()} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 text-xs text-[#6A5849] disabled:opacity-40">
      <RefreshCw className={`size-4 ${loading?"animate-spin":""}`}/> Refresh
    </button>
  );
  return <div className="mx-auto w-full max-w-xl px-5 pb-[max(32px,env(safe-area-inset-bottom))] pt-6 text-[#30271F] sm:px-8">
    <button type="button" onClick={onBack} disabled={navigationBusy} className="mb-4 inline-flex min-h-10 items-center gap-2 text-xs text-[#6A5849]"><ArrowLeft className="size-4"/> Back to your words</button>
    <header>
      <h1 className="font-display text-[clamp(34px,9vw,43px)] leading-[1.1] tracking-[-.035em] [text-wrap:balance]">Every voice belongs.</h1>
      <p className="mt-2 text-[13px] leading-5 text-muted-foreground">One Keep, all your voices.</p>
    </header>
    <nav aria-label="Group recording steps" className="sticky top-[calc(4.25rem+env(safe-area-inset-top))] z-20 -mx-1 mb-3 mt-4 bg-background px-1 pb-3 pt-2 md:top-[80px]">
      <div className="grid grid-cols-3 gap-1 rounded-full border border-[#DDD5CB] bg-[#EEE9E1] p-1">
        {steps.map((label,index)=><button key={label} type="button" aria-current={step===index?"step":undefined}
          onClick={()=>goToStep(index)} disabled={navigationBusy}
          className={`min-h-11 min-w-0 rounded-full border px-1 py-2 text-[13px] font-medium transition-colors ${step===index?"border-[#4D4238] bg-gradient-to-br from-[#29251F] to-[#3B3229] text-[#FFFDFC] shadow-[0_2px_5px_rgba(42,32,22,.16)]":"border-transparent text-[#6A5849] hover:bg-[#F7F5F2]"}`}>
          <span className="mr-1 text-[10px] opacity-70">{index+1}.</span>{label}
        </button>)}
      </div>
    </nav>
    {message && <p role="status" className="mb-4 rounded-xl border border-[#D8C7B2] bg-[#FBF2E7] p-3 text-[12px] leading-5">{message}</p>}
    {step===0 && <section aria-label="Voices" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="keep-section-title">Record or invite.</h2>
        {refreshButton}
      </div>
      <p className="text-[13px] leading-6 text-muted-foreground">Record on this device, or send each person a private invitation. Every voice saves to this Keep.</p>
      <label className="block text-xs font-medium text-[#6A5849]">
        Your name on invitations
        <input value={creatorName} onChange={e=>setCreatorName(e.target.value.slice(0,60))} placeholder="Your name"
          className="keep-premium-field mt-2 min-h-12 w-full px-4 text-[16px]" />
      </label>
    {project.collaborativeCreative&&statuses.some(s=>s.creativeStory?.completed&&!s.total)&&<button type="button" disabled={!!busyId} className="keep-message-actions__primary w-full" onClick={()=>void releaseAll()}><span>{busyId==="release"?"Sharing their words…":"Share speaking parts with contributors"}</span><ArrowRight size={19}/></button>}
    <div className="space-y-3">
      {people.map(person=>{
        const parts=getSpeakerParts(project,person.id);
        const status=statuses.find(item=>item.contributorId===person.id);
        const complete=status?.completed??0;
        const finished=!!status&&status.total===parts.length&&complete===status.total;
        const existingCreativeLink=!!project.collaborativeCreative&&!!status?.creativeStory&&status.total>0;
        const expired=!!status&&new Date(status.expiresAt).getTime()<Date.now();
        const url=expired?undefined:links[person.id];
        return <section key={person.id} aria-label={`${person.name}’s recording`} className="rounded-[18px] border border-[#D8CCBF] bg-[#FFFDF9] px-4 py-4 shadow-[0_6px_20px_rgba(57,44,29,.045)]">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#D7C4AE] bg-[#F4EBE0]"><Users className="size-[19px] text-[#8A7056]"/></div>
              <div className="min-w-0"><h3 className="break-words font-display text-[25px] leading-7">{person.name}</h3>
                <p className="mt-1 text-[11px] text-[#827568]">{parts.length} speaking {parts.length===1?"part":"parts"}</p>
              </div>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${finished?"bg-[#E7F1E5] text-[#437045]":"bg-[#F2E9DC] text-[#8B6B45]"}`}>
              {finished?"Complete":status?`${complete} of ${parts.length} saved`:"Not started"}
            </span>
          </div>

          <div className="mt-4 space-y-2">
            {existingCreativeLink&&!expired&&<p className="rounded-lg bg-[#F4EEE6] p-3 text-xs leading-5">Their original creative invitation now includes their own speaking parts. Ask them to reopen it to review and record.</p>}
            {!finished && (!project.collaborativeCreative||person.id===project.contributors?.[0]?.id) && (url
              ? <a href={url} target="_blank" rel="noopener noreferrer" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#211D19] px-3 text-[13px] font-medium text-[#FCF5EC] hover:bg-[#3B3229]">
                  <Mic className="size-4"/> {complete>0?"Continue recording":"Record here"}
                </a>
              : <button type="button" disabled={!!busyId} onClick={()=>void invite(person.id,person.name,true)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#211D19] px-3 text-[13px] font-medium text-[#FCF5EC] hover:bg-[#3B3229] disabled:opacity-55">
                  <Mic className="size-4"/> {busyId===person.id?"Preparing link…":complete>0?"Continue recording":"Record here"}
                </button>)}
            {!url&&(!project.collaborativeCreative||person.id===project.contributors?.[0]?.id||!status?.creativeStory||!!status.total)&&<button type="button" disabled={!!busyId} onClick={()=>void invite(person.id,person.name)}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#D4C8BB] bg-[#FFFCF7] px-3 text-[13px] font-medium text-[#594735] disabled:opacity-55">
              <Link2 className="size-4"/> {busyId===person.id?"Preparing link…":`Invite ${person.name}`}
            </button>}
            {url&&<div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={()=>void share(person.name,url)} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[#D4C8BB] px-2 text-xs font-medium"><MessageCircle className="size-4"/> Share by text</button>
              <button type="button" onClick={()=>void copy(person.name,url)} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[#D4C8BB] px-2 text-xs font-medium"><Clipboard className="size-4"/> Copy invite</button>
            </div>}
          </div>
          {finished&&<div className="mt-3 flex items-center gap-2 text-[11px] text-[#527052]"><CircleCheck className="size-4"/> Voice saved. {status?.emailSent?"Creator notified.":""}</div>}
          {status&&!finished&&expired && <p className="mt-2 text-[11px] text-[#925E4E]">That invitation has expired. Generate a new link.</p>}
          {status&&<button type="button" className="mt-3 inline-flex min-h-8 items-center gap-1.5 text-[10px] text-[#8F705B]" onClick={async()=>{
            if(!window.confirm(`Revoke ${person.name}'s invitation? They will no longer be able to share recordings, photos or videos.`))return;
            try{await revokeRemoteInvite(keepId,status.id);setLinks(old=>{const next={...old};delete next[person.id];return next;});await refresh();}
            catch(error){setMessage(error instanceof Error?error.message:"Couldn't revoke invitation.");}
          }}><X className="size-3"/> Revoke invitation</button>}
        </section>;
      })}
    </div>
      <p className="text-center text-[11px] leading-5 text-muted-foreground">Invitations stay active for 30 days. You can return anytime.</p>
      <div className="border-t border-border pt-5">{nextButton("Continue to photos",1)}</div>
    </section>}
    {step===1 && <section aria-label="Contributed photos and videos" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="keep-section-title">Shared moments.</h2>
        {refreshButton}
      </div>
      <p className="text-[13px] leading-6 text-muted-foreground">Everyone can share photos and videos through their recording link. Review and add what they send.</p>
      <div className="rounded-[20px] border border-[#D8CCBF] bg-[#FFFDF9] p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-full border border-[#D7C4AE] bg-[#F4EBE0]"><Images className="size-5 text-[#886D51]"/></div>
        <div>
          <h3 className="font-display text-[24px] leading-tight">{totalMoments} shared {totalMoments===1?"moment":"moments"}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{totalMoments} {totalMoments===1?"photo or video":"photos or videos"} received</p>
        </div>
      </div>
      {!totalMoments&&<p className="mt-4 text-xs leading-5 text-muted-foreground">Nothing has arrived yet. You can keep going and add moments later.</p>}
      {!!totalMoments&&<button type="button" disabled={mediaLoading} onClick={()=>void (mediaOpen?setMediaOpen(false):openMediaReview())}
        className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#211D19] px-4 text-[12px] font-semibold text-[#FCF5EC] disabled:opacity-45">
        <Images className="size-4"/>{mediaLoading?"Opening shared moments…":mediaOpen?"Close media review":"Review shared moments"}
      </button>}
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
              <p className="mt-1 text-[10px] text-[#826F5D]">{item.contributorName} · {item.purpose==="selfie"?"Selfie video":item.kind==="image"?"Photo":"Video"} · {already?"Already in your Keep":"Ready to add"}</p></div>
          </label>;
        })}
        {!sharedMedia.length&&<p className="text-xs text-[#786657]">No moments have arrived yet. Tap Refresh above to check again.</p>}
        <button type="button" disabled={!selectedMedia.length||mediaImporting} onClick={()=>void importSelected()}
          className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#211D19] px-4 text-[12px] font-semibold text-white disabled:opacity-45">
          {mediaImporting?"Adding moments to your Keep…":`Add ${selectedMedia.length} selected ${selectedMedia.length===1?"moment":"moments"}`}
        </button>
      </div>}
      </div>
      <div className="border-t border-border pt-5">{nextButton("Continue to finish",2)}</div>
      <button type="button" onClick={()=>goToStep(0)} disabled={navigationBusy} className="mx-auto flex min-h-11 items-center gap-2 text-xs text-[#6A5849]"><ArrowLeft className="size-4"/> Back to voices</button>
    </section>}
    {step===2 && <section aria-label="Finish" className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="keep-section-title">Bring it together.</h2>
        {refreshButton}
      </div>
      <p className="text-[13px] leading-6 text-muted-foreground">Keep combines everyone's recordings in the right order and balances their voices for your film.</p>
      <div className="rounded-[20px] border border-[#D8CCBF] bg-[#FFFDF9] p-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-[#6A5849]">Recording progress</p>
          <span className="text-xs font-medium text-[#6A5849]">{readyCount} of {people.length} voices ready</span>
        </div>
        <div role="progressbar" aria-label="Voices ready" aria-valuemin={0} aria-valuemax={people.length||1} aria-valuenow={readyCount} className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#EEE9E1]">
          <div className="h-full rounded-full bg-[#806B56] transition-all" style={{width:`${people.length?readyCount/people.length*100:0}%`}}/>
        </div>
        <ul className="mt-4 divide-y divide-[#E4DCD2]">
          {people.map(person=>{
            const status=statuses.find(item=>item.contributorId===person.id);
            const total=getSpeakerParts(project,person.id).length;
            const ready=status?.total===total&&status.completed===total;
            return <li key={person.id} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span className="min-w-0 break-words">{person.name}</span>
              <span className={`flex shrink-0 items-center gap-1.5 text-xs ${ready?"text-[#527052]":"text-[#786657]"}`}>{ready?<><CircleCheck className="size-4"/> Ready</>:`${status?.completed??0} of ${total} parts`}</span>
            </li>;
          })}
        </ul>
      </div>
      {!allReady&&<p className="text-[13px] leading-6 text-muted-foreground">You can work on your photos while everyone finishes recording.</p>}
      <div className="border-t border-border pt-5">
        <button type="button" disabled={combining} aria-busy={combining} onClick={allReady?()=>void onCombine():onContinue} className="keep-message-actions__primary w-full">
          <span>{combining?"Preparing all voices…":allReady?"Bring every voice together":"Continue with photos"}</span>
          <span className="keep-message-actions__arrow" aria-hidden="true">{allReady?<Check size={19} strokeWidth={1.6}/>:<ArrowRight size={19} strokeWidth={1.6}/>}</span>
        </button>
      </div>
      <button type="button" onClick={()=>goToStep(1)} disabled={navigationBusy} className="mx-auto flex min-h-11 items-center gap-2 text-xs text-[#6A5849]"><ArrowLeft className="size-4"/> Back to shared moments</button>
      {emailEnabled===false && <p className="flex items-start gap-2 rounded-xl border border-[#DECDB8] bg-[#FFFAF3] px-3 py-2 text-[11px] leading-5 text-[#766454]">
        <Mail className="mt-0.5 size-4 shrink-0"/> Automatic email alerts are not yet available. Check recording progress here anytime.
      </p>}
    </section>}
  </div>;
}
