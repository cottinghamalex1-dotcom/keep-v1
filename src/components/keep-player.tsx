import { CinematicMedia } from "@/components/cinematic-media";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Volume2, VolumeX, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createKeepVoiceMix, KEEP_MUSIC_LEAD_SECONDS, KEEP_MUSIC_TAIL_SECONDS, type MusicBalance } from "@/lib/keep-audio";
import type { AudioMix, CaptionCue } from "@/lib/keep-project";
import { captionAtTime, recoverCaptionTiming } from "@/lib/keep-caption-timing";
import { sceneDuration, sceneElapsed as filmSceneElapsed, sceneIndexAt } from "@/lib/keep-film-timing";
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
  subtitle?: string | undefined; media?: PlayerMedia[] | undefined; audioUrl?: string | undefined; audioDuration?: number | undefined; lines?: string[] | undefined;
  captionCues?: CaptionCue[] | undefined; musicMood?: string | undefined; voiceMusicBalance?: string | undefined; voiceVolume?: number | undefined; musicVolume?: number | undefined; captionPosition?: "top" | "middle" | "bottom" | undefined; captionLines?: number | undefined; audioMix?: AudioMix | undefined;
};

export function KeepPlayer({ name, from, year, onExit, onFinish, recipient = false, style = "Natural", captions = "Reel", subtitle, media, audioUrl, audioDuration, lines, captionCues = [], musicMood = "Warm + Nostalgic", voiceMusicBalance = "Balanced", voiceVolume = 60, musicVolume = 60, captionPosition = "bottom", captionLines = 2, audioMix }: Props) {
  const [scene, setScene] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [audioTime, setAudioTime] = useState(0);
  const [masterDuration, setMasterDuration] = useState(audioDuration);
  const [voiceStarted, setVoiceStarted] = useState(false);
  const [voiceEnded, setVoiceEnded] = useState(false);
  const [voiceBuffering, setVoiceBuffering] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [mediaReady, setMediaReady] = useState(false);
  const controlsTimer = useRef<number | null>(null);
  const finishSent = useRef(false);
  const voiceStartedRef = useRef(false);
  const introRemainingRef = useRef(KEEP_MUSIC_LEAD_SECONDS * 1000);
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
  const end = !audioUrl && scene >= 5;

  // Decode the opening frame before starting the music/voice timeline.
  // Keep the following two photos warm without keeping the whole film in memory.
  useEffect(() => {
    let cancelled = false;
    const warmers: HTMLImageElement[] = [];
    const finishWarmup = () => { if (!cancelled) setMediaReady(true); };
    // A front-camera video needs a decoded frame before the music/narration
    // timeline starts. Otherwise a slow cellular download opens on black.
    setMediaReady(false);
    for (const moment of items.slice(0, 3)) {
      if (moment.kind !== "image" || !moment.url) continue;
      const picture = new Image();
      picture.decoding = "async";
      warmers.push(picture);
      if (moment === items[0]) {
        picture.onload = () => {
          if (typeof picture.decode === "function") void picture.decode().catch(() => undefined).finally(finishWarmup);
          else finishWarmup();
        };
        picture.onerror = finishWarmup;
      } else {
        picture.onload = () => { if (typeof picture.decode === "function") void picture.decode().catch(() => undefined); };
      }
      picture.src = moment.url;
    }
    return () => { cancelled = true; warmers.forEach((picture) => { picture.onload = null; picture.onerror = null; }); };
  }, [items]);

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

  // Recipients go straight to the light completion page, not a second dark end card.
  useEffect(() => {
    if (!audioUrl && scene >= 5 && !finishSent.current) {
      finishSent.current = true;
      onFinish?.();
    }
  }, [recipient, audioUrl, scene, onFinish]);

  // Play the musical lead-in over the first photo, never over a separate title screen.
  const introSeconds = audioUrl ? KEEP_MUSIC_LEAD_SECONDS : 0;
  const targetSceneSeconds = (sceneDuration(items, Math.max(0, scene), audioUrl ? masterDuration : undefined) || 7)
    + (audioUrl && scene === 0 ? introSeconds : 0);
  // Without a recording, use per-photo timing. With voice, the actual audio
  // currentTime below is the single clock for pictures, captions and progress.
  useEffect(() => {
    if (!playing || !mediaReady || end) return;
    if (audioUrl) return;
    const timer = window.setTimeout(() => setScene((current) => current + 1), Math.max(700, sceneDuration(items, scene) * 1000));
    return () => window.clearTimeout(timer);
  }, [scene, playing, mediaReady, end, audioUrl, items, introSeconds]);

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
  const item = scene >= 0 ? items[Math.min(scene, items.length - 1)] : undefined;
  const nextItem = scene >= 0 ? items[scene + 1] : undefined;
  const activeCue = captionAtTime(playbackCues, audioTime, masterDuration || audioDuration);
  // A real recording must never display demo captions as a fallback.
  const captionText = audioUrl ? (voiceStarted && !voiceEnded ? activeCue?.text ?? "" : "") : (scene >= 0 ? words[scene % words.length] : "");

  return <div className="relative keep-h-screen min-h-0 w-full overflow-hidden bg-[#F7F5F2] text-foreground" onClick={(event) => {
    if ((event.target as HTMLElement).closest("button")) return;
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
      </div>{scene >= 0 && <div className={`absolute left-7 right-7 text-center ${captionPosition === "top" ? "top-28" : captionPosition === "middle" ? "top-1/2 -translate-y-1/2" : "bottom-28"}`}>{!media?.length && <div className="eyebrow mb-5 text-foreground/80">{memoryLabels[scene % memoryLabels.length]}</div>}{captions !== "None" && captionText && <p key={activeCue?.start ?? scene} className={`keep-caption-visible mx-auto max-w-sm leading-snug ${captions === "Film" ? "font-display text-4xl font-normal" : captions === "Story" ? "font-display text-3xl italic" : captions === "Minimal" ? "text-xl font-normal" : captions === "Clean" ? "text-2xl font-medium" : "text-2xl font-semibold"}`} style={{ maxWidth: captionLines === 1 ? "95%" : captionLines === 3 ? "65%" : "80%", whiteSpace: "pre-line", marginInline: "auto" }}>{captionText}</p>}</div>}<div inert={!controlsVisible} aria-hidden={!controlsVisible} className={`pointer-events-none absolute bottom-[max(24px,env(safe-area-inset-bottom))] left-0 right-0 z-30 flex justify-center transition-opacity duration-500 ease-out ${controlsVisible ? "opacity-100" : "opacity-0"}`}>
      <button type="button" aria-label={playing ? "Pause" : "Play"} onClick={() => { setPlaying(!playing); showControls(); }} className="pointer-events-auto flex size-12 items-center justify-center rounded-full border border-white/25 bg-black/40 text-[#F7F5F2] shadow-lg backdrop-blur-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
        {playing ? <Pause className="size-5" fill="currentColor" /> : <Play className="ml-0.5 size-5" fill="currentColor" />}
      </button>
    </div></>}
  </div>;
}
