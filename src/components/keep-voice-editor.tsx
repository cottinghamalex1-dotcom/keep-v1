import { ArrowRight, Check, ChevronDown, Headphones, MessageCircle, Mic2, Pause, Play, Volume2, X } from "lucide-react";
import type { AudioMix, VoiceTone } from "@/lib/keep-project";

type Props = {
  hasVoice: boolean; duration?: number; playing: boolean;
  tone: VoiceTone; voiceVolume: number; musicVolume: number; mix: AudioMix;
  onClose: () => void; onEditWords: () => void; onRerecord: () => void;
  onPlayPreview: () => void; onTone: (tone: VoiceTone) => void;
  onVolume: (track: "voice" | "music", value: number) => void;
  onMix: (change: Partial<AudioMix>) => void;
  onRemoteManage?: (() => void) | undefined;
};
const presets: { key: VoiceTone; title: string; description: string }[] = [
  { key: "natural", title: "Natural", description: "Balanced & true" },
  { key: "clear", title: "Clear", description: "Bright & defined" },
  { key: "warm", title: "Warm", description: "Full & intimate" },
];
const formatTime = (seconds: number) => {
  const total = Math.max(0, Math.round(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
};

export function KeepVoiceEditor({ hasVoice, duration, playing, tone, voiceVolume, musicVolume, mix,
  onClose, onEditWords, onRerecord, onPlayPreview, onTone, onVolume, onMix, onRemoteManage }: Props) {
  const volumeSlider = (label: string, track: "voice" | "music", value: number) => <label className="block">
    <span className="mb-1 flex items-center justify-between text-[11px] text-[#D8CDC1]"><span>{label}</span><output className="tabular-nums">{value}%</output></span>
    <input aria-label={label} type="range" min={0} max={100} value={value}
      onChange={event => onVolume(track, Number(event.target.value))} className="w-full accent-[#D2BA99]" />
  </label>;
  return <section className="keep-studio-compact p-3.5 sm:p-4" aria-label="Voice editor">
    <div className="flex items-center justify-between gap-3">
      <div><h2 className="font-display text-[25px] leading-none">Voice</h2>
        <p className="mt-1.5 text-[11px] text-[#BDB3AA]">Professionally polished, still unmistakably you.</p></div>
      <button type="button" onClick={onClose} aria-label="Close voice" className="keep-studio-icon-button"><X className="size-4" /></button>
    </div>

    <div className="mt-2.5 flex items-center gap-2.5 rounded-xl border border-[#51463E] bg-[#26231F] px-3 py-2">
      <Headphones className="size-4 shrink-0 text-[#D7C2A6]" />
      <span className="min-w-0 flex-1 truncate text-[11px] text-[#E6DCCF]">
        {hasVoice ? `${formatTime(duration ?? 0)} · Enhanced automatically` : "Record your voice to choose a sound"}
      </span>
      <button type="button" disabled={!hasVoice} onClick={onPlayPreview} aria-label={playing ? "Pause voice preview" : "Play voice preview"}
        className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#E8DFD2] text-[#231D17] disabled:opacity-40">
        {playing ? <Pause className="size-3.5" fill="currentColor" /> : <Play className="ml-0.5 size-3.5" fill="currentColor" />}
      </button>
    </div>

    {onRemoteManage && <button type="button" onClick={onRemoteManage}
      className="keep-studio-secondary-action mt-2.5 w-full justify-between">
      <span className="flex items-center gap-2"><Mic2 className="size-4"/> Check remote voice recordings</span><ArrowRight className="size-4"/>
    </button>}

    <div className="mt-3 grid grid-cols-3 gap-2" aria-label="Voice sound options">
      {presets.map(item => <button key={item.key} type="button" disabled={!hasVoice}
        onClick={() => onTone(item.key)} aria-pressed={tone === item.key}
        className={`keep-studio-choice relative min-h-[70px] min-w-0 px-2.5 py-2.5 text-left disabled:opacity-40 ${tone === item.key ? "keep-studio-choice--selected" : ""}`}>
        <span className="flex items-center justify-between gap-1 text-[12px] font-semibold text-[#F8F3EC]">{item.title}
          {tone === item.key && <Check className="size-3.5 shrink-0 text-[#E7D3B9]" />}</span>
        <span className="mt-1 block text-[10px] leading-[1.3] text-[#BFB4A9]">{item.description}</span>
      </button>)}
    </div>

    <details className="keep-studio-more mt-3">
      <summary className="flex min-h-10 cursor-pointer items-center justify-between text-[11px] font-medium text-[#D7C2A6]">
        <span className="flex items-center gap-2"><Volume2 className="size-4" /> More voice & music settings</span>
        <ChevronDown className="size-4 transition-transform" />
      </summary>
      <div className="space-y-3 border-t border-[#51463E] pb-1 pt-3">
        {volumeSlider("Voice volume", "voice", voiceVolume)}
        {volumeSlider("Music volume", "music", musicVolume)}
        <label className="flex items-center justify-between gap-3 rounded-lg border border-[#51463E] p-2.5 text-[11px] text-[#E8DCCF]">
          Lower the music beneath the voice
          <input type="checkbox" checked={mix.ducking} onChange={e => onMix({ ducking: e.target.checked })} className="size-4 accent-[#D2BA99]" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={onEditWords} className="keep-studio-secondary-action"><MessageCircle className="size-4" />Edit words<ArrowRight className="size-3" /></button>
          <button type="button" onClick={onRerecord} className="keep-studio-secondary-action"><Mic2 className="size-4" />Re-record<ArrowRight className="size-3" /></button>
        </div>
        <p className="text-[10px] leading-4 text-[#BEB4A9]">Rumble reduction, gentle noise cleanup, EQ, compression and peak protection apply automatically. Quiet noise reduction depends on browser support.</p>
      </div>
    </details>
  </section>;
}
