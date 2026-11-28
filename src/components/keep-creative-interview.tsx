import { useState, type ReactNode } from "react";
import { ArrowRight, Mic, Square, Sparkles } from "lucide-react";
import { fetchCreativeQuestion, transcribeAudio, type InterviewContext } from "@/lib/keep-ai";
import type { CreativeStory } from "@/lib/keep-project";
import { useRecorder } from "@/hooks/use-recorder";

export const emptyStory=(relationship=""):CreativeStory=>({relationship,answers:[],completed:false});
const primary="keep-message-actions__primary w-full";
const field="keep-creative-interview__field keep-premium-field";
const secondary="keep-invite-action keep-invite-action--copy w-full";
const actionIcon=(icon:ReactNode)=><span className="keep-message-actions__arrow" aria-hidden="true">{icon}</span>;

type InterviewPhase = "saving" | "preparing" | "microphone" | "transcribing";

const phaseLabels: Record<InterviewPhase, string> = {
  saving: "Saving your words…",
  preparing: "Preparing your next question…",
  microphone: "Getting your microphone ready…",
  transcribing: "Turning your voice into words…",
};

function InterviewTransition({ phase, answerSaved = false }: { phase: InterviewPhase; answerSaved?: boolean }) {
  return (
    <div className="keep-creative-interview__transition" role="status" aria-live="polite" aria-atomic="true">
      <span className="keep-creative-interview__loader" aria-hidden="true"><Sparkles size={18} strokeWidth={1.4}/></span>
      <p className="keep-creative-interview__transition-title">{phaseLabels[phase]}</p>
      {phase === "preparing" && answerSaved && <p className="keep-creative-interview__transition-note">Your answer is saved.</p>}
    </div>
  );
}

export function KeepCreativeInterview({name,context,story,onSave,onDone}:{name:string;context:InterviewContext;story:CreativeStory;onSave:(story:CreativeStory)=>Promise<void>;onDone:()=>void}) {
  const [mode,setMode]=useState<"choice"|"guided"|"written">(story.question||story.answers.length?"guided":story.written?"written":"choice");
  const [draft,setDraft]=useState(story);
  const [answer,setAnswer]=useState("");
  const [phase,setPhase]=useState<InterviewPhase|null>(null);
  const busy=phase!==null;
  const [error,setError]=useState("");
  const recorder=useRecorder();
  const save=async(next:CreativeStory)=>{await onSave(next);setDraft(next);};
  const run=async(initialPhase:InterviewPhase,fn:()=>Promise<void>)=>{setPhase(initialPhase);setError("");try{await fn();}catch(e){setError(e instanceof Error?e.message:"Something went wrong. Please try again.");}finally{setPhase(null);}};
  const question=async(answers:CreativeStory["answers"])=>fetchCreativeQuestion({...context,relationship:draft.relationship,contributors:[],answers},name);
  const advance=()=>void run("saving",async()=>{
    const answers=[...draft.answers,{question:draft.question!,transcript:answer.trim()}];
    if(answers.length>=5){await save({...draft,answers,question:undefined,completed:true});onDone();return;}
    // Persist each answer before requesting a follow-up. A failed AI call never loses it.
    const saved={...draft,answers,question:undefined,completed:false};
    await save(saved);setAnswer("");
    setPhase("preparing");
    await save({...saved,question:await question(answers)});
  });
  const start=()=>void run("preparing",async()=>{
    setMode("guided");
    await save({...draft,completed:false,question:draft.question||await question(draft.answers)});
  });
  if(draft.completed)return <section className="keep-creative-interview"><h2 className="keep-editorial-title">{name}’s memories</h2>{draft.answers.map((a,i)=><label key={i} className="block text-sm font-medium">{a.question}<textarea className={field} rows={4} disabled={busy} value={a.transcript} onChange={e=>setDraft({...draft,answers:draft.answers.map((x,j)=>j===i?{...x,transcript:e.target.value}:x)})}/></label>)}{draft.written!==undefined&&<textarea aria-label="Your own words" className={field} rows={6} disabled={busy} value={draft.written} onChange={e=>setDraft({...draft,written:e.target.value})}/>}{phase?<InterviewTransition phase={phase}/>:<button type="button" className={primary} disabled={busy||(!draft.answers.some(a=>a.transcript.trim())&&!draft.written?.trim())} onClick={()=>void run("saving",async()=>{await save(draft);onDone();})}><span>Save my memories</span>{actionIcon(<ArrowRight size={18}/>)}</button>}{error&&<p role="alert">{error}</p>}</section>;
  return <section className="keep-creative-interview">
    <header><h2 className="keep-editorial-title">{name}, let’s find your words.</h2><p className="keep-page-description mt-3">Think about your own relationship with {context.recipientName}. Specific, everyday memories are what make this special.</p></header>
    <label className="keep-creative-interview__relationship">How are you related to {context.recipientName}?
      <input className={field} value={draft.relationship} maxLength={100} placeholder="e.g. daughter, grandson, friend" disabled={busy} onChange={e=>setDraft({...draft,relationship:e.target.value})}/>
    </label>
    {mode==="choice"&&<div className="keep-creative-interview__actions">
      <button type="button" className={primary} disabled={!draft.relationship.trim()||busy} onClick={start}><span>Help me find the words</span>{actionIcon(<Sparkles size={18}/>)}</button>
      <button type="button" className={secondary} disabled={!draft.relationship.trim()||busy} onClick={()=>setMode("written")}>I know what I want to say <ArrowRight size={18}/></button>
    </div>}
    {mode==="guided"&&<div className="keep-creative-interview__question">
      <div className="keep-creative-interview__progress"><p>Question {Math.min(5,draft.answers.length+1)} of 5</p>
      <div className="keep-creative-interview__track" role="progressbar" aria-label="Interview progress" aria-valuemin={0} aria-valuemax={5} aria-valuenow={draft.answers.length}><div style={{width:`${draft.answers.length*20}%`}}/></div></div>
      {phase?<InterviewTransition phase={phase} answerSaved={draft.answers.length>0}/>:draft.question?<><h3 className="keep-creative-interview__prompt">{draft.question}</h3>
        <textarea aria-label="Your answer" value={answer} onChange={e=>setAnswer(e.target.value)} className={field} rows={5} maxLength={6000} placeholder="Take your time. Share as much as you like." disabled={busy}/>
        <button type="button" disabled={busy||recorder.status==="requesting"} className={secondary} onClick={()=>void run(recorder.status==="recording"?"transcribing":"microphone",async()=>{if(recorder.status==="recording"){const take=await recorder.stop();if(take){const words=await transcribeAudio(take.blob,take.mimeType);if(!words)throw new Error("No words were detected. Please type your answer.");setAnswer(old=>[old,words].filter(Boolean).join(" "));}}else if(!await recorder.start())throw new Error("Microphone unavailable. You can type instead.");})}>{recorder.status==="recording"?<><Square size={18}/> Stop and transcribe</>:<><Mic size={18}/> Speak your answer</>}</button>
        <button type="button" className={primary} disabled={!answer.trim()||busy||recorder.status==="recording"} onClick={advance}><span>{draft.answers.length===4?"Submit my memories":"Continue"}</span>{actionIcon(<ArrowRight size={18}/>)}</button>
      </>:<button type="button" className={primary} onClick={start}><span>Continue interview</span>{actionIcon(<ArrowRight size={18}/>)}</button>}
      {!busy&&<button type="button" disabled={recorder.status==="recording"} className="keep-creative-interview__alternate" onClick={()=>setMode("written")}>Write my own words instead</button>}
    </div>}
    {mode==="written"&&<div className="keep-creative-interview__question"><textarea aria-label="Your own words" value={draft.written??""} maxLength={12000} rows={8} className={field} onChange={e=>setDraft({...draft,written:e.target.value})} placeholder="A memory, a thank you, something you have always wanted to say…" disabled={busy}/>
      {phase?<InterviewTransition phase={phase}/>:<button type="button" className={primary} disabled={!draft.relationship.trim()||!draft.written?.trim()} onClick={()=>void run("saving",async()=>{await save({...draft,completed:true});onDone();})}><span>Submit my words</span>{actionIcon(<ArrowRight size={18}/>)}</button>}
    </div>}
    {error&&<p role="alert" className="rounded-lg bg-[#FFF1ED] p-3 text-sm text-[#9A4339]">{error}</p>}
  </section>;
}
