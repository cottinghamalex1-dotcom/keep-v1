import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, CircleCheck, Clipboard, Heart, Link2, Mail, MessageCircle, RefreshCw, Send, Users, X } from "lucide-react";
import { activeKeepSession, saveCloudDraft } from "@/lib/keep-cloud";
import { createRemoteInvite, listRemoteInvites, revokeRemoteInvite, type RemoteInviteStatus, type RemoteScriptPart } from "@/lib/keep-remote";
import type { KeepProject } from "@/lib/keep-project";

type Props = {
  project: KeepProject; onContinue: () => void; onCombine: () => Promise<void>;
  onBack: () => void; combining: boolean;
};
export const getSpeakerParts = (project: KeepProject, contributorId: string): RemoteScriptPart[] =>
  project.messageParagraphs.map((text,index)=>({
    index,text:text.trim(),
    speaker:project.paragraphSpeakers?.[index]||project.contributors?.[index%Math.max(1,project.contributors.length)]?.id||"",
  })).filter(part=>part.text && part.speaker===contributorId).map(({index,text})=>({index,text}));

export function KeepRemoteInviteManager({ project,onContinue,onCombine,onBack,combining }:Props) {
  const [statuses,setStatuses]=useState<RemoteInviteStatus[]>([]);
  const [links,setLinks]=useState<Record<string,string>>({});
  const [creatorName,setCreatorName]=useState(project.contributors?.[0]?.name||"");
  const [busyId,setBusyId]=useState("");
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState("");
  const keepId=project.publicationId||"";
  const people=useMemo(()=> (project.contributors??[]).filter(person=>getSpeakerParts(project,person.id).length>0),
    [project.contributors,project.messageParagraphs,project.paragraphSpeakers]);
  const refresh=useCallback(async ()=>{
    if(!keepId)return;
    setLoading(true);
    try {const result=await listRemoteInvites(keepId);setStatuses(result.invites);}
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
    `Hi ${name}! ${creatorName.trim()||"I"} is making a special Keep for ${project.recipientName||"someone special"} and would love your voice. Tap this private link to see exactly what to say, record on your phone, and send it back: ${url}`;
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
                <p className="mt-1 text-[11px] text-[#827568]">{parts.length} speaking {parts.length===1?"part":"parts"}</p>
              </div>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold ${finished?"bg-[#E7F1E5] text-[#437045]":"bg-[#F2E9DC] text-[#8B6B45]"}`}>
              {finished?"Complete":status?`${complete} of ${parts.length} saved`:"Not invited"}
            </span>
          </div>
          {!finished && <div className="mt-4">
            <button type="button" disabled={!!busyId} onClick={()=>void invite(person.id,person.name)}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#171512] px-3 text-[12px] font-semibold text-[#F8F0E6] disabled:opacity-50">
              <Link2 className="size-4" /> {busyId===person.id?"Preparing link…":status?"Generate a fresh private link":"Create private recording link"}
            </button>
            {url && <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={()=>void share(person.name,url)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#BEA994] text-[11px] font-medium"><MessageCircle className="size-4"/> Share by text</button>
              <button type="button" onClick={()=>void copy(person.name,url)} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#BEA994] text-[11px] font-medium"><Clipboard className="size-4"/> Copy invite</button>
            </div>}
          </div>}
          {finished && <div className="mt-3 flex items-center gap-2 text-[11px] text-[#527052]"><CircleCheck className="size-4"/> Recording safely received {status?.emailSent?"· Email sent":""}</div>}
          {status&&!finished&&new Date(status.expiresAt).getTime()<Date.now() && <p className="mt-2 text-[11px] text-[#925E4E]">That invitation has expired. Generate a new link.</p>}
          {status&&<button type="button" className="mt-3 inline-flex min-h-8 items-center gap-1.5 text-[10px] text-[#8F705B]" onClick={async()=>{
            if(!window.confirm(`Revoke ${person.name}'s invitation? Their submitted audio will no longer be accessible through the link.`))return;
            try{await revokeRemoteInvite(keepId,status.id);setLinks(old=>{const next={...old};delete next[person.id];return next;});await refresh();}
            catch(error){setMessage(error instanceof Error?error.message:"Couldn't revoke invitation.");}
          }}><X className="size-3"/> Revoke invitation</button>}
        </section>;
      })}
    </div>
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
      <p className="mt-3 text-center text-[11px] leading-5 text-[#7D6F61]">
        Invitations expire after 30 days. You can leave and come back to this Keep whenever you like.
      </p>
    </div>
  </main>;
}
