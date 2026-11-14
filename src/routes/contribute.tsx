import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { ArrowRight, Check, CircleCheck, FileAudio, Heart, ImagePlus, Mic, Pause, RefreshCw, ShieldCheck, Square } from "lucide-react";
import { KeepTeleprompter } from "@/components/keep-teleprompter";
import { KeepSelfiePrompt } from "@/components/keep-selfie-prompt";
import { KeepRemoteMediaContributor } from "@/components/keep-remote-media-contributor";
import { useRecorder } from "@/hooks/use-recorder";
import { getRemoteFileDuration, resolveRemoteInvitation, uploadRemoteMedia, uploadRemoteRecording, type RemoteInviteDetails } from "@/lib/keep-remote";

export const Route=createFileRoute("/contribute")({
  head:()=>({meta:[
    {title:"A voice for someone special · Keep"},
    {name:"robots",content:"noindex,nofollow,noarchive"},
    {name:"referrer",content:"no-referrer"},
  ]}),
  component:KeepRemoteContributor,
});
function KeepRemoteContributor() {
  const token=useMemo(()=>typeof window==="undefined"?"":new URLSearchParams(window.location.search).get("invite")||"",[]);
  const [invite,setInvite]=useState<RemoteInviteDetails|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [sending,setSending]=useState(false);
  const [currentIndex,setCurrentIndex]=useState(0);
  const [started,setStarted]=useState(false);
  const [selfieSelected,setSelfieSelected]=useState(false);
  const [selfiePreparing,setSelfiePreparing]=useState(false);
  const [selfieRetry,setSelfieRetry]=useState<{blob:Blob;duration:number;partIndex:number;mime:string}|null>(null);
  const [mediaMode,setMediaMode]=useState(false);
  const [uploadRetry,setUploadRetry]=useState<{blob:Blob;duration:number}|null>(null);
  const [sent,setSent]=useState(false);
  const recorder=useRecorder();
  const pending=invite?.parts.filter(part=>!part.completed)??[];
  const currentPart=pending.find(part=>part.index===currentIndex)??pending[0];
  const load=async()=>{
    setLoading(true);setError("");
    try{
      const details=await resolveRemoteInvitation(token);
      setInvite(details);
      const first=details.parts.find(part=>!part.completed);
      setCurrentIndex(first?.index??0);
    }catch(issue){setError(issue instanceof Error?issue.message:"This invitation couldn't be opened.");}
    finally{setLoading(false);}
  };
  useEffect(()=>{void load();},[token]);
  const uploadSelfie=async(take:{blob:Blob;duration:number;partIndex:number;mime:string})=>{
    const extension=take.mime.includes("mp4")?"mp4":"webm";
    const file=new File([take.blob],`Selfie-part-${take.partIndex+1}.${extension}`,{type:take.mime||take.blob.type});
    await uploadRemoteMedia(token,file,"video",take.duration,"selfie",take.partIndex);
    const updated=await resolveRemoteInvitation(token);
    setInvite(updated);
    setSelfieRetry(null);
  };
  const chooseSelfie=async()=>{
    if(selfieSelected){recorder.disableSelfie();setSelfieSelected(false);return;}
    setSelfiePreparing(true);
    const prepared=await recorder.prepareSelfie();
    setSelfiePreparing(false);
    if(prepared)setSelfieSelected(true);
    else setError("Front camera unavailable. You can still record your voice.");
  };
  const submit=async(blob:Blob,duration:number,selfie?:{blob:Blob;duration:number;partIndex:number;mime:string})=>{
    if(!currentPart)return;
    const partIndex=currentPart.index;
    if(selfie)setSelfieRetry(selfie);
    setSending(true);setError("");setUploadRetry({blob,duration});
    try{
      await uploadRemoteRecording(token,partIndex,blob,duration);
      const next=await resolveRemoteInvitation(token);
      setInvite(next);
      setUploadRetry(null);
      setStarted(false);
      setSent(true);
      if(selfie){
        try{await uploadSelfie(selfie);}
        catch(issue){
          setError(issue instanceof Error?issue.message:"Selfie upload wasn't completed. Your voice was saved.");
          setMediaMode(true);
        }
      }
      if(next.parts.every(part=>part.completed))setMediaMode(true);
      const nextPart=next.parts.find(part=>!part.completed);
      if(nextPart)setCurrentIndex(nextPart.index);
    }catch(issue){setError(issue instanceof Error?issue.message:"Your recording didn't upload. Tap Retry to send it again.");}
    finally{setSending(false);}
  };
  const finish=async()=>{
    const result=await recorder.stop();
    if(!result||result.durationSec<.25){setError("That recording was too short. Try again.");return;}
    const selfie=result.selfieBlob?{
      blob:result.selfieBlob,duration:result.durationSec,partIndex:currentPart!.index,
      mime:result.selfieMimeType||result.selfieBlob.type
    }:undefined;
    if(selfieSelected&&!selfie)setError("Your voice was recorded, but this device couldn't save the camera video.");
    setSelfieSelected(false);
    await submit(result.blob,result.durationSec,selfie);
  };
  const fromFiles=async(event:ChangeEvent<HTMLInputElement>)=>{
    const file=event.target.files?.[0];
    event.target.value="";
    if(!file)return;
    if(file.size>20*1024*1024){setError("Choose an audio file smaller than 20 MB.");return;}
    try {
      const duration=await getRemoteFileDuration(file);
      await submit(file,duration);
    }catch(issue){setError(issue instanceof Error?issue.message:"That audio file couldn't be opened.");}
  };
  const recording=recorder.status==="recording"||recorder.status==="paused";
  if(loading)return <main className="flex min-h-dvh flex-col items-center justify-center bg-[#F7F5F2] px-7 text-[#30271F]">
    <span className="font-display text-[58px]">Keep</span><p className="mt-5 text-xs text-[#7B6A57]">Opening your private invitation…</p></main>;
  if(!invite)return <main className="flex min-h-dvh flex-col items-center justify-center bg-[#F7F5F2] px-7 text-center text-[#30271F]">
    <span className="font-display text-[58px]">Keep</span><h1 className="mt-8 font-display text-3xl">This invitation isn't available.</h1>
    <p role="alert" className="mt-3 max-w-xs text-sm leading-6 text-[#79695B]">{error||"Ask the creator for a new private link."}</p>
    <button type="button" onClick={()=>void load()} className="mt-6 flex min-h-12 items-center gap-2 rounded-xl border border-[#BEAD9C] px-5 text-xs"><RefreshCw className="size-4"/>Try again</button>
  </main>;
  if(mediaMode)return <main className="mx-auto min-h-dvh max-w-[590px] bg-[#F7F5F2] px-6 pb-14 pt-7 text-[#30271F]">
    <div className="flex items-center justify-between"><span className="font-display text-[38px]">Keep</span>
      <span className="rounded-full border border-[#D8C9BA] px-3 py-1.5 text-[10px] text-[#7D6A57]">Private invitation</span></div>
    <p className="mt-9 text-[10px] font-semibold uppercase tracking-[.18em] text-[#8D735A]">A KEEP FOR {invite.recipientName.toUpperCase()}</p>
    <h1 className="mt-3 font-display text-[clamp(36px,9vw,49px)] leading-[1.1] tracking-[-.03em]">The moments that matter.</h1>
    <p className="mb-6 mt-3 text-[13px] leading-6 text-[#76695E]">Your voice and memories make this gift more personal. Photos and videos are completely optional.</p>
    {selfieRetry&&<section className="mb-5 rounded-xl border border-[#C9B095] bg-[#FFF9ED] p-4">
      <p className="text-[12px] font-semibold">Your voice was received. The optional selfie still needs to upload.</p>
      <p className="mt-1 text-[11px] leading-5 text-[#776454]">Retry without re-recording your voice.</p>
      <button type="button" disabled={sending} onClick={async()=>{
        setSending(true);setError("");
        try{await uploadSelfie(selfieRetry);}
        catch(issue){setError(issue instanceof Error?issue.message:"The selfie couldn't be sent. Try again.");}
        finally{setSending(false);}
      }} className="mt-3 flex min-h-11 w-full items-center justify-center rounded-lg bg-[#211B17] text-xs font-semibold text-white disabled:opacity-50">
        {sending?"Sending selfie…":"Retry selfie upload"}
      </button>
      <button type="button" className="mt-2 min-h-9 w-full text-xs text-[#7D6550]" onClick={()=>{setSelfieRetry(null);setError("");}}>Skip selfie video</button>
      {error&&<p role="alert" className="mt-2 text-[11px] text-[#9D4C3B]">{error}</p>}
    </section>}
    <KeepRemoteMediaContributor token={token} mediaCount={invite.mediaCount??0}
      onUploaded={count=>setInvite(old=>old?{...old,mediaCount:count}:old)}/>
    {pending.length>0&&<button type="button" onClick={()=>{setMediaMode(false);setStarted(false);}}
      className="mt-4 flex min-h-12 w-full items-center justify-center rounded-xl border border-[#CDBBA9] bg-white text-[12px] font-medium">Return to my voice recording</button>}
    <button type="button" onClick={()=>{setMediaMode(false);setStarted(false);}} className="mt-3 flex min-h-12 w-full items-center justify-center rounded-xl bg-[#211D19] text-[12px] font-semibold text-[#FFFAF3]">
      {pending.length>0?"Save my moments for now":"I'm finished · Thank you"}
    </button>
  </main>;
  if(!pending.length)return <main className="flex min-h-dvh flex-col items-center justify-center bg-[#F7F5F2] px-7 text-center text-[#30271F]">
    <div className="flex size-16 items-center justify-center rounded-full border border-[#D7C9BA] bg-[#F1E5D6]"><CircleCheck className="size-8 text-[#648364]"/></div>
    <p className="mt-7 text-[10px] font-semibold uppercase tracking-[.2em] text-[#8F775E]">VOICE RECEIVED</p>
    <h1 className="mt-4 font-display text-[clamp(40px,11vw,58px)] leading-[1.05]">Your part is kept.</h1>
    <p className="mt-5 max-w-xs text-sm leading-7 text-[#6E6257]">
      Thank you, {invite.contributorName}. Your recordings are safely back with {invite.creatorName}.
      They'll be beautifully woven into this Keep for {invite.recipientName}.
    </p>
    <button type="button" onClick={()=>setMediaMode(true)} className="mt-9 flex min-h-12 items-center gap-2 rounded-xl border border-[#BFAE9D] bg-[#FFFCF8] px-5 text-sm font-medium"><ImagePlus className="size-4"/> Add more photos or videos</button>
    <p className="mt-12 font-display text-2xl italic text-[#806B56]">Some things are worth keeping.</p>
  </main>;
  if(!started)return <main className="mx-auto min-h-dvh max-w-[590px] bg-[#F7F5F2] px-6 pb-14 pt-7 text-[#30271F]">
    <div className="flex items-center justify-between"><span className="font-display text-[38px]">Keep</span><span className="rounded-full border border-[#D8C9BA] px-3 py-1.5 text-[10px] text-[#7D6A57]">Private invitation</span></div>
    <div className="mt-10 rounded-[22px] border border-[#DFD3C5] bg-[#FFFCF7] p-6 shadow-[0_15px_40px_rgba(73,51,27,.055)]">
      <p className="text-[10px] font-semibold uppercase tracking-[.22em] text-[#8B7159]">A MESSAGE FROM {invite.creatorName.toUpperCase()}</p>
      <h1 className="mt-5 font-display text-[clamp(39px,10vw,53px)] leading-[1.05] tracking-[-.035em]">Your voice & memories matter, {invite.contributorName}.</h1>
      <p className="mt-5 text-sm leading-7 text-[#776B60]">
        {invite.creatorName} is creating a personal Keep for <strong className="font-medium text-[#3B3026]">{invite.recipientName}</strong>
        {invite.occasion? ` for ${invite.occasion.toLowerCase()}`:""}—and would love for you to be part of it.
      </p>
      <div className="mt-7 border-t border-[#E0D6CB] pt-5">
        <p className="text-[10px] uppercase tracking-[.18em] text-[#8F775E]">IT'S SIMPLE</p>
        <div className="mt-4 space-y-4">
          {[
            ["01","Find somewhere quiet","Your phone is all you need."],
            ["02","Read your exact words","Your personal script scrolls automatically while you record."],
            ["03","Share favorite moments (optional)","Add photos and short videos from your phone if you'd like."],
            ["04","Everything goes back to the creator","Your voice and moments upload privately for the creator to review."],
          ].map(([number,title,detail])=><div key={number} className="flex items-start gap-4"><span className="font-display text-[26px] italic text-[#9A7D60]">{number}</span>
            <div><p className="text-sm font-medium">{title}</p><p className="mt-0.5 text-[11px] leading-5 text-[#786C5F]">{detail}</p></div></div>)}
        </div>
      </div>
    </div>
    {sent&&<p role="status" className="mt-4 rounded-xl border border-[#D4E3CF] bg-[#EFF7EA] px-4 py-3 text-[12px] text-[#4A6F43]">Your previous part was received. Thank you!</p>}
    <p className="mt-5 text-center text-xs text-[#786D61]">{pending.length} {pending.length===1?"speaking part":"speaking parts"} remaining · No sign-in needed</p>
    <button type="button" onClick={()=>{setError("");setStarted(true);}} className="mt-4 flex min-h-14 w-full items-center justify-between rounded-xl bg-[#151310] px-5 text-sm font-semibold text-[#FAF4EB]">
      I'm ready to record <ArrowRight className="size-5"/>
    </button>
    <button type="button" onClick={()=>setMediaMode(true)} className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#BBA791] bg-[#FFFCF7] px-3 text-[12px] font-medium text-[#69523E]"><ImagePlus className="size-4"/> Share photos & videos first (optional)</button>
    <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-[#8A7865]"><ShieldCheck className="size-3.5"/> Your voice, photos and videos are private.</p>
  </main>;
  return <main className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-[#F7F5F2] px-3 pb-[max(8px,env(safe-area-inset-bottom))] pt-[max(7px,env(safe-area-inset-top))] text-[#30271F]">
    <div className="mx-auto flex w-full max-w-[620px] shrink-0 items-center justify-between gap-2 px-2 pb-2">
      <div><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#8F775E]">KEEP · REMOTE RECORDING</p>
        <p className="font-display text-[21px]">{invite.contributorName}'s turn</p></div>
      <p className="text-[11px] text-[#827568]">Part {invite.parts.findIndex(p=>p.index===currentPart!.index)+1} / {invite.parts.length}</p>
    </div>
    {!recording&&!sending&&!uploadRetry&&<div className="mx-auto w-full max-w-[620px] shrink-0 pb-2">
      <KeepSelfiePrompt enabled={selfieSelected} preparing={selfiePreparing}
        error={recorder.cameraError} onChoose={()=>void chooseSelfie()}
        onVoiceOnly={()=>{recorder.disableSelfie();setSelfieSelected(false);}}/>
    </div>}
    <div className="mx-auto flex w-full max-w-[620px] min-h-0 flex-1 flex-col">
      <KeepTeleprompter key={currentPart!.index} label="YOUR EXACT WORDS" speaker={invite.contributorName}
        text={currentPart!.text} cameraStream={selfieSelected?recorder.previewStream:null}
        isRecording={recording} isPaused={recorder.status==="paused"} elapsed={recorder.elapsed}/>
    </div>
    <div className="mx-auto w-full max-w-[620px] shrink-0 pt-2">
      {error&&<p role="alert" className="mb-2 rounded-lg border border-[#E0B0A7] bg-[#FFF1ED] px-3 py-2 text-[11px] text-[#9A4339]">{error}</p>}
      {sending? <p role="status" className="rounded-xl bg-[#E9DFD3] p-4 text-center text-[12px] font-medium">Uploading your voice securely… Please keep this page open.</p>
      : uploadRetry ? <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={()=>void submit(uploadRetry.blob,uploadRetry.duration,selfieRetry??undefined)} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#171512] px-2 text-xs font-medium text-[#F9F1E7]"><RefreshCw className="size-4"/>Retry upload</button>
          <button type="button" onClick={()=>{setUploadRetry(null);setError("");}} className="min-h-12 rounded-xl border border-[#C9B9AA] px-2 text-xs">Record again</button>
        </div>
      : recording ? <div className={recorder.canPause?"grid grid-cols-2 gap-2":"grid grid-cols-1 gap-2"}>
          {recorder.canPause&&<button type="button" onClick={recorder.status==="paused"?recorder.resume:recorder.pause} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#BEB0A1] bg-[#FCF8F3] text-sm">
            {recorder.status==="paused"?<Mic className="size-4"/>:<Pause className="size-4"/>}{recorder.status==="paused"?"Resume":"Pause"}
          </button>}
          <button type="button" onClick={()=>void finish()} className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#161411] px-4 text-sm font-medium text-white"><Square className="size-4" fill="currentColor"/> Finish & send</button>
        </div>
      : <button type="button" disabled={recorder.status==="requesting"} onClick={async()=>{setError("");if(!(await recorder.start({selfie:selfieSelected})))setError("Allow microphone and camera access, or choose voice only.");}}
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#171512] text-sm font-semibold text-[#FAF5ED] disabled:opacity-50"><Mic className="size-4"/> {recorder.status==="requesting"?"Opening microphone…":"Start recording"}</button>}
      {!recording&&!sending&&!uploadRetry&&<details className="mt-2 rounded-xl border border-[#D8CAB9] bg-[#FFFCF7] px-3 py-1.5 text-xs">
        <summary className="min-h-9 cursor-pointer py-2 font-medium text-[#6D5745]">Prefer using iPhone Voice Memos instead?</summary>
        <div className="border-t border-[#E1D7CA] pb-3 pt-2 text-[11px] leading-6 text-[#716356]">
          <p>1. Open Voice Memos and record yourself reading the words above.</p>
          <p>2. Tap Done. Open your memo, choose Share, then Save to Files.</p>
          <p>3. Return here and upload the saved audio file.</p>
          <label className="mt-2 flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#BCA994] bg-[#F4ECE1] font-medium text-[#493A2C]">
            <FileAudio className="size-4"/> Choose audio file
            <input type="file" accept="audio/*,.m4a,.mp3,.wav,.webm,.ogg" onChange={event=>void fromFiles(event)} className="sr-only" />
          </label>
        </div>
      </details>}
    </div>
  </main>;
}
