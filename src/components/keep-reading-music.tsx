import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";
import { MUSIC_FILES } from "@/lib/keep-audio";

type Props = { musicMood: string };

/** A Web Audio gain controls Read music on iPhone, where mediaElement.volume is ignored. */
export function KeepReadingMusic({ musicMood }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(40);
  const [error, setError] = useState("");
  const track = MUSIC_FILES[musicMood === "Worth Keeping" ? "Intentional" : musicMood] ?? MUSIC_FILES["Warm + Nostalgic"]!;

  // Audio element volume is fixed on iOS Safari. Route it through a GainNode,
  // created only after a user gesture to comply with iPhone audio permissions.
  const ensureGain = () => {
    if (contextRef.current) return contextRef.current;
    const audio = audioRef.current;
    if (!audio) return null;
    const AudioContextClass = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    let context: AudioContext | null = null;
    try {
      context = new AudioContextClass();
      const source = context.createMediaElementSource(audio);
      const gain = context.createGain();
      gain.gain.value = volume / 100;
      source.connect(gain);
      gain.connect(context.destination);
      audio.volume = 1; // The GainNode, not the element, is the volume control.
      contextRef.current = context;
      gainRef.current = gain;
      return context;
    } catch {
      if (context) void context.close();
      return null;
    }
  };

  useEffect(() => {
    const audio = audioRef.current;
    const context = contextRef.current;
    const gain = gainRef.current;
    if (context && gain) {
      gain.gain.setTargetAtTime(volume / 100, context.currentTime, 0.015);
    } else if (audio) {
      audio.volume = volume / 100; // Desktop/legacy fallback.
    }
  }, [volume]);

  useEffect(() => () => {
    audioRef.current?.pause();
    gainRef.current?.disconnect();
    gainRef.current = null;
    const context = contextRef.current;
    contextRef.current = null;
    if (context) void context.close();
  }, []);

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) { audio.pause(); return; }
    setError("");
    const context = ensureGain();
    try {
      // Both are invoked synchronously in the tap handler, before awaiting.
      const resume = context?.resume();
      const play = audio.play();
      await Promise.all([resume, play]);
      setPlaying(true);
    } catch {
      audio.pause();
      setPlaying(false);
      setError("The music couldn't start. Tap play again, or check your device sound.");
    }
  };

  return <section className="mx-auto mt-9 w-full max-w-[450px] rounded-[18px] border border-[#D8C9B7] bg-[#FFFCF8] px-4 py-4 text-left shadow-[0_12px_28px_rgba(46,33,21,.045)]" aria-label="Optional background music">
    <audio ref={audioRef} src={track} loop preload="none" onEnded={() => setPlaying(false)}
      onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)}
      onError={() => setError("This soundtrack could not load. Please try again.")} />
    <div className="flex items-center gap-3">
      <button type="button" aria-label={playing ? "Pause background music" : "Play background music"}
        onClick={() => void toggle()}
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#28221D] text-white">
        {playing ? <Pause className="size-4" fill="currentColor" /> : <Play className="ml-0.5 size-4" fill="currentColor" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#88725D]">SET THE MOOD</p>
        <p className="mt-1 truncate font-display text-[20px] text-[#2B251F]">{musicMood === "Worth Keeping" ? "Intentional" : musicMood}</p>
        <p className="mt-1 text-[10px] leading-4 text-[#877A6D]">Instrumental only · Voice off · Optional</p>
      </div>
    </div>
    <label className="mt-4 flex items-center gap-3 text-xs text-[#6B5A49]">
      {volume === 0 ? <VolumeX className="size-4 shrink-0" /> : <Volume2 className="size-4 shrink-0" />}
      <span className="sr-only">Background music volume</span>
      <input type="range" min="0" max="100" step="5" value={volume}
        aria-label="Background music volume" onChange={e => setVolume(Number(e.target.value))}
        className="h-2 w-full accent-[#796149]" />
      <span className="w-8 text-right tabular-nums">{volume}%</span>
    </label>
    {error && <p className="mt-3 text-xs text-[#9B3529]" role="alert">{error}</p>}
  </section>;
}
