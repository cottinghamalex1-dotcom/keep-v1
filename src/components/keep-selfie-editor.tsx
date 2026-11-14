import { Camera, Check, ChevronDown, Film, Mic, Play, RefreshCw, X } from "lucide-react";
import type { KeepProject, MediaItem } from "@/lib/keep-project";
import { selfieAssets } from "@/lib/keep-selfie-story";

type Props={
  takes:MediaItem[];
  settings:Pick<KeepProject,"selfiePresentation"|"selfieBookendSeconds"|"selfieIntroId"|"selfieOutroId">;
  hasOtherMoments:boolean;
  onChange:(updates:Partial<KeepProject>)=>void;
  onRecord:()=>void;
  onRemove:(id:string)=>void;
  onClose:()=>void;
};
const presets=[
  {value:"auto",name:"Automatic",description:"The best fit for your memories"},
  {value:"full",name:"Full selfie",description:"Your face tells the whole story"},
  {value:"bookends",name:"Opening & closing",description:"Selfie at the start and end"},
  {value:"off",name:"Hidden",description:"Keep your recording, don't show it"},
] as const;

export function KeepSelfieEditor({takes,settings,hasOtherMoments,onChange,onRecord,onRemove,onClose}:Props) {
  const assets=selfieAssets(takes);
  const selected=settings.selfiePresentation??"auto";
  const bookends=selected==="bookends"||(selected==="auto"&&hasOtherMoments);
  return <section className="keep-studio-compact px-3.5 pb-4 pt-3.5 text-[#F7F2E9]" aria-label="Selfie video editor">
    <div className="flex items-center justify-between gap-2">
      <div><h2 className="font-display text-[25px] leading-none">Selfie Video</h2><p className="mt-1.5 text-[11px] text-[#C2B5A8]">See the person behind the words.</p></div>
      <button type="button" onClick={onClose} aria-label="Close selfie video editor" className="keep-studio-icon-button"><X className="size-4"/></button>
    </div>
    {!assets.length?<div className="mt-3 rounded-xl border border-[#5C4A3E] bg-[#27221F] p-3">
      <p className="text-[12px] leading-5">No selfie recorded yet. You can make a front-camera video while the words scroll over your screen.</p>
      <button type="button" onClick={onRecord} className="keep-studio-secondary-action mt-3 w-full justify-center"><Camera className="size-4"/> Record with selfie teleprompter</button>
    </div>:<>
      <div className="thin-scroll mt-3 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Recorded selfie takes">
        {assets.map((item,index)=><div key={item.id} className="relative w-[78px] shrink-0 overflow-hidden rounded-xl border border-[#76634F] bg-[#302A26]">
          <video src={item.url} muted playsInline preload="metadata" aria-label={`Selfie ${index+1}`} className="aspect-[9/12] w-full object-cover"/>
          <p className="truncate px-2 pb-2 pt-1 text-[9px] text-[#E7D7C7]">Part {(item.selfiePartIndex??0)+1}</p>
        </div>)}
      </div>
      <p className="mb-2 mt-3 text-[10px] font-semibold uppercase tracking-[.11em] text-[#D4B995]">How it appears in the Keep</p>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Selfie presentation">
        {presets.map(preset=><button key={preset.value} type="button" aria-pressed={selected===preset.value}
          onClick={()=>onChange({selfiePresentation:preset.value})}
          className={`keep-studio-choice relative min-h-[70px] px-3 py-2 text-left ${selected===preset.value?"keep-studio-choice--selected":""}`}>
          <span className="flex items-center justify-between gap-1 text-[11px] font-semibold">{preset.name}{selected===preset.value&&<Check className="size-3.5 text-[#DFC7A8]"/>}</span>
          <span className="mt-1 block text-[10px] leading-4 text-[#BEB0A1]">{preset.description}</span>
        </button>)}
      </div>
      {bookends&&<div className="mt-3 rounded-xl border border-[#564B40] bg-[#292521] p-3">
        <label className="block text-[11px]">
          <span className="flex justify-between"><span>Opening & closing length</span><output className="text-[#DCC4A4]">{settings.selfieBookendSeconds??4} seconds each</output></span>
          <input type="range" aria-label="Selfie bookend seconds" min={2} max={12} step={1} value={settings.selfieBookendSeconds??4}
            onChange={e=>onChange({selfieBookendSeconds:Number(e.target.value)})} className="mt-2 w-full accent-[#D8B990]"/>
        </label>
        {assets.length>1&&<div className="mt-3 grid grid-cols-2 gap-2">
          {([{key:"selfieIntroId",name:"Opening face",fallback:assets[0]!.id},
            {key:"selfieOutroId",name:"Closing face",fallback:assets[assets.length-1]!.id}] as const).map(option=>
            <label key={option.key} className="min-w-0 text-[10px] text-[#D8C9B9]">{option.name}
              <select aria-label={option.name} value={settings[option.key]??option.fallback}
                onChange={e=>onChange({[option.key]:e.target.value})}
                className="mt-1 block min-h-10 w-full min-w-0 rounded-lg border border-[#796956] bg-[#29231F] px-2 text-[11px] text-white">
                {assets.map((take,index)=><option key={take.id} value={take.id}>Person / part {(take.selfiePartIndex??index)+1}</option>)}
              </select>
            </label>)}
        </div>}
      </div>}
      <details className="keep-studio-more mt-3">
        <summary className="flex min-h-10 cursor-pointer items-center justify-between text-[11px] text-[#D7C2A6]">Retake or remove videos <ChevronDown className="size-4"/></summary>
        <div className="space-y-2 border-t border-[#51463E] py-3">
          <button type="button" onClick={onRecord} className="keep-studio-secondary-action w-full justify-center"><RefreshCw className="size-4"/> Re-record selfie with voice</button>
          {assets.map((take,index)=><button type="button" key={take.id} onClick={()=>onRemove(take.id)}
            className="keep-studio-secondary-action w-full justify-between text-[#E5BEB7]">
            Remove selfie from part {(take.selfiePartIndex??index)+1}<X className="size-4"/>
          </button>)}
        </div>
      </details>
    </>}
    <p className="mt-3 flex items-start gap-2 text-[10px] leading-[1.7] text-[#B9A99B]"><Mic className="mt-0.5 size-3.5 shrink-0"/>
      The selfie footage stays muted in the finished Keep, so your enhanced narration and music remain clear. The words on the camera screen are not recorded.</p>
  </section>;
}
