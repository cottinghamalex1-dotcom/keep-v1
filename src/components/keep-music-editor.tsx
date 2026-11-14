import { Check, ChevronDown, Music2, Play, Square, Volume2, X } from "lucide-react";
import type { AudioMix } from "@/lib/keep-project";

type Track = { name: string; note: string; group: string };
type Props = {
  tracks: Track[]; selected: string; sampling: string;
  voiceVolume: number; musicVolume: number; mix: AudioMix;
  onClose: () => void; onSample: (name: string) => void;
  onSelect: (name: string) => void;
  onSetVolume: (track: "voice" | "music", value: number) => void;
  onSetMix: (change: Partial<AudioMix>) => void;
  onHearWithVoice: () => void;
};

export function KeepMusicEditor({ tracks, selected, sampling, voiceVolume, musicVolume, mix, onClose, onSample, onSelect,
  onSetVolume, onSetMix, onHearWithVoice }: Props) {
  const selectedTrack = tracks.find(track => track.name === selected);
  const featured = [...(selectedTrack ? [selectedTrack] : []), ...tracks.filter(track => track.name !== selected)].slice(0, 3);
  const otherTracks = tracks.filter(track => !featured.some(item => item.name === track.name));
  const slider = (label: string, value: number, track: "voice" | "music") => <label className="block">
    <span className="mb-1 flex items-center justify-between text-[11px]"><span>{label}</span><output className="text-[#D7C2A6]">{value}%</output></span>
    <input type="range" min={0} max={100} value={value} onChange={event => onSetVolume(track, Number(event.target.value))}
      aria-label={label} className="w-full accent-[#D2BA99]" />
  </label>;
  return <section className="keep-studio-compact px-3.5 pb-4 pt-3.5" aria-label="Music editor">
    <div className="flex items-center justify-between gap-3">
      <div><h2 className="font-display text-[25px] leading-none">Music</h2>
        <p className="mt-1 text-[11px] text-[#BDB3AA]">Find the feeling behind your story.</p></div>
      <button type="button" aria-label="Close music" onClick={onClose} className="keep-studio-icon-button"><X className="size-4" /></button>
    </div>
    <div className="mt-3 grid grid-cols-3 gap-2" aria-label="Featured soundtracks">
      {featured.map(track => {
        const isSelected = selected === track.name;
        const playing = sampling === track.name;
        return <div key={track.name} className={`keep-studio-choice relative min-w-0 p-2 ${isSelected ? "keep-studio-choice--selected" : ""}`}>
          <button type="button" aria-label={`Use ${track.name}`} aria-pressed={isSelected} onClick={() => onSelect(track.name)}
            className="flex min-h-10 w-full flex-col justify-center text-left">
            <span className="flex items-center gap-1 text-[11px] font-semibold leading-tight">{track.name}{isSelected && <Check className="size-3.5 shrink-0 text-[#DCC5A8]" />}</span>
            <span className="mt-1 line-clamp-1 text-[10px] text-[#BDB3AA]">{track.note}</span>
          </button>
          <button type="button" onClick={() => onSample(track.name)} aria-label={`${playing ? "Stop" : "Listen to"} ${track.name}`}
            className="mt-2 flex min-h-8 w-full items-center justify-center gap-1 rounded-lg border border-[#7A6855] bg-[#30291F] text-[10px] text-[#F7EBDB]">
            {playing ? <Square className="size-3" fill="currentColor" /> : <Play className="size-3" fill="currentColor" />}
            {playing ? "Stop" : "Listen"}
          </button>
        </div>;
      })}
    </div>
    <button type="button" onClick={onHearWithVoice} className="keep-studio-secondary-action mt-3 w-full justify-center">
      <Play className="size-3.5" fill="currentColor" /> Hear with your voice
    </button>
    <details className="keep-studio-more mt-2">
      <summary className="flex min-h-10 cursor-pointer items-center justify-between text-[11px] font-medium text-[#D7C2A6]">
        <span className="inline-flex items-center gap-2"><Music2 className="size-4" /> More music & mixing</span><ChevronDown className="size-4" />
      </summary>
      <div className="space-y-3 border-t border-[#51463E] pt-3">
        {!!otherTracks.length && <div className="grid grid-cols-2 gap-2">
          {otherTracks.map(track => <div key={track.name} className={`flex items-center gap-1.5 rounded-lg border p-2 ${selected === track.name ? "border-[#D2BA99]" : "border-[#554A40]"}`}>
            <button type="button" onClick={() => onSelect(track.name)} className="min-w-0 flex-1 truncate text-left text-[11px]">{track.name}</button>
            <button type="button" onClick={() => onSample(track.name)} aria-label={`Listen to ${track.name}`} className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[#78634E]"><Play className="size-3" /></button>
          </div>)}
        </div>}
        {slider("Voice volume", voiceVolume, "voice")}
        {slider("Music volume", musicVolume, "music")}
        <label className="flex items-center justify-between gap-3 text-[11px]">
          Automatically lower music while speaking
          <input type="checkbox" checked={mix.ducking} onChange={e => onSetMix({ ducking: e.target.checked })} className="size-4 accent-[#D2BA99]" />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" aria-pressed={mix.voiceMuted} onClick={() => onSetMix({ voiceMuted: !mix.voiceMuted })} className="keep-studio-secondary-action justify-center">{mix.voiceMuted ? "Unmute voice" : "Mute voice"}</button>
          <button type="button" aria-pressed={mix.musicMuted} onClick={() => onSetMix({ musicMuted: !mix.musicMuted })} className="keep-studio-secondary-action justify-center">{mix.musicMuted ? "Unmute music" : "Mute music"}</button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-[11px]">Fade in · {mix.fadeIn.toFixed(1)}s<input type="range" min={0.5} max={6} step={0.5} value={mix.fadeIn} onChange={e => onSetMix({ fadeIn: Number(e.target.value) })} className="mt-1 w-full accent-[#D2BA99]" /></label>
          <label className="text-[11px]">Fade out · {mix.fadeOut.toFixed(1)}s<input type="range" min={1} max={8} step={0.5} value={mix.fadeOut} onChange={e => onSetMix({ fadeOut: Number(e.target.value) })} className="mt-1 w-full accent-[#D2BA99]" /></label>
        </div>
      </div>
    </details>
  </section>;
}
