import { useState } from "react";
import { Check, ChevronDown, Music2, Play, Square, Volume2, VolumeX, X } from "lucide-react";
import type { AudioMix } from "@/lib/keep-project";

type Track = { name: string; note: string; group: string };
type Props = {
  tracks: Track[];
  selected: string;
  sampling: string;
  voiceVolume: number;
  musicVolume: number;
  mix: AudioMix;
  onClose: () => void;
  onSample: (name: string) => void;
  onSelect: (name: string) => void;
  onSetVolume: (track: "voice" | "music", value: number) => void;
  onSetMix: (change: Partial<AudioMix>) => void;
  onHearWithVoice: () => void;
};

export function KeepMusicEditor({ tracks, selected, sampling, voiceVolume, musicVolume, mix,
  onClose, onSample, onSelect, onSetVolume, onSetMix, onHearWithVoice }: Props) {
  const [showAll, setShowAll] = useState(false);
  const [showMix, setShowMix] = useState(false);
  const featured = tracks.slice(0, 3);
  const selectedTrack = tracks.find(t => t.name === selected);
  if (selectedTrack && !featured.some(t => t.name === selectedTrack.name)) featured.push(selectedTrack);
  const additional = tracks.filter(t => !featured.some(f => f.name === t.name));
  const row = (track: Track) => {
    const active = track.name === selected;
    const playing = track.name === sampling;
    return <div key={track.name} className={`flex min-w-0 items-center gap-2.5 rounded-xl border px-3 py-3 transition-colors ${active ? "border-[#C6B49A] bg-[#272522]" : "border-[#403D3C] bg-[#222123]"}`}>
      <button type="button" onClick={() => onSample(track.name)}
        aria-label={`${playing ? "Stop" : "Preview"} ${track.name}`}
        className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[#57514F] bg-[#171719] text-[#F7F5F2]">
        {playing ? <Square className="size-4" fill="currentColor" /> : <Play className="ml-0.5 size-4" fill="currentColor" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[14px] font-medium leading-5 text-[#F7F5F2]">{track.name}</p>
        <p className="mt-1 line-clamp-2 text-[11px] leading-[1.35] text-[#B8B3B0]">{track.note}</p>
      </div>
      <button type="button" onClick={() => onSelect(track.name)} aria-pressed={active}
        className={`flex min-h-10 shrink-0 items-center gap-1 rounded-lg border px-3 text-[12px] font-medium ${active ? "border-[#E8E1D7] bg-[#E8E1D7] text-[#171618]" : "border-[#57514F] text-[#F7F5F2]"}`}>
        {active ? <><Check className="size-3.5" /> Added</> : "Use"}
      </button>
    </div>;
  };
  const slider = (label: string, value: number, track: "voice" | "music") => <label className="block">
    <span className="mb-2 flex items-center justify-between gap-2 text-[12px]">
      <span className="font-medium">{label}</span>
      <output className="tabular-nums text-[#D2BA99]">{value}%</output>
    </span>
    <input type="range" min={0} max={100} step={1} value={value}
      onChange={(e) => onSetVolume(track, Number(e.target.value))}
      className="w-full accent-[#D2BA99]" aria-label={label} />
  </label>;
  return <section className="keep-music-editor p-4 sm:p-5" aria-label="Music editor">
    <div className="flex items-start justify-between gap-3">
      <div><h2 className="font-display text-[28px] leading-8">Music</h2>
        <p className="mt-1 text-xs leading-5 text-[#B8B3B0]">Find a sound that fits your story.</p>
      </div>
      <button type="button" aria-label="Close music" onClick={onClose}
        className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#4D4848]"><X className="size-4" /></button>
    </div>

    <div className="mt-5 flex items-center justify-between gap-3">
      <span className="text-[11px] font-medium tracking-[.08em] uppercase text-[#B8B3B0]">Choose a soundtrack</span>
      <span className="text-[11px] text-[#D2BA99]">Tap <Play className="inline size-3" fill="currentColor" /> to listen</span>
    </div>
    <div className="mt-3 space-y-2">{featured.map(row)}</div>
    {!!additional.length && <>
      <button type="button" className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#494547] text-xs font-medium text-[#E8E1D7]"
        onClick={() => setShowAll(x => !x)} aria-expanded={showAll}>
        {showAll ? "Show fewer sounds" : `Explore ${additional.length} more sounds`}
        <ChevronDown className={`size-4 transition-transform ${showAll ? "rotate-180" : ""}`} />
      </button>
      {showAll && <div className="mt-2 space-y-2">{additional.map(row)}</div>}
    </>}

    <div className="mt-4 rounded-xl border border-[#494547] bg-[#201F21] p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0"><p className="text-xs text-[#B8B3B0]">In your Keep</p><p className="mt-1 truncate text-sm font-medium">{selected}</p></div>
        <button type="button" onClick={onHearWithVoice} className="flex min-h-10 shrink-0 items-center gap-2 rounded-lg bg-[#E8E1D7] px-3 text-xs font-semibold text-[#181719]"><Play className="size-3.5" fill="currentColor" />Hear together</button>
      </div>
      <p className="mt-2 text-[11px] leading-4 text-[#ADA8A6]">Preview this music with your voice in the video above.</p>
    </div>

    <button type="button" onClick={() => setShowMix(x => !x)} aria-expanded={showMix}
      className="mt-4 flex min-h-11 w-full items-center justify-between border-t border-[#403D3C] pt-3 text-left text-sm font-medium">
      <span className="inline-flex items-center gap-2"><Volume2 className="size-4 text-[#D2BA99]" /> Adjust music & voice</span>
      <ChevronDown className={`size-4 transition-transform ${showMix ? "rotate-180" : ""}`} />
    </button>
    {showMix && <div className="mt-3 space-y-5 rounded-xl border border-[#494547] bg-[#222123] p-4">
      {slider("Voice volume",voiceVolume,"voice")}
      {slider("Music volume",musicVolume,"music")}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onSetMix({voiceMuted: !mix.voiceMuted})} aria-pressed={mix.voiceMuted} className="min-h-10 rounded-lg border border-[#5C5454] px-2 text-xs">{mix.voiceMuted ? "Unmute voice" : "Mute voice"}</button>
        <button type="button" onClick={() => onSetMix({musicMuted: !mix.musicMuted})} aria-pressed={mix.musicMuted} className="min-h-10 rounded-lg border border-[#5C5454] px-2 text-xs">{mix.musicMuted ? "Unmute music" : "Mute music"}</button>
      </div>
      <label className="flex items-center justify-between gap-3 text-xs">
        <span><span className="block font-medium">Lower music when speaking</span><span className="mt-1 block text-[11px] text-[#ADA8A6]">Keep your words easy to hear.</span></span>
        <input type="checkbox" checked={mix.ducking} onChange={(e) => onSetMix({ducking:e.target.checked})} className="size-5 accent-[#E8E1D7]" />
      </label>
      <div className="grid grid-cols-2 gap-4">
        <label className="text-xs">Fade in · {mix.fadeIn.toFixed(1)}s<input type="range" min={.5} max={6} step={.5} value={mix.fadeIn} onChange={(e)=>onSetMix({fadeIn:Number(e.target.value)})} className="mt-2 w-full accent-[#D2BA99]" /></label>
        <label className="text-xs">Fade out · {mix.fadeOut.toFixed(1)}s<input type="range" min={1} max={8} step={.5} value={mix.fadeOut} onChange={(e)=>onSetMix({fadeOut:Number(e.target.value)})} className="mt-2 w-full accent-[#D2BA99]" /></label>
      </div>
      <p className="text-[11px] leading-4 text-[#ADA8A6]">Changing fades or ducking restarts the music bed in the preview.</p>
    </div>}
  </section>;
}
