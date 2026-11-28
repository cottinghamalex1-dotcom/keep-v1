import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { ArrowRight, Check, RefreshCw, ShieldCheck } from "lucide-react";
import { KeepContributorConfirmation } from "./keep-contributor-confirmation";
import { KeepCreativeInterview } from "./keep-creative-interview";
import { KeepRemoteMediaContributor } from "./keep-remote-media-contributor";
import { saveRemoteStory, reviewRemoteParts, type RemoteInviteDetails } from "@/lib/keep-remote";

export function KeepRemoteCreativeGuest({token,invite,onUpdate,onRefresh}:{token:string;invite:RemoteInviteDetails;onUpdate:Dispatch<SetStateAction<RemoteInviteDetails|null>>;onRefresh:()=>void}) {
  const story=invite.creativeStory!;
  const [mediaBusy,setMediaBusy]=useState(false);
  const [confirmationOpen,setConfirmationOpen]=useState(false);
  useEffect(()=>{if(!story.completed||mediaBusy||confirmationOpen)return;const timer=window.setInterval(onRefresh,20000);return()=>window.clearInterval(timer);},[story.completed,mediaBusy,confirmationOpen,onRefresh]);
  return <main className="mx-auto min-h-dvh max-w-xl space-y-6 bg-[#F7F5F2] px-6 pb-12 pt-8 text-[#30271F]">
    <div className="flex items-center justify-between"><span className="font-display text-4xl">Keep</span><span className="flex items-center gap-1 text-xs text-muted-foreground"><ShieldCheck size={14}/> Private invitation</span></div>
    <header><p className="eyebrow">A KEEP FOR {invite.recipientName.toUpperCase()}</p><h1 className="mt-2 font-display text-4xl leading-tight">Something special for {invite.recipientName}.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">{invite.creatorName} invited you to create a Keep together{invite.occasion?" for "+invite.occasion.toLowerCase():""}. Share your own story, and we’ll make it part of one meaningful gift.</p></header>
    {!story.completed?<KeepCreativeInterview name={invite.contributorName} context={{recipientName:invite.recipientName,relationship:story.relationship,occasion:invite.occasion??"",intent:"",answers:[]}} story={story} onSave={async(next)=>{const result=await saveRemoteStory(token,next);if(result.story.completed)setConfirmationOpen(true);onUpdate(old=>old?{...old,creativeStory:result.story}:old);}} onDone={()=>{}}/>:<>
      <section className="rounded-2xl border border-[#D7C9B9] bg-[#FFFDF9] p-5"><Check className="mb-3 text-[#527052]" size={25}/><h2 className="font-display text-3xl">Your memories are shared.</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">You’re done for now. {invite.creatorName} will bring everyone’s stories together. You can close this page and return to this same private link when your words are ready to review.</p><button type="button" className="mt-4 keep-message-actions__secondary w-full" disabled={mediaBusy} onClick={onRefresh}><RefreshCw size={16}/> Check if my words are ready</button></section>
      <h2 className="font-display text-3xl">Share your favorite moments.</h2><p className="text-sm leading-6 text-muted-foreground">Optional — add photos or videos now, or return to this link later.</p><KeepRemoteMediaContributor token={token} mediaCount={invite.mediaCount??0} contributorCount={invite.contributorCount??2} totalWordCount={invite.totalWordCount??0} onBusyChange={setMediaBusy} onUploaded={count=>onUpdate(old=>old?{...old,mediaCount:count}:old)}/>
      <button type="button" disabled={mediaBusy} onClick={()=>setConfirmationOpen(true)} className="keep-contribution-action keep-contribution-action--finish"><span>Finish for now</span><span className="keep-contribution-action__icon" aria-hidden="true"><Check size={17}/></span></button>
    </>}
    <KeepContributorConfirmation open={confirmationOpen} onDone={()=>setConfirmationOpen(false)} stage="memories" contributorName={invite.contributorName} creatorName={invite.creatorName} recipientName={invite.recipientName}/>
    <p className="text-center text-xs leading-5 text-muted-foreground">No account or download needed. Your words and moments are shared privately with the creator.</p>
  </main>;
}
export function KeepRemoteScriptReview({token,invite,onContinue}:{token:string;invite:RemoteInviteDetails;onContinue:(details:RemoteInviteDetails)=>void}) {
  const [parts,setParts]=useState(invite.parts.map(p=>({...p})));
  const [busy,setBusy]=useState(false);const [error,setError]=useState("");
  return <main className="mx-auto min-h-dvh max-w-xl space-y-5 bg-[#F7F5F2] px-6 pb-12 pt-8 text-[#30271F]">
    <span className="font-display text-4xl">Keep</span><p className="eyebrow">YOUR OWN WORDS</p><h1 className="font-display text-4xl">Make these words yours.</h1><p className="text-sm leading-6 text-muted-foreground">Keep brought everyone’s stories together. These are your own speaking parts. Review them and change anything that doesn’t sound like you before recording.</p>
    {invite.reviewRequired&&<p className="rounded-xl border border-[#D7C9B9] bg-[#F1EAE1] p-4 text-sm leading-6">Only your own words are shown here. Your approval is sent privately to {invite.creatorName}. Recording opens once everyone has approved.</p>}
    {parts.map((part,i)=><label key={part.index} className="block text-xs font-semibold text-[#7D6A57]">YOUR PART {i+1}<textarea aria-label={`Your part ${i+1}`} className="mt-2 w-full rounded-xl border border-[#D7C9B9] bg-[#FFFDF9] p-4 text-base font-normal leading-7 text-[#30271F]" rows={5} maxLength={6500} value={part.text} disabled={busy} onChange={e=>setParts(old=>old.map((p,j)=>j===i?{...p,text:e.target.value}:p))}/></label>)}
    {error&&<p role="alert" className="text-sm text-red-800">{error}</p>}
    <button type="button" className="keep-message-actions__primary w-full" disabled={busy||parts.some(p=>!p.text.trim())} onClick={async()=>{setBusy(true);setError("");try{if(invite.reviewRequired)await reviewRemoteParts(token,parts.map(({index,text})=>({index,text})),invite.parts.map(({index,text})=>({index,text})));else if(parts.some((p,i)=>p.text!==invite.parts[i]?.text))await reviewRemoteParts(token,parts.map(({index,text})=>({index,text})));onContinue({...invite,...(invite.reviewRequired?{approvedAt:new Date().toISOString()}:{}),parts:parts.map(p=>({...p,text:p.text.trim()}))});}catch(e){setError(e instanceof Error?e.message:"Couldn't save your words.");}finally{setBusy(false);}}}><span>{busy?"Saving your words…":invite.reviewRequired?"Approve my words":"Ready to record my words"}</span><ArrowRight size={19}/></button>
  </main>;
}


export function KeepRemoteApprovalWaiting({invite,onRefresh}:{invite:RemoteInviteDetails;onRefresh:()=>void}){
  return <main className="mx-auto flex min-h-dvh max-w-xl flex-col bg-[#F7F5F2] px-6 pb-12 pt-8 text-[#30271F]">
    <div className="flex items-center justify-between"><span className="font-display text-4xl">Keep</span><span className="flex items-center gap-1 text-xs text-muted-foreground"><ShieldCheck size={14}/> Private invitation</span></div>
    <section className="my-auto py-12 text-center">
      <div className="mx-auto mb-6 grid size-16 place-items-center rounded-full border border-[#D7C9B9] bg-[#EEE5D9]"><Check size={28} className="text-[#527052]"/></div>
      <p className="eyebrow">WORDS APPROVED</p>
      <h1 className="mt-4 font-display text-[clamp(38px,10vw,52px)] leading-tight">Your words are ready.</h1>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-7 text-muted-foreground">Thank you, {invite.contributorName}. Your approved words have been sent back to {invite.creatorName}. Once everyone approves, your recording will be available right here.</p>
      <p className="mx-auto mt-4 max-w-sm text-xs leading-6 text-[#786959]">You can close this page and return to your same private link anytime. No need to submit your words again.</p>
      <button type="button" className="mt-7 keep-message-actions__secondary w-full" onClick={onRefresh}><RefreshCw size={16}/> Check recording status</button>
    </section>
  </main>;
}
