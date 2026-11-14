import { Camera, Check, Mic } from "lucide-react";

export function KeepSelfiePrompt({enabled,preparing,error,onChoose,onVoiceOnly}:{
  enabled:boolean;preparing:boolean;error?:string;
  onChoose:()=>void;onVoiceOnly:()=>void;
}) {
  return <section aria-label="Optional selfie recording" className="shrink-0 rounded-xl border border-[#D8C9B7] bg-[#FCF9F4] p-2.5">
    <p className="mb-2 text-center text-[10px] font-semibold tracking-[.07em] text-[#7C624A]">Would you like to appear in your Keep? <span className="font-normal normal-case tracking-normal">Optional</span></p>
    <div className="grid grid-cols-2 gap-2">
      <button type="button" disabled={preparing} aria-pressed={!enabled} onClick={onVoiceOnly}
        className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border px-2 text-[11px] font-semibold transition-colors ${!enabled?"border-[#988069] bg-[#E7DBC9] text-[#33281F]":"border-[#DDD3C8] bg-white text-[#746454]"}`}>
        <Mic className="size-4"/>{!enabled?<Check className="size-3.5"/>:null} Voice only
      </button>
      <button type="button" disabled={preparing} aria-pressed={enabled} onClick={onChoose}
        className={`flex min-h-11 items-center justify-center gap-2 rounded-lg border px-2 text-[11px] font-semibold transition-colors ${enabled?"border-[#988069] bg-[#E7DBC9] text-[#33281F]":"border-[#DDD3C8] bg-white text-[#746454]"}`}>
        <Camera className="size-4"/>{preparing?"Opening camera…":enabled?"Selfie ready":"Record selfie too"}
      </button>
    </div>
    {!!error&&<p role="alert" className="mt-2 text-center text-[10px] text-[#9E4E3F]">{error}</p>}
    {enabled&&<p className="mt-2 text-center text-[10px] leading-4 text-[#6A5847]">Your face stays on screen. Read the scrolling words over the camera. Only the video and your voice are recorded—not the words.</p>}
  </section>;
}
