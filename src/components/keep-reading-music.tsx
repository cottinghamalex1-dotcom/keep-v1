import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { MUSIC_FILES } from "@/lib/keep-audio";

type Props = { musicMood: string };

/** Recipient-controlled instrumental bed in Read mode, without narration. */
export function KeepReadingMusic({ musicMood }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing,setPlaying] = useState(false);
  const [volume,setVolume] = useState(40);
  const track = MUSIC_FILES[musicMood === "Worth Keeping" ? "Intentional" : musicMood] ?? MUSIC_FILES["Warm + Nostalgic"]!;
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume=volume/100;
  },[volume]);
  useEffect(() => () => { audioRef.current?.pause(); },[]);
  const toggle = async () => {
    const audio=audioRef.current;
    if (!audio) return;
    if (!audio.paused) { audio.pause(); setPlaying(false); return; }
    try { await audio.play(); setPlaying(true); }
    catch { setPlaying(false); }
  };
  return <section className="mx-auto mt-9 w-full max-w-[450px] rounded-[18px] border border-[#D8C9B7] bg-[#FFFCF8] px-4 py-4 text-left shadow-[0_12px_28px_rgba(46,33,21,.045)]" aria-label="Optional background music">
    <audio ref={audioRef} src={track} loop preload="none" onEnded={() => setPlaying(false)} onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />
    <div className="flex items-center gap-3">
      <button type="button" aria-label={playing ? "Pause background music" : "Play background music"} onClick={() => void toggle()} className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#28221D] text-white">
        {playing ? <Pause className="size-4" fill="currentColor"/> : <Play className="ml-0.5 size-4" fill="currentColor"/>}
      </button>
      <div className="min-w-0 flex-1"><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#88725D]">SET THE MOOD</p>
        <p className="mt-1 truncate font-display text-[20px] text-[#2B251F]">{musicMood === "Worth Keeping" ? "Intentional" : musicMood}</p>
        <p className="mt-1 text-[10px] leading-4 text-[#877A6D]">Instrumental only · Voice off · Optional</p>
      </div>
    </div>
    <label className="mt-4 flex items-center gap-3 text-xs text-[#6B5A49]">
      {volume===0 ? <VolumeX className="size-4 shrink-0"/> : <Volume2 className="size-4 shrink-0"/>}
      <span className="sr-only">Background music volume</span>
      <input type="range" min="0" max="100" step="5" value={volume} aria-label="Background music volume" onChange={e=>setVolume(Number(e.target.value))} className="h-2 w-full accent-[#796149]"/>
      <span className="w-8 text-right tabular-nums">{volume}%</span>
    </label>
  </section>;
}
