import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motionFor } from "@/lib/keep-film-timing";

export type CinematicMoment = {
  url: string;
  kind: "image" | "video";
  videoStartSec?: number | undefined; // selfie closing scene begins near the end of the filmed take
  isSelfie?: boolean | undefined;
  focusX?: number | undefined;
  focusY?: number | undefined;
  zoom?: number | undefined;
  motion?: "in" | "out" | "left" | "right" | undefined;
  transition?: "fade" | "dissolve" | "cut" | undefined;
};

type Props = {
  item: CinematicMoment;
  nextItem?: CinematicMoment | undefined;
  followingItem?: CinematicMoment | undefined;
  sceneKey?: string | number | undefined;
  motionIndex?: number | undefined;
  playing?: boolean;
  duration?: number;
  /** Narration-clock seconds within the current scene; avoids animations
   * finishing early or restarting when a user seeks or when media buffers. */
  sceneElapsed?: number;
  className?: string;
  imageClassName?: string;
  /** Fires once the visible opening media has actually decoded. */
  onFirstFrameReady?: (() => void) | undefined;
};

type Scene = { key: string; item: CinematicMoment; duration: number; imageClassName: string; index: number };
type Slot = 0 | 1;
type Layers = [Scene | null, Scene | null];
type State = { slots: Layers; active: Slot; pending: Slot | null; revealed: boolean };

const flip = (slot: Slot): Slot => slot === 0 ? 1 : 0;

/**
 * Two persistent layers: the last decoded image/video NEVER unmounts while
 * the next frame is loading. The incoming layer is decoded behind the scenes
 * and dissolves over the existing image. Once complete, it remains mounted
 * as the active layer (no remount/black flashes on Safari).
 */
export function CinematicMedia({
  item, nextItem, followingItem, sceneKey, motionIndex = 0, playing = true, duration = 7, sceneElapsed, className = "", imageClassName = "", onFirstFrameReady,
}: Props) {
  const key = String(sceneKey ?? item.url);
  const [failedScenes,setFailedScenes]=useState<Set<string>>(()=>new Set());
  // Keep the last decoded photo available if Safari briefly paints black
  // while buffering a video. Never replace it with an undecoded image.
  const [lastReadyStill, setLastReadyStill] = useState<string | null>(item.kind === "image" && item.url ? item.url : null);
  const [bufferingVideos, setBufferingVideos] = useState<Set<string>>(() => new Set());
  const [state, setState] = useState<State>(() => ({
    slots: [{ key, item, duration, imageClassName, index: motionIndex }, null], active: 0, pending: null, revealed: false,
  }));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyRef = useRef<string | null>(null);
  const readyCallback = useRef(onFirstFrameReady);
  readyCallback.current = onFirstFrameReady;
  const markFirstReady = (scene: Scene, isPending: boolean) => {
    if(isPending||scene.key!==key||readyRef.current===key)return;
    readyRef.current=key;
    readyCallback.current?.();
  };
  const videos = useRef<[HTMLVideoElement | null, HTMLVideoElement | null]>([null, null]);
  const prefetched = useRef<Map<string, HTMLImageElement>>(new Map());
  const activeScene = state.slots[state.active];
  const transition = activeScene?.item.transition ?? "dissolve";
  const fadeMs = transition === "cut" ? 0 : transition === "fade" ? 570 : 830;

  useLayoutEffect(() => {
    const next: Scene = { key, item, duration, imageClassName, index: motionIndex };
    setState((previous) => {
      const current = previous.slots[previous.active];
      const incoming = previous.pending !== null ? previous.slots[previous.pending] : null;
      // Settings edits update the existing scene without triggering a slideshow cut.
      if (current?.key === key) {
        // Ignore parent renders that recreated an equivalent item object:
        // interrupting an in-flight dissolve can reveal an undecoded frame.
        const old = current.item;
        if (old.url === item.url && old.kind === item.kind &&
          old.focusX === item.focusX && old.focusY === item.focusY &&
          old.zoom === item.zoom && old.motion === item.motion &&
          old.transition === item.transition && old.videoStartSec === item.videoStartSec && current.duration === duration &&
          current.imageClassName === imageClassName && current.index === motionIndex) return previous;
        const slots = [...previous.slots] as Layers;
        slots[previous.active] = next;
        if (previous.pending !== null) slots[previous.pending] = null;
        return { ...previous, slots, pending: null, revealed: false };
      }
      if (incoming?.key === key) {
        const slots = [...previous.slots] as Layers;
        slots[previous.pending!] = next;
        return { ...previous, slots };
      }
      const pending = flip(previous.active);
      const slots = [...previous.slots] as Layers;
      slots[pending] = next;
      return { ...previous, slots, pending, revealed: false };
    });
  }, [key, item, duration, imageClassName, motionIndex]);

  // Retain decoded images for the current and next two scenes.
  // A short-lived Image() could be garbage collected before Safari finishes decoding it.
  useEffect(() => {
    const wanted = new Set(
      [item, nextItem, followingItem]
        .filter((moment): moment is CinematicMoment => !!moment && moment.kind === "image" && !!moment.url)
        .map((moment) => moment.url),
    );
    for (const url of wanted) {
      if (prefetched.current.has(url)) continue;
      const image = new Image();
      image.decoding = "async";
      prefetched.current.set(url, image);
      image.src = url;
      if (typeof image.decode === "function") void image.decode().catch(() => undefined);
    }
    for (const url of prefetched.current.keys()) {
      if (!wanted.has(url)) prefetched.current.delete(url);
    }
  }, [item.url, item.kind, nextItem?.url, nextItem?.kind, followingItem?.url, followingItem?.kind]);

  useEffect(() => {
    // Hidden incoming videos must only buffer, not play. On mobile Safari,
    // two simultaneous decoders can blank the visible video and drop frames.
    const foreground = state.pending !== null && state.revealed ? state.pending : state.active;
    videos.current.forEach((video, slot) => {
      if (!video) return;
      if (playing && slot === foreground) {
        if (video.paused) void video.play()?.catch(() => undefined);
      } else video.pause();
    });
  }, [playing, state.active, state.pending, state.revealed, state.slots[0]?.key, state.slots[1]?.key]);

  useEffect(()=>{
    // The narration clock owns video time too. A pending clip remains paused
    // until its first frame appears; it must not run ahead while invisible.
    const foreground = state.pending !== null && state.revealed ? state.pending : state.active;
    const visible = state.slots[foreground];
    if (!visible || visible.key !== key || visible.item.kind !== "video") return;
    if (typeof sceneElapsed !== "number" || !Number.isFinite(sceneElapsed)) return;
    const video = videos.current[foreground];
    if (!video || video.seeking || video.readyState < 2 || !Number.isFinite(video.duration) || video.duration <= 0) return;
    const offset = visible.item.videoStartSec ?? 0;
    // Small regular clips loop naturally. Modulo is essential: clamping a
    // 5-second video at its final frame while the photo scene lasts 15 seconds
    // repeatedly seeks Safari at every tick and causes black flashes.
    const loop = !visible.item.isSelfie;
    const wanted = loop
      ? (offset + sceneElapsed) % video.duration
      : Math.max(0, Math.min(video.duration - 0.05, offset + sceneElapsed));
    const difference = Math.abs(video.currentTime - wanted);
    const drift = loop ? Math.min(difference, Math.abs(video.duration - difference)) : difference;
    if (drift > 1.0 && !bufferingVideos.has(visible.key)) {
      try { video.currentTime = wanted; } catch { /* Safari may still be preparing this clip. */ }
    }
  }, [sceneElapsed, state.active, state.pending, state.revealed, state.slots, key]);

  const canRevealVideo = (video:HTMLVideoElement, scene:Scene) => {
    const offset=scene.item.videoStartSec;
    if(typeof offset!=="number"||offset<0.1)return true;
    // A Safari video can announce "canplay" while it still displays frame 0.
    return !video.seeking && Math.abs(video.currentTime-offset)<0.4;
  };
  const reveal = (slot: Slot, scene: Scene) => {
    let first = 0;
    let second = 0;
    first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => {
        setState((previous) => previous.pending === slot && previous.slots[slot]?.key === scene.key
          ? { ...previous, revealed: true } : previous);
      });
    });
    // RAFs are short-lived; when a later scene arrives, its identity check wins.
    void first;
    void second;
  };

  useEffect(() => {
    if (state.pending === null || !state.revealed) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setState((previous) => {
        if (previous.pending === null || !previous.revealed) return previous;
        const newActive = previous.pending;
        const slots = [...previous.slots] as Layers;
        slots[previous.active] = null;
        return { slots, active: newActive, pending: null, revealed: false };
      });
      timer.current = null;
    }, fadeMs + 50);
    return () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  }, [state.pending, state.revealed, fadeMs]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const renderMedia = (scene: Scene, slot: Slot) => {
    const moment = scene.item;
    if(failedScenes.has(scene.key)){
      // Never leave recipients staring at a black frame if a mobile browser
      // cannot decode one of the supplied videos. Show the next still moment
      // where possible, otherwise retain the branded opening artwork.
      const still=[nextItem,followingItem].find(m=>m?.kind==="image"&&m.url)?.url;
      return <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-[#3C332F] via-[#241F1E] to-[#171413] px-8 text-center">
        {still&&<img src={still} alt="" className="absolute inset-0 h-full w-full object-cover opacity-65" />}
        <div className="absolute inset-0 bg-black/35"/>
        <img src="/brand/keep-wordmark-ivory.svg" alt="" className="relative z-10 mb-5 h-10 w-28 object-contain drop-shadow-lg"/>
        <p className="relative z-10 font-display text-xl italic text-[#F7EEE5] drop-shadow-lg">Some things are worth keeping.</p>
      </div>;
    }
    const x = Math.max(0, Math.min(100, moment.focusX ?? 50));
    const y = Math.max(0, Math.min(100, moment.focusY ?? 50));
    const zoom = Math.max(1.03, Math.min(1.35, moment.zoom ?? 1.08));
    const motion = motionFor(moment, scene.index);
    const isPending = state.pending === slot;
    const from = motion === "out" ? zoom * 1.065 : zoom;
    const to = motion === "out" ? zoom : zoom * 1.065;
    const shift = motion === "left" ? [2.4, -2.4] : motion === "right" ? [-2.4, 2.4] : [0, 0];
    // In narrated Keeps the actual recording clock owns every frame. Do not
    // let a one-shot CSS animation finish and freeze while the photo stays up.
    // The outgoing layer settles at 100% while the incoming photo starts at 0%.
    const timed = typeof sceneElapsed === "number" && Number.isFinite(sceneElapsed);
    const fraction = timed ? (scene.key === key
      ? Math.max(0, Math.min(1, sceneElapsed! / Math.max(0.1, scene.duration)))
      : 1) : null;
    const translate = fraction === null ? undefined : shift[0] + (shift[1] - shift[0]) * fraction;
    const scale = fraction === null ? undefined : from + (to - from) * fraction;
    const motionStyle = {
      objectPosition: `${x}% ${y}%`,
      transformOrigin: `${x}% ${y}%`,
      animation: fraction === null ? `keep-cinematic-move ${Math.max(1, scene.duration)}s linear both` : "none",
      animationPlayState: playing && (!isPending || state.revealed) ? "running" as const : "paused" as const,
      ...(fraction !== null ? { transform: `translateX(${translate}%) scale(${scale})` } : {}),
      ["--keep-from" as string]: `translateX(${shift[0]}%) scale(${from})`,
      ["--keep-to" as string]: `translateX(${shift[1]}%) scale(${to})`,
    };
    const mediaClass = `absolute inset-0 block h-full w-full object-cover will-change-transform [backface-visibility:hidden] ${scene.imageClassName}`;
    return moment.kind === "video"
      ? <video
          key={scene.key}
          ref={(node) => { videos.current[slot] = node; }}
          src={moment.url} muted playsInline loop={!moment.isSelfie} autoPlay={false}
          preload="auto" onLoadedMetadata={(event)=>{
             if(typeof moment.videoStartSec==="number" && moment.videoStartSec>0.05) {
               try{event.currentTarget.currentTime=Math.min(Math.max(0,event.currentTarget.duration-.05),moment.videoStartSec);}catch{/* Safari not ready */}
             }
           }}
          onLoadedData={(event) => {
            setBufferingVideos(old => {
              if (!old.has(scene.key)) return old;
              const next = new Set(old); next.delete(scene.key); return next;
            });
            if(!canRevealVideo(event.currentTarget,scene))return;
            if(isPending)reveal(slot,scene);
            else markFirstReady(scene,isPending);
          }}
          onSeeked={(event)=>{
            if(!canRevealVideo(event.currentTarget,scene))return;
            if(isPending)reveal(slot,scene);
            else markFirstReady(scene,isPending);
          }}
          onCanPlay={(event) => {
            if(event.currentTarget.readyState<2||!canRevealVideo(event.currentTarget,scene))return;
            if(isPending)reveal(slot,scene);
            else markFirstReady(scene,isPending);
          }}
          onWaiting={() => { if (scene.key === key && (!isPending || state.revealed))
            setBufferingVideos(old => new Set(old).add(scene.key)); }}
          onStalled={() => { if (scene.key === key && (!isPending || state.revealed))
            setBufferingVideos(old => new Set(old).add(scene.key)); }}
          onPlaying={(event) => {
            if (event.currentTarget.readyState >= 2)
              setBufferingVideos(old => { if (!old.has(scene.key)) return old; const next = new Set(old); next.delete(scene.key); return next; });
          }}
          onError={() => { if(!isPending){setFailedScenes(old=>new Set(old).add(scene.key));markFirstReady(scene,isPending);} if (isPending) setState((old) => {
            if (old.pending !== slot) return old;
            const slots = [...old.slots] as Layers;
            slots[slot] = null;
            return { ...old, slots, pending: null, revealed: false };
          }); }}
          className={mediaClass} style={{ ...motionStyle, opacity: bufferingVideos.has(scene.key) ? 0 : 1 }}
        />
      : <img
          key={scene.key}
          src={moment.url} alt="" decoding="async"
          onLoad={(event) => {
            const element = event.currentTarget;
            const ready = () => {
              // Ignore a late decode from a scene we have already skipped.
              if (isPending && scene.key !== key) return;
              setLastReadyStill(scene.item.url);
              if (isPending) reveal(slot, scene);
              else markFirstReady(scene, isPending);
            };
            if (typeof element.decode === "function")
              void element.decode().catch(() => undefined).finally(ready);
            else ready();
          }}
          onError={() => { if(!isPending){setFailedScenes(old=>new Set(old).add(scene.key));markFirstReady(scene,isPending);} if (isPending) setState((old) => {
            if (old.pending !== slot) return old;
            const slots = [...old.slots] as Layers;
            slots[slot] = null;
            return { ...old, slots, pending: null, revealed: false };
          }); }}
          className={mediaClass} style={motionStyle}
        />;
  };

  return <div className={`isolate overflow-hidden bg-[#171719] ${className}`}>
    {lastReadyStill
      ? <img src={lastReadyStill} alt="" aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full object-cover" />
      : <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center bg-[#E9E0D5]">
          <span className="font-display text-5xl tracking-[-.07em] text-[#564739]">Keep</span>
        </div>}
    <style>{`@keyframes keep-cinematic-move {from {transform:var(--keep-from)} to {transform:var(--keep-to)}} @media (prefers-reduced-motion:reduce) {[style*="keep-cinematic-move"] {animation:none!important}}`}</style>
    {state.slots.map((scene, slot) => scene && <div key={slot} className="absolute inset-0 will-change-[opacity]"
      style={{
        zIndex: slot === state.pending ? 2 : 1,
        opacity: slot === state.pending && !state.revealed ? 0 : 1,
        transition: slot === state.pending && fadeMs ? `opacity ${fadeMs}ms ease-in-out` : "none",
        pointerEvents: "none",
      }}>
      {renderMedia(scene, slot as Slot)}
    </div>)}
  </div>;
}
