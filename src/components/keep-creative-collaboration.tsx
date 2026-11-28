import { useEffect, useState, type ReactNode } from "react";
import { ArrowRight, Check, Clipboard, RefreshCw, Share2, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./ui/dialog";
import { KeepCreativeInterview, emptyStory } from "./keep-creative-interview";
import { fetchCollaborativeDraft, type InterviewContext } from "@/lib/keep-ai";
import { activeKeepSession, saveCloudDraft } from "@/lib/keep-cloud";
import { createRemoteInvite, listRemoteInvites, type RemoteInviteStatus } from "@/lib/keep-remote";
import type { CreativeStory, KeepProject } from "@/lib/keep-project";

export function KeepCreativeCollaboration({project,onChange,onComplete,renderHeader}:{project:KeepProject;onChange:(change:Partial<KeepProject>)=>void;onComplete:(change:Partial<KeepProject>)=>void;renderHeader?:(onBack?:()=>void)=>ReactNode}) {
  const people=project.contributors??[];
  const remote=project.voiceRecordingLocation==="remote";
  const [active,setActive]=useState<string|null>(null);
  const [statuses,setStatuses]=useState<RemoteInviteStatus[]>([]);
  const [invitation,setInvitation]=useState<{id:string;name:string;mode:"share"|"copy";message:string;url:string}|null>(null);
  const [messageEdits,setMessageEdits]=useState<Record<string,string>>({});
  const [inviteError,setInviteError]=useState("");
  const [sharing,setSharing]=useState(false);
  const [busy,setBusy]=useState("");
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const context:InterviewContext={recipientName:project.recipientName,relationship:project.relationship,occasion:project.occasion,occasionDetail:project.occasionDetail??"",intent:project.intent,recipientFeelings:project.recipientFeelings??[],answers:[]};
  const refresh=async()=>{if(!remote||!project.publicationId)return;try{setStatuses((await listRemoteInvites(project.publicationId)).invites);setError("");}catch(e){setError(e instanceof Error?e.message:"Unable to refresh invitations.");}};
  useEffect(()=>{if(!remote)return;void refresh();const timer=window.setInterval(()=>void refresh(),15000);const focus=()=>void refresh();window.addEventListener("focus",focus);return()=>{window.clearInterval(timer);window.removeEventListener("focus",focus);};},[remote,project.publicationId]);
  const storyOf=(id:string,index:number):CreativeStory|undefined=>remote&&index>0?statuses.find(s=>s.contributorId===id)?.creativeStory??undefined:people[index]?.story;
  const ready=people.filter((p,i)=>storyOf(p.id,i)?.completed).length;
  const selected=people.find(p=>p.id===active);
  const save=async(story:CreativeStory)=>{
    const contributors=people.map(p=>p.id===active?{...p,relationship:story.relationship,story}:p);
    onChange({contributors,collaborativeCreative:true});
  };
  const invitationText=(name:string)=>`Hi ${name}! I'd love to create a Keep with you for ${project.recipientName}. This private link lets you share your own memories, photos and voice. No account needed:`;
  const prepareInvitation=async(id:string,name:string,mode:"share"|"copy")=>{
    setInvitation({id,name,mode,message:messageEdits[id]??invitationText(name),url:""});
    setBusy(id);setError("");setNotice("");setInviteError("");
    try{
      const session=await activeKeepSession();if(!session||!project.publicationId)throw new Error("Sign in to Keep to send a private invitation.");
      // A brand-new draft may not exist in the cloud yet. In that case
      // save it below before requesting its first invitation.
      const latest=await listRemoteInvites(project.publicationId).catch(()=>null);
      if(latest)setStatuses(latest.invites);
      const existing=latest?.invites.find(item=>item.contributorId===id);
      let url=existing?.url;
      if(!url){
        const person=people.find(p=>p.id===id)!;
        await saveCloudDraft({...project,stage:"collaboration",collaborativeCreative:true},session);
        const result=await createRemoteInvite({keepId:project.publicationId,contributorId:id,contributorName:person.name,creatorName:people[0]?.name??"",recipientName:project.recipientName,occasion:project.occasion,parts:[],creative:true,relationship:person.relationship??""});
        url=result.url;
        await refresh();
      }
      setInvitation(current=>current?.id===id?{...current,url}:current);
    }catch(e){setInviteError(e instanceof Error?e.message:"Couldn't prepare this invitation. Please try again.");}finally{setBusy("");}
  };
  const sendInvitation=async()=>{
    if(!invitation?.url||!invitation.message.trim()||sharing)return;
    const message=invitation.message.trim()+"\n\n"+invitation.url;
    setSharing(true);setInviteError("");
    try{
      if(invitation.mode==="share"&&navigator.share){
        await navigator.share({text:message});
      }else{
        await navigator.clipboard.writeText(message);
        setNotice(invitation.mode==="copy"?"Invitation copied.":"Invitation copied. Paste it into your preferred messaging app.");
      }
      setInvitation(null);
    }catch(e){
      if(e instanceof Error&&e.name==="AbortError")return;
      setInviteError("Couldn't "+(invitation.mode==="copy"?"copy":"share")+" the invitation. Please try again.");
    }finally{setSharing(false);}
  };
  const combine=async()=>{
    if((project.finalVoiceRecording||project.voiceParts?.length)&&!window.confirm("Creating a new shared message means recording the speaking parts again. Continue?"))return;
    setBusy("combine");setError("");
    try{
      const latest=remote&&project.publicationId?(await listRemoteInvites(project.publicationId)).invites:statuses;
      const contributors=people.map((p,i)=>({...p,story:remote&&i>0?latest.find(s=>s.contributorId===p.id)?.creativeStory??undefined:p.story}));
      if(contributors.some(p=>!p.story?.completed))throw new Error("Wait until everyone has submitted their memories.");
      const parts=await fetchCollaborativeDraft(context,contributors.map(p=>({id:p.id,name:p.name,story:p.story!})));
      onComplete({contributors,collaborativeCreative:true,messageParagraphs:parts.map(p=>p.text),paragraphSpeakers:parts.map(p=>p.contributorId),messageSource:"ai",voiceParts:[],groupVoiceSignature:"",finalVoiceRecording:null});
    }catch(e){setError(e instanceof Error?e.message:"Couldn't bring your stories together. Try again.");}finally{setBusy("");}
  };
  if(selected)return <>{renderHeader?.(()=>setActive(null))}<div className="mx-auto max-w-xl px-6 pb-12 pt-8">
    <KeepCreativeInterview key={selected.id} name={selected.name} context={context} story={selected.story??(people[0]?.id===selected.id&&project.interviewAnswers.length?{relationship:selected.relationship||project.relationship,answers:project.interviewAnswers.filter(a=>a.transcript?.trim()).map(a=>({question:a.question,transcript:a.transcript!})).slice(0,4),completed:false}:(people[0]?.id===selected.id&&project.writtenText.trim()?{...emptyStory(selected.relationship||project.relationship),written:project.writtenText}:emptyStory(selected.relationship||(people[0]?.id===selected.id?project.relationship:""))))} onSave={save} onDone={()=>setActive(null)}/>
  </div></>;
  return <>{renderHeader?.()}<div className="mx-auto max-w-xl space-y-5 px-6 pb-12 pt-8 text-[#30271F]">
    <header><p className="eyebrow">CREATING TOGETHER</p><h1 className="mt-2 font-display text-[clamp(36px,9vw,48px)] leading-tight">Every story matters.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">{remote?"Invite everyone to share their own memories from anywhere.":"Take turns sharing your own memories on this device."} Keep brings all your perspectives together.</p></header>
    <div className="rounded-2xl border border-[#DDD5CB] bg-[#FFFDF9] p-4">
      <div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">{ready} of {people.length} stories submitted</span>{remote&&<button className="flex items-center gap-1 text-xs" type="button" onClick={()=>void refresh()}><RefreshCw size={14}/> Refresh</button>}</div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E7DED3]"><div className="h-full rounded-full bg-[#867158]" style={{width:`${people.length?ready/people.length*100:0}%`}}/></div>
    </div>
    {people.map((p,i)=>{const story=storyOf(p.id,i);const local=!remote||i===0;const status=statuses.find(s=>s.contributorId===p.id);return <section key={p.id} className="space-y-3 rounded-2xl border border-[#DDD5CB] bg-[#FFFDF9] p-4">
      <div className="flex items-center gap-3"><div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#EEE5D9] font-display text-xl">{p.name.charAt(0).toUpperCase()}</div><div className="min-w-0 flex-1"><h2 className="font-display text-2xl">{p.name} {i===0&&<span className="font-sans text-xs text-muted-foreground">(You)</span>}</h2><p className="text-xs text-muted-foreground">{story?.relationship||p.relationship||"Contributor"}</p></div><span className="rounded-full bg-[#EEEAE3] px-2.5 py-1 text-[11px]">{story?.completed?"Submitted ✓":story?.answers.length?"In progress":status?"Invited":"Not started"}</span></div>
      {local?<button className="keep-message-actions__primary w-full" type="button" disabled={!!busy} onClick={()=>setActive(p.id)}><span>{story?.completed?"Review my memories":story?.answers.length?"Continue interview":"Start"}</span><span className="keep-message-actions__arrow" aria-hidden="true"><ArrowRight size={18}/></span></button>:!story?.completed&&
        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="keep-invite-action" disabled={!!busy} onClick={()=>void prepareInvitation(p.id,p.name,"share")}><Share2 size={16} aria-hidden="true"/>Share invitation</button>
          <button type="button" className="keep-invite-action keep-invite-action--copy" disabled={!!busy} onClick={()=>void prepareInvitation(p.id,p.name,"copy")}><Clipboard size={16} aria-hidden="true"/>Copy invitation</button>
        </div>}
      {story?.completed&&<details className="text-sm text-muted-foreground"><summary className="cursor-pointer">View submitted memories</summary><div className="mt-3 space-y-3">{story.answers.map((a,j)=><p key={j}><strong>{a.question}</strong><br/>{a.transcript}</p>)}{story.written&&<p>{story.written}</p>}</div></details>}
    </section>;})}
    <Dialog open={!!invitation} onOpenChange={open=>{if(!open&&!sharing)setInvitation(null);}}>
      <DialogContent className="max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-[24px] border-[#DDD5CB] bg-[#FFFDF9] p-6 text-[#30271F]">
        <div className="space-y-2 pr-5">
          <p className="eyebrow">A PERSONAL INVITATION</p>
          <DialogTitle className="font-display text-[30px] font-normal leading-tight">Invite {invitation?.name}.</DialogTitle>
          <DialogDescription className="text-sm leading-6">Make this message your own before you send it.</DialogDescription>
        </div>
        <label className="space-y-2 text-xs font-medium text-[#6A5849]">
          Your invitation message
          <textarea className="keep-premium-field block min-h-40 w-full resize-y rounded-xl p-3 text-[16px] leading-6 text-[#30271F]" value={invitation?.message??""} disabled={sharing} onChange={event=>{
            const message=event.target.value;
            setInvitation(current=>current?{...current,message}:current);
            if(invitation)setMessageEdits(current=>({...current,[invitation.id]:message}));
          }}/>
        </label>
        <div className="flex items-start gap-2 rounded-xl bg-[#F3EEE6] p-3 text-xs leading-5 text-[#6A5849]">
          <ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true"/> {busy?"Preparing their private invitation…":invitation?.url?"Their private invitation link is automatically included.":"A private invitation link will be included when ready."}
        </div>
        {inviteError&&<p role="alert" className="text-sm text-[#9A4339]">{inviteError}</p>}
        <button type="button" className="keep-message-actions__primary w-full" disabled={!!busy||sharing||!invitation?.url||!invitation.message.trim()} onClick={()=>void sendInvitation()}>
          <span>{busy?"Preparing invitation…":sharing?"One moment…":invitation?.mode==="copy"?"Copy invitation":"Share invitation"}</span>
          <span className="keep-message-actions__arrow" aria-hidden="true">{invitation?.mode==="copy"?<Clipboard size={17}/>:<Share2 size={17}/>}</span>
        </button>
      </DialogContent>
    </Dialog>
    {notice&&<p role="status" className="text-sm">{notice}</p>}
    {error&&<p role="alert" className="rounded-xl bg-[#FFF1ED] p-3 text-sm text-[#9A4339]">{error}</p>}
    <button className="keep-message-actions__primary w-full" type="button" disabled={ready!==people.length||people.length<2||!!busy} onClick={()=>void combine()}><span>{busy==="combine"?"Bringing your stories together…":"Bring our stories together"}</span><Sparkles size={19}/></button>
    <p className="flex items-center justify-center gap-2 text-center text-xs leading-5 text-muted-foreground">{ready===people.length?<Check size={15}/>:<Users size={15}/>} {ready===people.length?"Everyone’s story is ready.":"Once everyone has contributed, we’ll create your shared message."}</p>
  </div></>;
}
