import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Volume2, VolumeX, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createKeepVoiceMix, type MusicBalance } from "@/lib/keep-audio";
import type { CaptionCue } from "@/lib/keep-project";
import couple from "@/assets/memory-couple.jpg";
import home from "@/assets/memory-home.jpg";
import wedding from "@/assets/memory-wedding.jpg";
import travel from "@/assets/memory-travel.jpg";

export const memoryImages = [couple, wedding, travel, home, couple, travel, home, wedding, couple, home];
export const memoryLabels = ["The beginning", "Our wedding", "The places we've been", "The little things", "Us, always", "Another adventure", "Our family", "That day", "Everyday magic", "Home"];
const defaultLines = ["You make people feel at home.", "I still remember that day.", "Through every version of us.", "Then I got to watch you become a mom.", "I'd choose this life with you again."];

const styleSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export type PlayerMedia = { url: string; kind: "image" | "video"; displayDurationSec?: number };
type Props = {
  name: string; from: string; year: string; onExit: () => void; onFinish?: () => void; recipient?: boolean; style?: string; captions?: string;
  subtitle?: string | undefined; media?: PlayerMedia[] | undefined; audioUrl?: string | undefined; audioDuration?: number | undefined; lines?: string[] | undefined;
  captionCues?: CaptionCue[] | undefined; musicMood?: string | undefined; voiceMusicBalance?: string | undefined;
};

export function KeepPlayer({ name, from, year, onExit, onFinish, recipient = false, style = "Natural", captions = "Reel", subtitle, media, audioUrl, audioDuration, lines, captionCues = [], musicMood = "Warm + Nostalgic", voiceMusicBalance = "Balanced" }: Props) {
  const [scene, setScene] = useState(-1);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [audioTime, setAudioTime] = useState(0);
  const audio = useRef<HTMLAudioElement>(null);
  const mix = useRef<ReturnType<typeof createKeepVoiceMix>>(null);
  const endingTimer = useRef<number | null>(null);
  const items: PlayerMedia[] = media?.length ? media : memoryImages.map((url) => ({ url, kind: "image" }));
  const words = lines?.length ? lines : defaultLines;
  const end = audioUrl ? ended : scene >= 5;

  useEffect(() => {
    if (!playing || end) return;
    const delay = scene === -1
      ? 3200
      : Math.max(1, items[scene % items.length]?.displayDurationSec ?? 4) * 1000;
    const timer = window.setTimeout(() => setScene((s) => s + 1), delay);
    return () => window.clearTimeout(timer);
  }, [scene, playing, end, media]);

  useEffect(() => {
    const a = audio.current;
    if (!a || !audioUrl) return;
    const controller = createKeepVoiceMix(a, musicMood, (["Soft", "Balanced", "Full"].includes(voiceMusicBalance) ? voiceMusicBalance : "Balanced") as MusicBalance, audioDuration || 1);
    mix.current = controller;
    if (controller) {
      controller.setMuted(muted);
      void controller.play().catch(() => setBlocked(true));
    }
    return () => {
      if (endingTimer.current) window.clearTimeout(endingTimer.current);
      endingTimer.current = null;
      void controller?.stop();
      mix.current = null;
    };
  }, [audioUrl, audioDuration]);

  useEffect(() => {
    if (!mix.current) return;
    mix.current.restartMusic(musicMood, (["Soft", "Balanced", "Full"].includes(voiceMusicBalance) ? voiceMusicBalance : "Balanced") as MusicBalance);
  }, [musicMood, voiceMusicBalance]);

  useEffect(() => {
    const a = audio.current;
    if (!a || !audioUrl) return;
    if (playing && !end) {
      const controller = mix.current;
      if (controller) void controller.play().catch(() => setBlocked(true));
      if (scene >= 0) a.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
      else a.pause();
    } else {
      a.pause();
      const controller = mix.current;
      if (controller) void controller.pause();
    }
  }, [scene >= 0, playing, end, audioUrl]);

  useEffect(() => { mix.current?.setMuted(muted); }, [muted]);

  const replay = () => { if (endingTimer.current) window.clearTimeout(endingTimer.current); endingTimer.current = null; setScene(-1); setEnded(false); setPlaying(true); setProgress(0); setAudioTime(0); if (audio.current) audio.current.currentTime = 0; mix.current?.restartMusic(musicMood, (["Soft", "Balanced", "Full"].includes(voiceMusicBalance) ? voiceMusicBalance : "Balanced") as MusicBalance); };
  const item = scene >= 0 ? items[scene % items.length] : undefined;
  const activeCue = captionCues.find((cue) => audioTime >= cue.start && audioTime <= cue.end + 0.12);
  const captionText = activeCue?.text || (!captionCues.length && scene >= 0 ? words[scene % words.length] : "");

  return <div className="relative keep-h-screen min-h-0 w-full overflow-hidden bg-background text-foreground">
    {audioUrl && <audio ref={audio} src={audioUrl} playsInline preload="auto" onEnded={() => { if (endingTimer.current) window.clearTimeout(endingTimer.current); endingTimer.current = window.setTimeout(() => setEnded(true), 3200); }} onTimeUpdate={(e) => { const a = e.currentTarget; const d = Number.isFinite(a.duration) && a.duration > 0 ? a.duration : audioDuration || 1; setAudioTime(a.currentTime); setProgress(Math.min(1, a.currentTime / d)); }} />}
    {item && !end && <div key={scene} className="absolute inset-0 overflow-hidden">{item.kind === "video" ? <video src={item.url} autoPlay muted loop playsInline className={`h-full w-full object-cover editor-image-${styleSlug(style)}`} /> : <img src={item.url} alt="Memory photograph" className={`h-full w-full object-cover ken-burns editor-image-${styleSlug(style)}`} />}<div className="absolute inset-0 photo-shade" /></div>}
    {scene === -1 && <div className="cinematic-intro absolute inset-0 flex flex-col items-center justify-center px-7 text-center"><div className="cinematic-glow absolute inset-0" /><div className="relative"><div className="eyebrow mb-6 text-foreground/55">FOR</div><h1 className="display px-6 text-[clamp(58px,17vw,82px)] uppercase">{name}</h1><div className="mx-auto mt-8 h-px w-10 bg-accent/65" /><p className="mt-7 text-xs tracking-wide text-muted-foreground">from {from} · {year}{subtitle ? ` · ${subtitle}` : ""}</p></div></div>}
    {end && <div className="cinematic-ending absolute inset-0 flex flex-col items-center justify-center px-8 text-center"><div className="cinematic-glow absolute inset-0" /><div className="relative"><div className="mx-auto mb-10 h-px w-10 bg-accent/65" /><h1 className="display text-[clamp(46px,12vw,60px)]">Some things are<br />worth keeping.</h1><p className="mx-auto mt-7 max-w-64 text-sm leading-6 text-muted-foreground">{recipient ? "This one is yours." : "Your Keep is ready."}</p><div className="mt-12 flex w-full max-w-65 flex-col gap-3"><Button variant="keep" size="touch" onClick={recipient && onFinish ? onFinish : replay}>{recipient ? "Keep this close" : <><RotateCcw /> Replay</>}</Button>{recipient ? <Button variant="quiet" size="touch" onClick={replay}><RotateCcw /> Replay</Button> : <><Button variant="quiet" size="touch" onClick={onExit}>Make Changes</Button><Button variant="bare" size="touch" onClick={onFinish}>Finish Keep →</Button></>}</div></div></div>}
    {!end && <><div className="absolute left-0 right-0 top-0 z-10 px-5 pt-[max(24px,env(safe-area-inset-top))]"><div className="mb-5 flex gap-1">{audioUrl ? <div className="h-[2px] flex-1 bg-foreground/30"><div className="h-full bg-foreground transition-[width] duration-300" style={{ width: `${progress * 100}%` }} /></div> : Array.from({ length: 6 }, (_, i) => <div key={i} className={`h-[2px] flex-1 ${scene + 1 >= i ? "bg-foreground" : "bg-foreground/30"}`} />)}</div><div className="flex items-center justify-between"><Button variant="bare" size="icon" aria-label="Exit preview" onClick={onExit}><ArrowLeft /></Button><span className="brand text-base">KEEP</span><Button variant="bare" size="icon" aria-label={muted ? "Unmute" : "Mute"} onClick={() => setMuted(!muted)}>{muted ? <VolumeX /> : <Volume2 />}</Button></div></div>{scene >= 0 && <div className="absolute bottom-28 left-7 right-7 text-center">{!media?.length && <div className="eyebrow mb-5 text-foreground/80">{memoryLabels[scene % memoryLabels.length]}</div>}{captions !== "None" && captionText && <p key={activeCue?.start ?? scene} className={`caption-enter mx-auto max-w-sm leading-snug ${captions === "Film" ? "font-display text-4xl font-normal" : captions === "Story" ? "font-display text-3xl italic" : captions === "Minimal" ? "text-xl font-normal" : captions === "Clean" ? "text-2xl font-medium" : "text-2xl font-semibold"}`}>{captionText}</p>}{blocked && <Button variant="quiet" className="mt-5" onClick={() => audio.current?.play().then(() => setBlocked(false)).catch(() => undefined)}><Volume2 /> Tap to hear your voice</Button>}</div>}<div className="absolute bottom-[max(24px,env(safe-area-inset-bottom))] left-0 right-0 flex justify-center"><Button variant="bare" size="icon" aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying(!playing)}>{playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}</Button></div></>}
  </div>;
}
