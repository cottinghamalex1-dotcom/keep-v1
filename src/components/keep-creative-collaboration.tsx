import { useEffect, useState } from "react";
import { ArrowRight, Check, Link2, RefreshCw, Sparkles, Users } from "lucide-react";
import { KeepCreativeInterview, emptyStory } from "./keep-creative-interview";
import { fetchCollaborativeDraft, type InterviewContext } from "@/lib/keep-ai";
import { activeKeepSession, saveCloudDraft } from "@/lib/keep-cloud";
import { createRemoteInvite, listRemoteInvites, type RemoteInviteStatus } from "@/lib/keep-remote";
import type { CreativeStory, KeepProject } from "@/lib/keep-project";

export function KeepCreativeCollaboration({project,onChange,onComplete}:{project:KeepProject;onChange:(change:Partial<KeepProject>)=>void;onComplete:(change:Partial<KeepProject>)=>void}) {
  const people=project.contributors??[];
  const remote=project.voiceRecordingLocation==="remote";
  const [active,setActive]=useState<string|null>(null);
  const [statuses,setStatuses]=useState<RemoteInviteStatus[]>([]);
  const [links,setLinks]=useState<Record<string,string>>({});
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
  const invite=async(id:string)=>{
    setBusy(id);setError("");setNotice("");
    try{
      const session=await activeKeepSession();if(!session||!project.publicationId)throw new Error("Sign in to Keep to send a private invitation.");
      const person=people.find(p=>p.id===id)!;
      await saveCloudDraft({...project,stage:"collaboration",collaborativeCreative:true},session);
      const result=await createRemoteInvite({keepId:project.publicationId,contributorId:id,contributorName:person.name,creatorName:people[0]?.name??"",recipientName:project.recipientName,occasion:project.occasion,parts:[],creative:true,relationship:person.relationship??""});
      setLinks(l=>({...l,[id]:result.url}));await refresh();setNotice(`Private link ready for ${person.name}.`);
    }catch(e){setError(e instanceof Error?e.message:"Couldn't prepare this invitation.");}finally{setBusy("");}
  };
  const share=async(name:string,url:string,copy=false)=>{
    const message=`Hi ${name}! I'd love to create a Keep with you for ${project.recipientName}. This private link lets you share your own memories, photos and voice. No account needed: ${url}`;
    try{if(!copy&&navigator.share)await navigator.share({text:message});else if(copy){await navigator.clipboard.writeText(message);setNotice("Invitation copied.");}else window.location.href="sms:&body="+encodeURIComponent(message);}catch{setNotice("You can copy the private link below.");}
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
  if(selected)return <div className="mx-auto max-w-xl px-6 pb-12 pt-6">
    <button type="button" className="mb-5 text-sm text-muted-foreground underline" onClick={()=>setActive(null)}>Back to everyone</button>
    <KeepCreativeInterview key={selected.id} name={selected.name} context={context} story={selected.story??(people[0]?.id===selected.id&&project.interviewAnswers.length?{relationship:selected.relationship||project.relationship,answers:project.interviewAnswers.filter(a=>a.transcript?.trim()).map(a=>({question:a.question,transcript:a.transcript!})).slice(0,4),completed:false}:(people[0]?.id===selected.id&&project.writtenText.trim()?{...emptyStory(selected.relationship||project.relationship),written:project.writtenText}:emptyStory(selected.relationship||(people[0]?.id===selected.id?project.relationship:""))))} onSave={save} onDone={()=>setActive(null)}/>
  </div>;
  return <div className="mx-auto max-w-xl space-y-5 px-6 pb-12 pt-8 text-[#30271F]">
    <header><p className="eyebrow">CREATING TOGETHER</p><h1 className="mt-2 font-display text-[clamp(36px,9vw,48px)] leading-tight">Every story matters.</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">A Keep for {project.recipientName}. {remote?"Invite everyone to share their own memories from anywhere.":"Take turns sharing your own memories on this device."} Keep brings all your perspectives together.</p></header>
    <div className="rounded-2xl border border-[#DDD5CB] bg-[#FFFDF9] p-4">
      <div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">{ready} of {people.length} stories submitted</span>{remote&&<button className="flex items-center gap-1 text-xs" type="button" onClick={()=>void refresh()}><RefreshCw size={14}/> Refresh</button>}</div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#E7DED3]"><div className="h-full rounded-full bg-[#867158]" style={{width:`${people.length?ready/people.length*100:0}%`}}/></div>
    </div>
    {people.map((p,i)=>{const story=storyOf(p.id,i);const local=!remote||i===0;const url=links[p.id];const status=statuses.find(s=>s.contributorId===p.id);return <section key={p.id} className="space-y-3 rounded-2xl border border-[#DDD5CB] bg-[#FFFDF9] p-4">
      <div className="flex items-center gap-3"><div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#EEE5D9] font-display text-xl">{p.name.charAt(0).toUpperCase()}</div><div className="min-w-0 flex-1"><h2 className="font-display text-2xl">{p.name} {i===0&&<span className="font-sans text-xs text-muted-foreground">(You)</span>}</h2><p className="text-xs text-muted-foreground">{story?.relationship||p.relationship||"Contributor"}</p></div><span className="rounded-full bg-[#EEEAE3] px-2.5 py-1 text-[11px]">{story?.completed?"Submitted ✓":story?.answers.length?"In progress":status?"Invited":"Not started"}</span></div>
      {local?<button className="keep-message-actions__secondary w-full" type="button" disabled={!!busy} onClick={()=>setActive(p.id)}>{story?.completed?"Review my memories":story?.answers.length?"Continue interview":"Share my memories"} <ArrowRight size={18}/></button>:!story?.completed&&<><button type="button" className="keep-message-actions__secondary w-full" disabled={!!busy} onClick={()=>void invite(p.id)}><Link2 size={18}/>{busy===p.id?"Preparing…":status?"Create a new private link":"Invite "+p.name}</button>{url&&<><div className="grid grid-cols-2 gap-2"><button type="button" className="rounded-xl border border-[#D7C9B9] py-3 text-xs" onClick={()=>void share(p.name,url)}>Share invitation</button><button type="button" className="rounded-xl border border-[#D7C9B9] py-3 text-xs" onClick={()=>void share(p.name,url,true)}>Copy invitation</button></div><input aria-label={p.name+" private link"} className="w-full rounded-lg bg-[#F4EEE7] p-2 text-xs" readOnly value={url}/></>}</>}
      {story?.completed&&<details className="text-sm text-muted-foreground"><summary className="cursor-pointer">View submitted memories</summary><div className="mt-3 space-y-3">{story.answers.map((a,j)=><p key={j}><strong>{a.question}</strong><br/>{a.transcript}</p>)}{story.written&&<p>{story.written}</p>}</div></details>}
    </section>;})}
    {notice&&<p role="status" className="text-sm">{notice}</p>}
    {error&&<p role="alert" className="rounded-xl bg-[#FFF1ED] p-3 text-sm text-[#9A4339]">{error}</p>}
    <button className="keep-message-actions__primary w-full" type="button" disabled={ready!==people.length||people.length<2||!!busy} onClick={()=>void combine()}><span>{busy==="combine"?"Bringing your stories together…":"Bring our stories together"}</span><Sparkles size={19}/></button>
    <p className="flex items-center justify-center gap-2 text-center text-xs leading-5 text-muted-foreground">{ready===people.length?<Check size={15}/>:<Users size={15}/>} {ready===people.length?"Everyone’s story is ready.":"Once everyone has contributed, we’ll create your shared message."}</p>
  </div>;
}
