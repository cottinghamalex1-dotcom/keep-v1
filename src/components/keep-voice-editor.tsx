import { useState } from "react";
import { ArrowRight, ChevronDown, MessageCircle, Mic2, Pause, Play, Volume2, X } from "lucide-react";
import type { AudioMix, VoiceTone } from "@/lib/keep-project";

type Props = {
  hasVoice: boolean;
  duration?: number;
  playing: boolean;
  tone: VoiceTone;
  voiceVolume: number;
  musicVolume: number;
  mix: AudioMix;
  onClose: () => void;
  onEditWords: () => void;
  onRerecord: () => void;
  onPlayPreview: () => void;
  onTone: (tone: VoiceTone) => void;
  onVolume: (track: "voice" | "music", value: number) => void;
  onMix: (change: Partial<AudioMix>) => void;
};

const presets: { key:VoiceTone; title:string; description:string }[] = [
  {key:"natural",title:"Natural",description:"Your original voice"},
  {key:"clear",title:"Clear",description:"Brighter, clearer speech"},
  {key:"warm",title:"Warm",description:"A softer, fuller sound"},
];
const time = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.round(seconds) % 60).padStart(2,"0")}`;

export function KeepVoiceEditor({ hasVoice, duration, playing, tone, voiceVolume, musicVolume, mix,
  onClose, onEditWords, onRerecord, onPlayPreview, onTone, onVolume, onMix }: Props) {
  const [showMix, setShowMix] = useState(false);
  const slider = (label: string, track: "voice" | "music", value: number) => <label className="block">
    <span className="mb-1.5 flex items-center justify-between text-xs"><span>{label}</span><output className="tabular-nums text-[#D2BA99]">{value}%</output></span>
    <input type="range" min={0} max={100} step={1} value={value}
      onChange={(e) => onVolume(track,Number(e.target.value))} className="w-full accent-[#D2BA99]" />
  </label>;
  return <section className="keep-voice-editor p-4 sm:p-5" aria-label="Voice editor">
    <div className="flex items-start justify-between">
      <div><h2 className="font-display text-[28px] leading-8 text-foreground">Voice</h2>
        <p className="mt-1 text-xs text-muted-foreground">Make your words sound like you.</p>
      </div>
      <button type="button" onClick={onClose} aria-label="Close voice" className="flex size-9 items-center justify-center rounded-full border border-border"><X className="size-4" /></button>
    </div>
    <div className="mt-4 flex min-w-0 items-center gap-3 rounded-xl border border-[#474245] bg-[#222123] px-3 py-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#343033] text-[#D2BA99]"><Mic2 className="size-4" /></div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{hasVoice ? "Your voice recording" : "No voice recording yet"}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hasVoice ? `${time(duration ?? 0)} · Ready to edit` : "Record a message to hear it with your music"}</p>
      </div>
      <button type="button" disabled={!hasVoice} onClick={onPlayPreview} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#E8E1D7] text-[#111113] disabled:opacity-40"
        aria-label={playing ? "Pause voice preview" : "Play voice preview"}>
        {playing ? <Pause className="size-4" fill="currentColor" /> : <Play className="ml-0.5 size-4" fill="currentColor" />}
      </button>
    </div>

    <div className="mt-3 grid grid-cols-2 gap-2">
      <button type="button" onClick={onEditWords} className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#494547] bg-[#222123] px-2 text-xs font-medium"><MessageCircle className="size-4 text-[#D2BA99]" />Edit words<ArrowRight className="size-3" /></button>
      <button type="button" onClick={onRerecord} className="flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[#494547] bg-[#222123] px-2 text-xs font-medium"><Mic2 className="size-4 text-[#D2BA99]" />Re-record<ArrowRight className="size-3" /></button>
    </div>

    <div className="mt-5">
      <p className="text-sm font-medium">Polish your voice</p>
      <p className="mt-1 text-[11px] leading-4 text-muted-foreground">Hear each option in the video preview.</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {presets.map((item)=><button key={item.key} type="button" disabled={!hasVoice} onClick={()=>onTone(item.key)} aria-pressed={tone===item.key}
          className={`min-h-20 rounded-xl border px-2 py-2.5 text-left disabled:opacity-40 ${tone===item.key ? "border-[#D2BA99] bg-[#3A332F]" : "border-[#494547] bg-[#222123]"}`}>
          <span className="mb-1 flex items-center justify-between gap-1 text-xs font-semibold">{item.title}{tone===item.key && <span className="text-[#E8D1B2]">✓</span>}</span>
          <span className="block text-[10px] leading-[1.35] text-muted-foreground">{item.description}</span>
        </button>)}
      </div>
      <p className="mt-2 text-[10px] leading-4 text-muted-foreground">Gentle tone and level adjustments; they won't remove strong background noise from a recording.</p>
    </div>

    <button type="button" className="mt-4 flex min-h-11 w-full items-center justify-between border-t border-[#494547] pt-3 text-left text-sm font-medium"
      onClick={()=>setShowMix(x=>!x)} aria-expanded={showMix}>
      <span className="flex items-center gap-2"><Volume2 className="size-4 text-[#D2BA99]" />Mix voice & music</span>
      <ChevronDown className={`size-4 transition-transform ${showMix ? "rotate-180" : ""}`} />
    </button>
    {showMix && <div className="mt-3 space-y-4 rounded-xl border border-[#494547] bg-[#222123] p-4">
      {slider("Voice volume","voice",voiceVolume)}
      {slider("Music volume","music",musicVolume)}
      <label className="flex items-center justify-between gap-3 text-xs">
        <span><span className="block font-medium">Keep voice in front</span><span className="mt-1 block text-[11px] text-muted-foreground">Lower music as you speak.</span></span>
        <input type="checkbox" checked={mix.ducking} onChange={e=>onMix({ducking:e.target.checked})} className="size-5 accent-[#E8E1D7]" />
      </label>
    </div>}
  </section>;
}
