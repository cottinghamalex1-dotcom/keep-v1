import { useRef, useState, type ChangeEvent } from "react";
import { CheckCircle2, ImagePlus, Images, Loader2, Video } from "lucide-react";
import { uploadRemoteMedia } from "@/lib/keep-remote";
import { prepareRemoteMoment, REMOTE_MEDIA_LIMIT } from "@/lib/keep-remote-media-prep";

type Props={token:string;mediaCount:number;onUploaded:(count:number)=>void};
export function KeepRemoteMediaContributor({token,mediaCount,onUploaded}:Props) {
  const input=useRef<HTMLInputElement>(null);
  const [busy,setBusy]=useState(false);
  const [status,setStatus]=useState("");
  const [error,setError]=useState("");
  const [recent,setRecent]=useState<string[]>([]);
  const [added,setAdded]=useState(0);
  const upload=async(event:ChangeEvent<HTMLInputElement>)=>{
    const files=Array.from(event.target.files??[]);
    event.target.value="";
    if(!files.length||busy)return;
    const available=Math.max(0,REMOTE_MEDIA_LIMIT-mediaCount);
    if(files.length>available) {setError(`You can share up to ${REMOTE_MEDIA_LIMIT} moments. Please choose ${available} or fewer.`);return;}
    setBusy(true);setError("");
    let count=mediaCount;
    const success:string[]=[];
    let failure="";
    try{
      for(let i=0;i<files.length;i++){
        const file=files[i]!;
        try {
          setStatus(`Preparing ${i+1} of ${files.length}: ${file.name}`);
          const prepared=await prepareRemoteMoment(file,message=>setStatus(`${i+1} of ${files.length} · ${message}`));
          setStatus(`Sending ${i+1} of ${files.length} securely… Please leave this page open.`);
          const result=await uploadRemoteMedia(token,prepared.file,prepared.kind,prepared.durationSec);
          count=result.count;success.push(file.name);
          onUploaded(count);
        }catch(issue){
          failure=`${file.name}: ${issue instanceof Error?issue.message:"Couldn't upload this moment."}`;
          break;
        }
      }
    }finally{
      setBusy(false);setStatus("");
      if(success.length){setRecent(old=>[...success,...old].slice(0,8));setAdded(v=>v+success.length);}
      if(failure)setError(failure+" Previously uploaded moments are safely saved. Try the remaining files again.");
    }
  };
  const disabled=busy||mediaCount>=REMOTE_MEDIA_LIMIT;
  return <section aria-label="Optional photos and videos" className="rounded-[22px] border border-[#DCD0C0] bg-[#FFFCF8] p-5 shadow-[0_12px_32px_rgba(56,39,23,.05)]">
    <div className="flex items-center gap-3">
      <span className="flex size-11 items-center justify-center rounded-full border border-[#DDCDBA] bg-[#F5EADC]"><Images className="size-5 text-[#80664D]"/></span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[.17em] text-[#8B755D]">OPTIONAL · SHARE YOUR MOMENTS</p>
        <h2 className="mt-1 font-display text-[27px] leading-none text-[#2F281F]">Add photos & videos.</h2>
      </div>
    </div>
    <p className="mt-4 text-[12px] leading-6 text-[#6D6156]">
      Have favorite memories with the recipient? Choose photos from your camera roll, and add a few short video clips if you'd like.
      Keep will send them directly to the creator to review and include.
    </p>
    <p className="mt-2 rounded-lg bg-[#F3EBE0] px-3 py-2 text-[11px] leading-5 text-[#715E4C]">
      Mostly photos work best. For videos, aim for <strong>10 seconds or less</strong>.
      Keep automatically tries to compress larger clips before uploading.
    </p>
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm,.heic,.heif,.mov,.mp4"
      multiple aria-label="Choose photos and short videos" onChange={event=>void upload(event)} className="sr-only"/>
    <button type="button" disabled={disabled} onClick={()=>input.current?.click()}
      className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#211D19] px-4 text-[13px] font-medium text-[#FFF8EF] disabled:opacity-50">
      {busy?<Loader2 className="size-4 animate-spin"/>:<ImagePlus className="size-4"/>}
      {busy?"Preparing your moments…":mediaCount>=REMOTE_MEDIA_LIMIT?"Maximum moments shared":"Choose photos or short videos"}
    </button>
    {busy&&<p role="status" className="mt-3 text-center text-[11px] leading-5 text-[#7D6A58]">{status}</p>}
    {error&&<p role="alert" className="mt-3 rounded-lg border border-[#E4C2B8] bg-[#FFF0EB] p-3 text-[11px] leading-5 text-[#8F453B]">{error}</p>}
    <p className="mt-3 text-center text-[11px] text-[#817260]">{mediaCount} / {REMOTE_MEDIA_LIMIT} moments shared securely</p>
    {!!recent.length&&<div className="mt-4 border-t border-[#E4DACD] pt-3">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#517349]"><CheckCircle2 className="size-4"/> {added} moment{added===1?"":"s"} sent successfully</p>
      <ul className="space-y-1">{recent.map((name,i)=><li key={name+i} className="flex items-center gap-2 truncate text-[11px] text-[#77695C]"><CheckCircle2 className="size-3.5 shrink-0 text-[#64835A]"/><span className="truncate">{name}</span></li>)}</ul>
    </div>}
    <p className="mt-3 flex items-center gap-2 text-[10px] leading-4 text-[#948475]"><Video className="size-4 shrink-0"/> Only the Keep creator can collect your privately shared moments. You can close this page after uploads finish.</p>
  </section>;
}
