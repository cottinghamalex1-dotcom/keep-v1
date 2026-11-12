import { CinematicMedia } from "@/components/cinematic-media";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Volume2, VolumeX, Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createKeepVoiceMix, KEEP_MUSIC_LEAD_SECONDS, KEEP_MUSIC_TAIL_SECONDS, type MusicBalance } from "@/lib/keep-audio";
import type { AudioMix, CaptionCue } from "@/lib/keep-project";
import { captionAtTime } from "@/lib/keep-caption-timing";
import { sceneDuration, sceneIndexAt } from "@/lib/keep-film-timing";
import couple from "@/assets/memory-couple.jpg";
import home from "@/assets/memory-home.jpg";
import wedding from "@/assets/memory-wedding.jpg";
import travel from "@/assets/memory-travel.jpg";

export const memoryImages = [couple, wedding, travel, home, couple, travel, home, wedding, couple, home];
export const memoryLabels = ["The beginning", "Our wedding", "The places we've been", "The little things", "Us, always", "Another adventure", "Our family", "That day", "Everyday magic", "Home"];
const defaultLines = ["You make people feel at home.", "I still remember that day.", "Through every version of us.", "Then I got to watch you become a mom.", "I'd choose this life with you again."];

const styleSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export type PlayerMedia = { url: string; kind: "image" | "video"; displayDurationSec?: number | undefined; focusX?: number | undefined; focusY?: number | undefined; zoom?: number | undefined; motion?: "in" | "out" | "left" | "right" | undefined; transition?: "fade" | "dissolve" | "cut" | undefined };
type Props = {
  name: string; from: string; year: string; onExit: () => void; onFinish?: () => void; recipient?: boolean; skipIntro?: boolean; style?: string; captions?: string;
  subtitle?: string | undefined; media?: PlayerMedia[] | undefined; audioUrl?: string | undefined; audioDuration?: number | undefined; lines?: string[] | undefined;
  captionCues?: CaptionCue[] | undefined; musicMood?: string | undefined; voiceMusicBalance?: string | undefined; voiceVolume?: number | undefined; musicVolume?: number | undefined; captionPosition?: "top" | "middle" | "bottom" | undefined; captionLines?: number | undefined; audioMix?: AudioMix | undefined;
};

export function KeepPlayer({ name, from, year, onExit, onFinish, recipient = false, skipIntro = false, style = "Natural", captions = "Reel", subtitle, media, audioUrl, audioDuration, lines, captionCues = [], musicMood = "Warm + Nostalgic", voiceMusicBalance = "Balanced", voiceVolume = 60, musicVolume = 60, captionPosition = "bottom", captionLines = 2, audioMix }: Props) {
  const [scene, setScene] = useState(skipIntro ? 0 : -1);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [progress, setProgress] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [audioTime, setAudioTime] = useState(0);
  const [voiceStarted, setVoiceStarted] = useState(false);
  const voiceStartedRef = useRef(false);
  const introRemainingRef = useRef(KEEP_MUSIC_LEAD_SECONDS * 1000);
  const introTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const mix = useRef<ReturnType<typeof createKeepVoiceMix>>(null);
  const endingTimer = useRef<number | null>(null);
  const items: PlayerMedia[] = useMemo(() => media?.length ? media : memoryImages.map((url) => ({ url, kind: "image" as const })), [media]);
  const words = lines?.length ? lines : defaultLines;
  const end = audioUrl ? ended : scene >= 5;

  // skipIntro only skips the visual title reveal, not the musical introduction.
  const introSeconds = audioUrl ? KEEP_MUSIC_LEAD_SECONDS : (skipIntro ? 0 : 3.2);
  const targetSceneSeconds = sceneDuration(items, Math.max(0, scene), audioUrl ? audioDuration : undefined) || 7;
  // Without a recording, use per-photo timing. With voice, the actual audio
  // currentTime below is the single clock for pictures, captions and progress.
  useEffect(() => {
    if (!playing || end) return;
    if (scene === -1) {
      // With narration, the music/voice controller below owns this intro.
      if (audioUrl) return;
      const timer = window.setTimeout(() => setScene(0), introSeconds * 1000);
      return () => window.clearTimeout(timer);
    }
    if (audioUrl) return;
    const timer = window.setTimeout(() => setScene((current) => current + 1), Math.max(700, sceneDuration(items, scene) * 1000));
    return () => window.clearTimeout(timer);
  }, [scene, playing, end, audioUrl, items, introSeconds]);

  // Poll the audio's playback position at animation-frame cadence. Never run
  // an independent slideshow timer over a buffered or stalled recording.
  useEffect(() => {
    if (!audioUrl || !playing || end || scene < 0) return;
    let raf = 0;
    let lastPublished = -1;
    const tick = () => {
      const element = audio.current;
      if (element && !element.paused) {
        const time = element.currentTime;
        const duration = Number.isFinite(element.duration) && element.duration > 0 ? element.duration : (audioDuration || 1);
        // 10fps is ample precision for word captions, without re-rendering
        // every large photo on every animation frame on mobile Safari.
        if (lastPublished < 0 || Math.abs(time - lastPublished) >= 0.09) {
          lastPublished = time;
          setAudioTime(time);
          setProgress(Math.min(1, time / duration));
        }
        const index = sceneIndexAt(items, time, audioDuration || duration);
        setScene((current) => current === index ? current : index);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [audioUrl, playing, end, scene < 0, items, audioDuration]);

  useEffect(() => {
    const a = audio.current;
    if (!a || !audioUrl) return;
    const controller = createKeepVoiceMix(a, musicMood, (["Soft", "Balanced", "Full"].includes(voiceMusicBalance) ? voiceMusicBalance : "Balanced") as MusicBalance, audioDuration || 1, introSeconds, audioMix);
    mix.current = controller;
    controller?.setLevels(voiceVolume, musicVolume);
    if (controller) controller.setMuted(muted);
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
    let cancelled = false;
    let introStartedAt = 0;
    if (!playing || end) {
      a.pause();
      void mix.current?.pause();
      return;
    }
    const start = async () => {
      const controller = mix.current;
      // Starting music first is essential: the voice must never run ahead of
      // a slow-loading MP3 or a suspended iOS AudioContext.
      try {
        if (!controller) throw new Error("Music mixing is unavailable");
        await controller.play();
      } catch {
        if (!cancelled) setBlocked(true);
        return;
      }
      if (cancelled) return;
      setBlocked(false);
      if (voiceStartedRef.current) {
        // During the outro, the music continues after the audio element ends.
        if (!a.ended) void a.play().catch(() => { if (!cancelled) setBlocked(true); });
        return;
      }
      introStartedAt = performance.now();
      introTimerRef.current = window.setTimeout(() => {
        introTimerRef.current = null;
        if (cancelled) return;
        introRemainingRef.current = 0;
        voiceStartedRef.current = true;
        setVoiceStarted(true);
        setScene((current) => current < 0 ? 0 : current);
        void a.play().then(() => setBlocked(false)).catch(() => {
          // iOS may reject delayed audio.play(). Freeze the soundtrack's
          // envelope so it cannot run ahead of narration while we request a tap.
          void mix.current?.pause();
          if (!cancelled) setBlocked(true);
        });
      }, introRemainingRef.current);
    };
    void start();
    return () => {
      cancelled = true;
      if (introTimerRef.current) {
        window.clearTimeout(introTimerRef.current);
        introTimerRef.current = null;
        introRemainingRef.current = Math.max(0, introRemainingRef.current - (performance.now() - introStartedAt));
      }
    };
  }, [playing, end, audioUrl]);

  useEffect(() => { mix.current?.setMuted(muted); }, [muted]);
  useEffect(() => { mix.current?.setLevels(voiceVolume, musicVolume); }, [voiceVolume, musicVolume]);
  useEffect(() => { mix.current?.setTrackMutes(!!audioMix?.voiceMuted, !!audioMix?.musicMuted); }, [audioMix?.voiceMuted, audioMix?.musicMuted]);
  useEffect(() => { mix.current?.setVoiceTone(audioMix?.voiceTone ?? "natural"); }, [audioMix?.voiceTone]);

  const replay = () => {
    if (endingTimer.current) window.clearTimeout(endingTimer.current);
    endingTimer.current = null;
    if (introTimerRef.current) window.clearTimeout(introTimerRef.current);
    introTimerRef.current = null;
    voiceStartedRef.current = false;
    setVoiceStarted(false);
    introRemainingRef.current = KEEP_MUSIC_LEAD_SECONDS * 1000;
    audio.current?.pause();
    if (audio.current) audio.current.currentTime = 0;
    mix.current?.restartMusic(musicMood, (["Soft", "Balanced", "Full"].includes(voiceMusicBalance) ? voiceMusicBalance : "Balanced") as MusicBalance, audioMix);
    setScene(skipIntro ? 0 : -1);
    setEnded(false);
    setPlaying(true);
    setBlocked(false);
    setProgress(0);
    setAudioTime(0);
  };
  const resumeAudio = () => {
    // Directly unlock the audio context from the user's tap on iOS.
    const controller = mix.current;
    if (!controller) {
      // An older browser without Web Audio must still be able to hear its Keep.
      voiceStartedRef.current = true;
      setVoiceStarted(true);
      setScene((current) => current < 0 ? 0 : current);
      void audio.current?.play().then(() => setBlocked(false)).catch(() => setBlocked(true));
      return;
    }
    void controller.play().then(() => {
      setBlocked(false);
      if (voiceStartedRef.current) {
        void audio.current?.play().catch(() => setBlocked(true));
      } else {
        setPlaying(false);
        requestAnimationFrame(() => setPlaying(true));
      }
    }).catch(() => setBlocked(true));
  };
  const item = scene >= 0 ? items[Math.min(scene, items.length - 1)] : undefined;
  const nextItem = scene >= 0 ? items[scene + 1] : undefined;
  const activeCue = captionAtTime(captionCues, audioTime);
  const captionText = activeCue?.text || (!captionCues.length && scene >= 0 ? words[scene % words.length] : "");

  return <div className="relative keep-h-screen min-h-0 w-full overflow-hidden bg-background text-foreground">
    {audioUrl && <audio ref={audio} crossOrigin="anonymous" src={audioUrl} playsInline preload="auto" onEnded={() => { if (endingTimer.current) window.clearTimeout(endingTimer.current); endingTimer.current = window.setTimeout(() => setEnded(true), KEEP_MUSIC_TAIL_SECONDS * 1000); }} onTimeUpdate={(e) => { const a = e.currentTarget; const d = Number.isFinite(a.duration) && a.duration > 0 ? a.duration : audioDuration || 1; setAudioTime(a.currentTime); setProgress(Math.min(1, a.currentTime / d)); setScene((current) => { const index = sceneIndexAt(items, a.currentTime, audioDuration || d); return current < 0 || current === index ? current : index; }); }} />}
    {item && !end && <><CinematicMedia item={item} nextItem={nextItem} sceneKey={scene} motionIndex={scene} playing={playing && (!audioUrl || voiceStarted)} duration={targetSceneSeconds} className="absolute inset-0" imageClassName={`editor-image-${styleSlug(style)}`} /><div className="pointer-events-none absolute inset-0 photo-shade" /></>}
    {scene === -1 && <div className="cinematic-intro absolute inset-0 flex flex-col items-center justify-center px-7 text-center"><div className="cinematic-glow absolute inset-0" /><div className="relative"><div className="eyebrow mb-6 text-foreground/55">FOR</div><h1 className="display px-6 text-[clamp(58px,17vw,82px)] uppercase">{name}</h1><div className="mx-auto mt-8 h-px w-10 bg-accent/65" /><p className="mt-7 text-xs tracking-wide text-muted-foreground">from {from} · {year}{subtitle ? ` · ${subtitle}` : ""}</p></div></div>}
    {end && <div className="cinematic-ending absolute inset-0 flex flex-col items-center justify-center px-8 text-center"><div className="cinematic-glow absolute inset-0" /><div className="relative"><div className="mx-auto mb-10 h-px w-10 bg-accent/65" /><h1 className="display text-[clamp(46px,12vw,60px)]">Some things are<br />worth keeping.</h1><p className="mx-auto mt-7 max-w-64 text-sm leading-6 text-muted-foreground">{recipient ? "This one is yours." : "Your Keep is ready."}</p><div className="mt-12 flex w-full max-w-65 flex-col gap-3"><Button variant="keep" size="touch" onClick={recipient && onFinish ? onFinish : replay}>{recipient ? "Keep this close" : <><RotateCcw /> Replay</>}</Button>{recipient ? <Button variant="quiet" size="touch" onClick={replay}><RotateCcw /> Replay</Button> : <><Button variant="quiet" size="touch" onClick={onExit}>Make Changes</Button><Button variant="bare" size="touch" onClick={onFinish}>Finish Keep →</Button></>}</div></div></div>}
    {blocked && !end && <div className="absolute inset-x-0 bottom-24 z-40 flex justify-center px-6">
      <Button variant="keep" size="touch" onClick={resumeAudio}><Volume2 /> Tap to start your Keep</Button>
    </div>}
    {!end && <><div className="absolute left-0 right-0 top-0 z-10 px-5 pt-[max(24px,env(safe-area-inset-top))]"><div className="mb-5 flex gap-1">{audioUrl ? <div className="h-[2px] flex-1 bg-foreground/30"><div className="h-full bg-foreground transition-[width] duration-300" style={{ width: `${progress * 100}%` }} /></div> : Array.from({ length: 6 }, (_, i) => <div key={i} className={`h-[2px] flex-1 ${scene + 1 >= i ? "bg-foreground" : "bg-foreground/30"}`} />)}</div><div className="flex items-center justify-between"><Button variant="bare" size="icon" aria-label="Exit preview" onClick={onExit}><ArrowLeft /></Button><span className="brand text-base">Keep</span><Button variant="bare" size="icon" aria-label={muted ? "Unmute" : "Mute"} onClick={() => setMuted(!muted)}>{muted ? <VolumeX /> : <Volume2 />}</Button></div></div>{scene >= 0 && <div className={`absolute left-7 right-7 text-center ${captionPosition === "top" ? "top-28" : captionPosition === "middle" ? "top-1/2 -translate-y-1/2" : "bottom-28"}`}>{!media?.length && <div className="eyebrow mb-5 text-foreground/80">{memoryLabels[scene % memoryLabels.length]}</div>}{captions !== "None" && captionText && <p key={activeCue?.start ?? scene} className={`caption-enter keep-caption-visible mx-auto max-w-sm leading-snug ${captions === "Film" ? "font-display text-4xl font-normal" : captions === "Story" ? "font-display text-3xl italic" : captions === "Minimal" ? "text-xl font-normal" : captions === "Clean" ? "text-2xl font-medium" : "text-2xl font-semibold"}`} style={{ maxWidth: captionLines === 1 ? "95%" : captionLines === 3 ? "65%" : "80%", whiteSpace: "pre-line", marginInline: "auto" }}>{captionText}</p>}</div>}<div className="absolute bottom-[max(24px,env(safe-area-inset-bottom))] left-0 right-0 flex justify-center"><Button variant="bare" size="icon" aria-label={playing ? "Pause" : "Play"} onClick={() => setPlaying(!playing)}>{playing ? <Pause fill="currentColor" /> : <Play fill="currentColor" />}</Button></div></>}
  </div>;
}
