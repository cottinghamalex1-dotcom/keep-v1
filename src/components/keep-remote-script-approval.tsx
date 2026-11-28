import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clipboard, RefreshCw, Share2, ShieldCheck } from "lucide-react";
import { activeKeepSession, saveCloudDraft } from "@/lib/keep-cloud";
import { listRemoteInvites, shareScriptForReview, type RemoteInviteStatus, type RemoteScriptPart } from "@/lib/keep-remote";
import type { KeepProject } from "@/lib/keep-project";

export function getSpeakerParts(project:KeepProject, contributorId:string):RemoteScriptPart[] {
  return project.messageParagraphs.map((text,index)=>({
    index,text:text.trim(),
    speaker:project.paragraphSpeakers?.[index]||project.contributors?.[index%Math.max(1,project.contributors.length)]?.id||"",
  })).filter(part=>part.text&&part.speaker===contributorId).map(({index,text})=>({index,text}));
}
const sameParts=(a:RemoteScriptPart[]|null|undefined,b:RemoteScriptPart[])=>!!a&&a.length===b.length&&a.every((part,i)=>part.index===b[i]?.index&&part.text.trim()===b[i]?.text.trim());
export function matchesReview(project:KeepProject, status:RemoteInviteStatus|undefined,id:string){
  const parts=getSpeakerParts(project,id);
  return !!status?.reviewRequired&&parts.length>0&&(sameParts(status.creativeBaseParts,parts)||sameParts(status.parts,parts));
}
export function KeepRemoteScriptApproval({project,onBack,onContinue}:{project:KeepProject;onBack:()=>void;onContinue:(paragraphs:string[])=>void}){
  const people=project.contributors??[];
  const [statuses,setStatuses]=useState<RemoteInviteStatus[]>([]);
  const [loaded,setLoaded]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const keepId=project.publicationId??"";
  const refresh=useCallback(async()=>{
    if(!keepId)return;
    try{const {invites}=await listRemoteInvites(keepId);setStatuses(invites);setLoaded(true);setError("");}
    catch(e){setError(e instanceof Error?e.message:"Couldn't check approvals. Please refresh.");setLoaded(false);}
  },[keepId]);
  useEffect(()=>{void refresh();const interval=window.setInterval(()=>void refresh(),10000);const focus=()=>void refresh();window.addEventListener("focus",focus);return()=>{window.clearInterval(interval);window.removeEventListener("focus",focus);};},[refresh]);
  const statusFor=(id:string)=>statuses.find(s=>s.contributorId===id);
  const shared=loaded&&people.length>1&&people.every(person=>matchesReview(project,statusFor(person.id),person.id));
  const approved=people.filter(person=>matchesReview(project,statusFor(person.id),person.id)&&!!statusFor(person.id)?.approvedAt).length;
  const ready=shared&&approved===people.length;
  const legacyStarted=loaded&&!statuses.some(s=>s.reviewRequired)&&statuses.some(s=>s.completed>0);
  const publish=async()=>{
    if(busy)return;
    setBusy(true);setError("");setNotice("");
    try{
      const session=await activeKeepSession();
      if(!session||!keepId)throw new Error("Sign in to Keep before sharing your words.");
      await saveCloudDraft(project,session);
      await shareScriptForReview(keepId,project.recipientName,project.occasion);
      await refresh();
      setNotice("Your words are approved. Everyone can review their own words using their original private invitation.");
    }catch(e){setError(e instanceof Error?e.message:"Couldn't share the script. Try again.");}
    finally{setBusy(false);}
  };
  const remind=async(person:{id:string;name:string},mode:"share"|"copy")=>{
    const url=statusFor(person.id)?.url;
    if(!url)return;
    const message=`Hi ${person.name}! Our Keep for ${project.recipientName} is ready for your review. Please read, edit if you'd like, and approve your own words using this same private link. We'll record when everyone has approved.\n\n${url}`;
    try{
      if(mode==="share"&&navigator.share)await navigator.share({text:message});
      else{await navigator.clipboard.writeText(message);setNotice("Review invitation copied.");}
    }catch(e){if(!(e instanceof Error&&e.name==="AbortError"))setError("Couldn't share the invitation. Please try again.");}
  };
  const continueToVoices=async()=>{
    if(busy||!ready)return;
    setBusy(true);setError("");
    try{
      const {invites}=await listRemoteInvites(keepId);
      if(!people.every(p=>{const status=invites.find(s=>s.contributorId===p.id);return matchesReview(project,status,p.id)&&!!status?.approvedAt;})){setStatuses(invites);throw new Error("Everyone must approve the latest version before recording.");}
      const paragraphs=[...project.messageParagraphs];
      for(const p of people)for(const part of invites.find(s=>s.contributorId===p.id)?.parts??[])paragraphs[part.index]=part.text;
      onContinue(paragraphs);
    }catch(e){setError(e instanceof Error?e.message:"Couldn't verify approvals.");}finally{setBusy(false);}
  };
  return <main className="mx-auto max-w-xl space-y-5 px-6 pb-12 pt-6 text-[#30271F]">
    <button type="button" disabled={busy} onClick={onBack} className="inline-flex min-h-10 items-center gap-2 text-xs text-[#6A5849]"><ArrowLeft size={16}/> Back to your message</button>
    <header><p className="eyebrow">CREATING TOGETHER · REVIEW</p><h1 className="mt-2 font-display text-[clamp(38px,10vw,50px)] leading-[1.08]">Every word matters.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Everyone gets to make their own words feel right. Approve yours, then let each contributor review and edit their own section privately.</p></header>
    {legacyStarted?<section className="rounded-2xl border border-[#D8CCBF] bg-[#FFFDF9] p-5"><p className="text-sm leading-6">This Keep already has recordings. Continue with the original recording flow to protect your saved voices.</p><button type="button" className="mt-4 keep-message-actions__primary w-full" onClick={()=>onContinue(project.messageParagraphs)}>Continue to voices <ArrowRight size={18}/></button></section>:<>
    <section className="rounded-2xl border border-[#D8CCBF] bg-[#FFFDF9] p-4">
      <div className="flex items-center justify-between gap-2"><strong className="text-sm font-medium">{loaded?`${approved} of ${people.length} approved`:"Checking approvals…"}</strong><button type="button" onClick={()=>void refresh()} className="flex items-center gap-1 text-xs text-[#6A5849]"><RefreshCw size={14}/> Refresh</button></div>
      <div role="progressbar" aria-label="Transcript approvals" aria-valuemin={0} aria-valuemax={people.length} aria-valuenow={approved} className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E7DED3]"><div className="h-full rounded-full bg-[#867158]" style={{width:`${people.length?approved/people.length*100:0}%`}}/></div>
    </section>
    {people.map((person,index)=>{
      const status=statusFor(person.id);const current=matchesReview(project,status,person.id);const accepted=current&&!!status?.approvedAt;
      const parts=current&&status?.parts?status.parts:getSpeakerParts(project,person.id);
      return <section key={person.id} className="space-y-3 rounded-2xl border border-[#D8CCBF] bg-[#FFFDF9] p-4">
        <div className="flex items-center gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-full border border-[#D7C9B9] bg-[#EEE5D9] font-display text-xl">{person.name.charAt(0).toUpperCase()}</div><div className="min-w-0 flex-1"><h2 className="font-display text-2xl">{person.name}{index===0&&<span className="font-sans text-xs text-muted-foreground"> (You)</span>}</h2><p className="text-xs text-muted-foreground">{parts.length} speaking {parts.length===1?"part":"parts"}</p></div><span className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${accepted?"bg-[#E7F1E5] text-[#437045]":"bg-[#EEEAE3] text-[#776454]"}`}>{accepted?<><Check size={12}/> Approved</>:current?"Awaiting approval":"Not shared"}</span></div>
        <details open={index===0&&!accepted?true:undefined} className="rounded-xl border border-[#E6DCD0] p-3 text-sm leading-6"><summary className="cursor-pointer text-xs font-medium text-[#6A5849]">Read {index===0?"my":person.name+"’s"} words</summary>{parts.map(part=><p className="mt-3 whitespace-pre-wrap" key={part.index}>{part.text}</p>)}</details>
        {index>0&&current&&!accepted&&status?.url&&<div className="grid grid-cols-2 gap-2"><button type="button" className="keep-invite-action" onClick={()=>void remind(person,"share")}><Share2 size={16}/> Share review</button><button type="button" className="keep-invite-action keep-invite-action--copy" onClick={()=>void remind(person,"copy")}><Clipboard size={16}/> Copy invitation</button></div>}
      </section>;
    })}
    {error&&<p role="alert" className="rounded-xl bg-[#FFF1ED] p-3 text-sm text-[#9A4339]">{error}</p>}
    {notice&&<p role="status" className="rounded-xl bg-[#F1EBE2] p-3 text-xs leading-5">{notice}</p>}
    {!shared?<button type="button" className="keep-message-actions__primary w-full" disabled={!loaded||busy||people.some(p=>!getSpeakerParts(project,p.id).length)} onClick={()=>void publish()}><span>{busy?"Sharing your words…":"Approve my words & share for review"}</span><ArrowRight size={19}/></button>:<button type="button" className="keep-message-actions__primary w-full" disabled={!ready||busy} onClick={()=>void continueToVoices()}><span>{ready?"Continue to recording":"Waiting for everyone to approve"}</span>{ready?<ArrowRight size={19}/>:<ShieldCheck size={18}/>}</button>}
    <p className="flex items-start justify-center gap-2 text-center text-xs leading-5 text-muted-foreground"><ShieldCheck size={15} className="mt-0.5 shrink-0"/> {ready?"Everyone's words are approved. Each voice will be recorded privately.":"Contributors use their same private invitation. Recording unlocks once everyone's latest words are approved."}</p>
    </>}
  </main>;
}
