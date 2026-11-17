import { CinematicMedia } from "@/components/cinematic-media";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Volume2, VolumeX, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createKeepVoiceMix, KEEP_MUSIC_LEAD_SECONDS, KEEP_MUSIC_TAIL_SECONDS, type MusicBalance } from "@/lib/keep-audio";
import type { AudioMix, CaptionCue } from "@/lib/keep-project";
import { captionAtTime, recoverCaptionTiming } from "@/lib/keep-caption-timing";
import { filmTotal, sceneDuration, sceneElapsed as filmSceneElapsed, sceneIndexAt } from "@/lib/keep-film-timing";
import { keepOpeningLeadSeconds } from "@/lib/keep-opening-timing";
import couple from "@/assets/memory-couple.jpg";
import home from "@/assets/memory-home.jpg";
import wedding from "@/assets/memory-wedding.jpg";
import travel from "@/assets/memory-travel.jpg";

export const memoryImages = [couple, wedding, travel, home, couple, travel, home, wedding, couple, home];
export const memoryLabels = ["The beginning", "Our wedding", "The places we've been", "The little things", "Us, always", "Another adventure", "Our family", "That day", "Everyday magic", "Home"];
const defaultLines = ["You make people feel at home.", "I still remember that day.", "Through every version of us.", "Then I got to watch you become a mom.", "I'd choose this life with you again."];

const styleSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export type PlayerMedia = { url: string; kind: "image" | "video"; isSelfie?: boolean | undefined; videoStartSec?: number | undefined; displayDurationSec?: number | undefined; focusX?: number | undefined; focusY?: number | undefined; zoom?: number | undefined; motion?: "in" | "out" | "left" | "right" | undefined; transition?: "fade" | "dissolve" | "cut" | undefined };
type Props = {
  name: string; from: string; year: string; onExit: () => void; onFinish?: () => void; recipient?: boolean; style?: string; captions?: string;
  subtitle?: string | undefined; openingMessage?: string | undefined; closingLine?: string | undefined; media?: PlayerMedia[] | undefined; audioUrl?: string | undefined; audioDuration?: number | undefined; lines?: string[] | undefined;
  captionCues?: CaptionCue[] | undefined; musicMood?: string | undefined; voiceMusicBalance?: string | undefined; voiceVolume?: number | undefined; musicVolume?: number | undefined; captionPosition?: "top" | "middle" | "bottom" | undefined; captionLines?: number | undefined; audioMix?: AudioMix | undefined;
  /** Notify the recipient experience once the first real photo/video frame can be displayed. */
  onOpeningFrameReady?: (() => void) | undefined;
};

export function KeepPlayer({ name, from, year, onExit, onFinish, recipient = false, style = "Natural", captions = "Reel", subtitle, openingMessage, closingLine, media, audioUrl, audioDuration, lines, captionCues = [], musicMood = "Warm + Nostalgic", voiceMusicBalance = "Balanced", voiceVolume = 60, musicVolume = 60, captionPosition = "bottom", captionLines = 2, audioMix, onOpeningFrameReady }: Props) {
  const cinematicOpening = !!recipient && !!audioUrl;
  const introSeconds = audioUrl ? keepOpeningLeadSeconds(openingMessage, cinematicOpening) : 0;
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [audioTime, setAudioTime] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [masterDuration, setMasterDuration] = useState(audioDuration);
  const [voiceStarted, setVoiceStarted] = useState(false);
  const [openingMusicStarted, setOpeningMusicStarted] = useState(false);
  const [voiceEnded, setVoiceEnded] = useState(false);
  const [silentClosing, setSilentClosing] = useState(false);
  const [voiceBuffering, setVoiceBuffering] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [mediaReady, setMediaReady] = useState(false);
  const controlsTimer = useRef<number | null>(null);
  const finishSent = useRef(false);
  const voiceStartedRef = useRef(false);
  const introRemainingRef = useRef(introSeconds * 1000);
  const introStartedAtRef = useRef(0);
  const silentElapsedRef = useRef(0);
  const introTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const mix = useRef<ReturnType<typeof createKeepVoiceMix>>(null);
  const endingTimer = useRef<number | null>(null);
  const tailRemainingRef = useRef(KEEP_MUSIC_TAIL_SECONDS*1000);
  const tailStartedAtRef = useRef(0);
  // Parent/editor updates may recreate the media array without changing a frame.
  // Keep image layers and decode warmups stable across those unrelated rerenders.
  const mediaFingerprint = JSON.stringify(media ?? []);
  const items: PlayerMedia[] = useMemo(() => media?.length ? media : memoryImages.map((url) => ({ url, kind: "image" as const })), [mediaFingerprint]);
  const words = lines?.length ? lines : defaultLines;
  // Older published Keeps may have provider timestamps that are in range but unusable.
  // Fix playback timing without changing their narration or caption text.
  const playbackCues = useMemo(() => recoverCaptionTiming([], captionCues, masterDuration || audioDuration || 0).cues, [captionCues, masterDuration, audioDuration]);
  const closing = voiceEnded || silentClosing;
  const end = finishSent.current; // Hold the final frame underneath the farewell until completion.

  // Preload the real first frame behind the dark dedication so it can dissolve
  // into photography without showing an empty screen or interrupting audio.
  useEffect(() => {
    if (mediaReady) onOpeningFrameReady?.();
  }, [mediaReady, onOpeningFrameReady]);

  // The actual on-screen media owns readiness. Previously this component
  // decoded three large photos in addition to CinematicMedia's warmups, which
  // kept duplicate full-resolution frames in Safari memory for the entire film.
  // Wait for CinematicMedia to confirm the visible first frame instead.
  useEffect(() => { setMediaReady(false); }, [items]);

  const showControls = () => {
    setControlsVisible(true);
    if (controlsTimer.current !== null) window.clearTimeout(controlsTimer.current);
    if (playing && !end) controlsTimer.current = window.setTimeout(() => {
      setControlsVisible(false);
      controlsTimer.current = null;
    }, 2200);
  };
  useEffect(() => {
    if (controlsTimer.current !== null) window.clearTimeout(controlsTimer.current);
    if (playing && !end) {
      controlsTimer.current = window.setTimeout(() => {
        setControlsVisible(false);
        controlsTimer.current = null;
      }, 2200);
    } else setControlsVisible(true);
    return () => {
      if (controlsTimer.current !== null) window.clearTimeout(controlsTimer.current);
      controlsTimer.current = null;
    };
  }, [playing, end]);

  // A phone call or backgrounded Safari must not let a hidden video/soundtrack
  // run ahead. Resume only when the recipient presses Play again.
  useEffect(()=>{
    const onHide=()=>{if(document.hidden)setPlaying(false);};
    document.addEventListener("visibilitychange",onHide);
    return ()=>document.removeEventListener("visibilitychange",onHide);
  },[]);

  // The last image is held beneath a dark farewell. The final page must
  // never abruptly replace the last frame, even for photo-only Keeps.
  useEffect(() => {
    if (audioUrl || !silentClosing || !playing || finishSent.current) return;
    const timer = window.setTimeout(() => {
      if (finishSent.current) return;
      finishSent.current = true;
      onFinish?.();
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [audioUrl, silentClosing, playing, onFinish]);

  // Editor-only viewing retains its original lead-in; recipient viewing uses
  // a quiet dark dedication that lasts long enough to read.
  const targetSceneSeconds = (sceneDuration(items, Math.max(0, scene), audioUrl ? masterDuration : undefined) || 7)
    + (audioUrl && scene === 0 && !cinematicOpening ? introSeconds : 0);
  // Silent/photo-only Keeps retain one clock across pause and resume, rather
  // than restarting the timer for the current image after every interruption.
  useEffect(() => {
    if (audioUrl || !playing || !mediaReady || silentClosing) return;
    let last = performance.now();
    const update = () => {
      const now = performance.now();
      const total = filmTotal(items);
      silentElapsedRef.current = Math.min(total, silentElapsedRef.current + Math.max(0, now - last) / 1000);
      last = now;
      setElapsedSeconds(silentElapsedRef.current);
      if (silentElapsedRef.current >= total) {
        setSilentClosing(true);
        return;
      }
      const nextScene = sceneIndexAt(items, silentElapsedRef.current);
      setScene(current => current === nextScene ? current : nextScene);
    };
    const timer = window.setInterval(update, 100);
    return () => { window.clearInterval(timer); update(); };
  }, [playing, mediaReady, audioUrl, items, silentClosing]);

  // A passive progress display follows real narration time, including its
  // musical lead-in and outro. It never advances while the voice is buffering.
  useEffect(() => {
    if (!audioUrl || !playing || !mediaReady || end) return;
    const update = () => {
      if (voiceEnded) {
        const remaining = Math.max(0, tailRemainingRef.current - Math.max(0, performance.now() - tailStartedAtRef.current));
        setElapsedSeconds(introSeconds + (masterDuration || audioDuration || 0) + (KEEP_MUSIC_TAIL_SECONDS - remaining / 1000));
      } else if (voiceStartedRef.current) {
        setElapsedSeconds(introSeconds + (audio.current?.currentTime ?? 0));
      } else if (introTimerRef.current !== null && introStartedAtRef.current) {
        const remaining = Math.max(0, introRemainingRef.current - Math.max(0, performance.now() - introStartedAtRef.current));
        setElapsedSeconds(introSeconds - remaining / 1000);
      }
    };
    update();
    const timer = window.setInterval(update, 100);
    return () => window.clearInterval(timer);
  }, [audioUrl, playing, mediaReady, end, voiceEnded, masterDuration, audioDuration, introSeconds]);

  // Poll the audio's playback position at animation-frame cadence. Never run
  // an independent slideshow timer over a buffered or stalled recording.
  useEffect(() => {
    if (!audioUrl || !playing || !mediaReady || end || scene < 0) return;
    let raf = 0;
    let lastPublished = -1;
    const tick = () => {
      const element = audio.current;
      if (element && !element.paused) {
        const time = element.currentTime;
        const duration = Number.isFinite(element.duration) && element.duration > 0 ? element.duration : (audioDuration || 1);
        // Sample the actual narration clock with sub-frame caption precision.
        // React updates only when the audio position advances, never on slideshow timers.
        if (lastPublished < 0 || Math.abs(time - lastPublished) >= 0.055) {
          lastPublished = time;
          setAudioTime(time);
        }
        const index = sceneIndexAt(items, time, masterDuration || duration);
        setScene((current) => current === index ? current : index);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [audioUrl, playing, mediaReady, end, scene < 0, items, masterDuration]);

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
  }, [audioUrl, audioDuration, introSeconds]);

  useEffect(() => {
    if (!mix.current) return;
    mix.current.restartMusic(musicMood, (["Soft", "Balanced", "Full"].includes(voiceMusicBalance) ? voiceMusicBalance : "Balanced") as MusicBalance);
  }, [musicMood, voiceMusicBalance]);

  useEffect(() => {
    const a = audio.current;
    if (!a || !audioUrl) return;
    let cancelled = false;
    if (!playing || !mediaReady || end) {
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
      if (cancelled) { void controller.pause(); return; }
      setBlocked(false);
      setOpeningMusicStarted(true);
      if (voiceStartedRef.current) {
        // During the outro, the music continues after the audio element ends.
        if (!a.ended) void a.play().catch(() => { if (!cancelled) setBlocked(true); });
        return;
      }
      introStartedAtRef.current = performance.now();
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
        introRemainingRef.current = Math.max(0, introRemainingRef.current - (performance.now() - introStartedAtRef.current));
      }
    };
  }, [playing, mediaReady, end, audioUrl]);

  // After the final spoken word, keep the music outro playing. If the viewer
  // pauses, freeze this remaining tail instead of firing the completion screen
  // during a pause (or losing the end of the soundtrack).
  useEffect(()=>{
    if(!audioUrl || !voiceEnded || !playing || finishSent.current)return;
    tailStartedAtRef.current=performance.now();
    const remaining=Math.max(0,tailRemainingRef.current);
    endingTimer.current=window.setTimeout(()=>{
      endingTimer.current=null;
      tailRemainingRef.current=0;
      if(finishSent.current)return;
      finishSent.current=true;
      onFinish?.();
    },remaining);
    return ()=>{
      if(endingTimer.current!==null)window.clearTimeout(endingTimer.current);
      endingTimer.current=null;
      tailRemainingRef.current=Math.max(0,tailRemainingRef.current-(performance.now()-tailStartedAtRef.current));
    };
  },[audioUrl,voiceEnded,playing,onFinish]);

  useEffect(() => { mix.current?.setMuted(muted); }, [muted]);
  useEffect(() => { mix.current?.setLevels(voiceVolume, musicVolume); }, [voiceVolume, musicVolume]);
  useEffect(() => { mix.current?.setTrackMutes(!!audioMix?.voiceMuted, !!audioMix?.musicMuted); }, [audioMix?.voiceMuted, audioMix?.musicMuted]);
  useEffect(() => { mix.current?.setVoiceTone(audioMix?.voiceTone ?? "natural"); }, [audioMix?.voiceTone]);

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
  const totalSeconds = audioUrl
    ? introSeconds + Math.max(0, masterDuration || audioDuration || 0) + KEEP_MUSIC_TAIL_SECONDS
    : filmTotal(items);
  const shownSeconds = Math.max(0, Math.min(totalSeconds, elapsedSeconds));
  const percent = totalSeconds > 0 ? Math.max(0, Math.min(100, shownSeconds / totalSeconds * 100)) : 0;
  const stamp = (seconds: number) => Math.floor(seconds / 60) + ":" + String(Math.floor(seconds % 60)).padStart(2, "0");
  const item = scene >= 0 ? items[Math.min(scene, items.length - 1)] : undefined;
  const nextItem = scene >= 0 ? items[scene + 1] : undefined;
  const finalWords = closingLine?.trim() || "You are so loved.";
  const openingDedication = openingMessage?.trim() || "";
  const openingTransitioning = cinematicOpening && (voiceStarted || elapsedSeconds >= introSeconds - 1.5);
  const openingTextVisible = cinematicOpening && openingMusicStarted && !openingTransitioning;
  const activeCue = captionAtTime(playbackCues, audioTime, masterDuration || audioDuration);
  // A real recording must never display demo captions as a fallback.
  const captionText = audioUrl ? (voiceStarted && !voiceEnded ? activeCue?.text ?? "" : "") : (scene >= 0 ? words[scene % words.length] : "");

  return <div className="relative keep-h-screen min-h-0 w-full overflow-hidden bg-[#F7F5F2] text-foreground" onClick={(event) => {
    if (closing || (event.target as HTMLElement).closest("button")) return;
    if (controlsVisible) setControlsVisible(false);
    else showControls();
  }}>
    {audioUrl && <audio ref={audio} crossOrigin="anonymous" src={audioUrl} playsInline preload="auto" onPlay={() => { setVoiceEnded(false); setVoiceBuffering(false); tailRemainingRef.current=KEEP_MUSIC_TAIL_SECONDS*1000; }}
      onWaiting={() => { if(playing && voiceStartedRef.current){setVoiceBuffering(true);void mix.current?.pause();} }}
      onStalled={() => { if(playing && voiceStartedRef.current){setVoiceBuffering(true);void mix.current?.pause();} }}
      onPlaying={() => {setVoiceBuffering(false);if(playing&&voiceStartedRef.current)void mix.current?.play().catch(()=>setBlocked(true));}} onLoadedMetadata={(event) => { const duration = event.currentTarget.duration; if (Number.isFinite(duration) && duration > 0) setMasterDuration(duration); }} onEnded={() => setVoiceEnded(true)} onTimeUpdate={(e) => { const a = e.currentTarget; const d = Number.isFinite(a.duration) && a.duration > 0 ? a.duration : audioDuration || 1; setAudioTime(a.currentTime); setScene((current) => { const index = sceneIndexAt(items, a.currentTime, d); return current < 0 || current === index ? current : index; }); }} />}
    {item && !end && <><CinematicMedia item={item} nextItem={nextItem} followingItem={items[scene + 2]} sceneKey={scene} motionIndex={scene} playing={playing && !voiceEnded && !voiceBuffering && (voiceStarted || !item?.isSelfie || !mediaReady)} duration={targetSceneSeconds} onFirstFrameReady={()=>setMediaReady(true)}
      sceneElapsed={audioUrl && voiceStarted && scene >= 0
        ? filmSceneElapsed(items, scene, audioTime, masterDuration || audioDuration)
        : undefined}
      className="absolute inset-0" imageClassName={`editor-image-${styleSlug(style)}`} /><div className="pointer-events-none absolute inset-0 photo-shade" /></>}
    {cinematicOpening && !end && <div
      aria-hidden={openingTransitioning}
      className={`pointer-events-none absolute inset-0 z-[25] flex items-center justify-center bg-[#171311] px-7 text-center text-[#F5EDE5] transition-opacity duration-[1500ms] ease-in-out motion-reduce:duration-0 ${openingTransitioning ? "opacity-0" : "opacity-100"}`}>
      <div className={`max-w-[540px] transition-all duration-[1200ms] ease-out motion-reduce:duration-0 ${openingTextVisible ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}>
        <p className="text-[10px] font-semibold uppercase tracking-[.27em] text-[#B8A38F]">A KEEP FOR</p>
        <p className="mt-3 font-display text-[clamp(38px,10vw,60px)] leading-[1.08] tracking-[-.045em]">{name}</p>
        {openingDedication && <>
          <div className="mx-auto my-8 h-px w-12 bg-[#9D8571]" aria-hidden="true" />
          <blockquote className="font-display text-[clamp(24px,6vw,35px)] italic leading-[1.32] tracking-[-.018em] whitespace-pre-line">{openingDedication}</blockquote>
        </>}
      </div>
    </div>}
    {blocked && !end && <div className="absolute inset-x-0 bottom-24 z-40 flex justify-center px-6">
      <Button variant="keep" size="touch" onClick={resumeAudio}><Volume2 /> Tap to start your Keep</Button>
    </div>}
    {!end && <>
      {/* Keep's wordmark stays on screen throughout the film; only controls fade. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[29] h-32 bg-gradient-to-b from-black/45 via-black/15 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 top-0 z-[35] px-5 pt-[max(22px,env(safe-area-inset-top))]">
        <div className="flex h-11 items-center justify-center">
          <img src="/brand/keep-wordmark-ivory.svg" alt="Keep" className="h-9 w-[104px] object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,.45)]" />
        </div>
      </div>
      <div inert={!controlsVisible} aria-hidden={!controlsVisible} className={`pointer-events-none absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/65 via-black/25 to-transparent px-5 pb-12 pt-[max(22px,env(safe-area-inset-top))] transition-opacity duration-500 ease-out ${controlsVisible ? "opacity-100" : "opacity-0"}`}>
        <div className="flex items-center justify-between gap-3">
          <button type="button" aria-label="Exit preview" onClick={onExit} className="pointer-events-auto flex size-11 items-center justify-center rounded-full border border-white/20 bg-black/25 text-[#F7F5F2] shadow-sm backdrop-blur-md transition-colors hover:bg-black/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            <ArrowLeft className="size-5" strokeWidth={1.7} />
          </button>
          <span aria-hidden="true" className="w-[104px]" />
          <button type="button" aria-label={muted ? "Unmute" : "Mute"} onClick={() => { setMuted(!muted); showControls(); }} className="pointer-events-auto flex size-11 items-center justify-center rounded-full border border-white/20 bg-black/25 text-[#F7F5F2] shadow-sm backdrop-blur-md transition-colors hover:bg-black/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            {muted ? <VolumeX className="size-5" strokeWidth={1.7} /> : <Volume2 className="size-5" strokeWidth={1.7} />}
          </button>
        </div>
      </div>{scene >= 0 && <div className={`absolute left-7 right-7 text-center ${captionPosition === "top" ? "top-28" : captionPosition === "middle" ? "top-1/2 -translate-y-1/2" : "bottom-36"}`}>{!media?.length && <div className="eyebrow mb-5 text-foreground/80">{memoryLabels[scene % memoryLabels.length]}</div>}{captions !== "None" && captionText && <p key={activeCue?.start ?? scene} className={`keep-caption-visible mx-auto max-w-sm leading-snug ${captions === "Film" ? "font-display text-4xl font-normal" : captions === "Story" ? "font-display text-3xl italic" : captions === "Minimal" ? "text-xl font-normal" : captions === "Clean" ? "text-2xl font-medium" : "text-2xl font-semibold"}`} style={{ maxWidth: captionLines === 1 ? "95%" : captionLines === 3 ? "65%" : "80%", whiteSpace: "pre-line", marginInline: "auto" }}>{captionText}</p>}</div>}
      <div aria-hidden={!controlsVisible} inert={!controlsVisible} className={`pointer-events-none absolute inset-x-7 z-30 text-white drop-shadow-[0_1px_3px_rgba(0,0,0,.65)] transition-opacity duration-500 ease-out ${controlsVisible ? "opacity-100" : "opacity-0"}`} style={{ bottom: "max(22px, env(safe-area-inset-bottom))" }}>
        <div className="mb-2 flex items-center justify-between text-[11px] font-medium tabular-nums tracking-[.025em]">
          <span>{stamp(shownSeconds)}</span>
          <span aria-label="Time remaining">−{stamp(Math.max(0, totalSeconds - shownSeconds))}</span>
        </div>
        <div role="progressbar" aria-label="Keep playback progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)} className="h-[3px] w-full overflow-hidden rounded-full bg-white/40">
          <div className="h-full rounded-full bg-white transition-[width] duration-100 ease-linear" style={{ width: percent + "%" }} />
        </div>
      </div>
      <div inert={!controlsVisible} aria-hidden={!controlsVisible} className={`pointer-events-none absolute left-0 right-0 z-30 flex justify-center transition-opacity duration-500 ease-out ${controlsVisible ? "opacity-100" : "opacity-0"}`} style={{ bottom: "calc(max(22px, env(safe-area-inset-bottom)) + 51px)" }}>
      <button type="button" aria-label={playing ? "Pause" : "Play"} onClick={() => { setPlaying(!playing); showControls(); }} className="pointer-events-auto flex size-12 items-center justify-center rounded-full border border-white/25 bg-black/40 text-[#F7F5F2] shadow-lg backdrop-blur-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
        {playing ? <Pause className="size-5" fill="currentColor" /> : <Play className="ml-0.5 size-5" fill="currentColor" />}
      </button>
    </div></>}
    {/* The existing final frame fades into a quiet dark dedication while the
        original soundtrack completes. No extra blank photo or hard cut. */}
    <div aria-hidden={!closing}
      className={`pointer-events-none absolute inset-0 z-[45] flex items-center justify-center bg-[#171311] px-9 text-center text-[#F5EDE5] transition-opacity duration-[1600ms] ease-in-out motion-reduce:duration-0 ${closing ? "opacity-100" : "opacity-0"}`}>
      <div className={`max-w-[520px] transition-all duration-[1350ms] delay-[1000ms] ease-out motion-reduce:duration-0 motion-reduce:delay-0 ${closing ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
        <p className="mb-7 text-[10px] font-semibold uppercase tracking-[.26em] text-[#B8A38F]">{name ? `FOR ${name}` : "JUST FOR YOU"}</p>
        <p className="font-display text-[clamp(36px,9vw,64px)] italic leading-[1.13] tracking-[-.032em]">{finalWords}</p>
        <div className="mx-auto mt-8 h-px w-11 bg-[#9D8571]" aria-hidden="true" />
        {from && <p className="mt-6 text-[12px] tracking-[.13em] text-[#D4C4B3]">With love, {from}</p>}
      </div>
    </div>
  </div>;
}
