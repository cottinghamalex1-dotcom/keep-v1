import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motionFor } from "@/lib/keep-film-timing";

export type CinematicMoment = {
  url: string;
  kind: "image" | "video";
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
  item, nextItem, followingItem, sceneKey, motionIndex = 0, playing = true, duration = 7, sceneElapsed, className = "", imageClassName = "",
}: Props) {
  const key = String(sceneKey ?? item.url);
  const [state, setState] = useState<State>(() => ({
    slots: [{ key, item, duration, imageClassName, index: motionIndex }, null], active: 0, pending: null, revealed: false,
  }));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
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
          old.transition === item.transition && current.duration === duration &&
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
    for (const video of videos.current) {
      if (!video) continue;
      if (playing) void video.play().catch(() => undefined);
      else video.pause();
    }
  }, [playing, state.slots[0]?.key, state.slots[1]?.key, state.pending]);

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
          src={moment.url} muted playsInline loop autoPlay={playing}
          preload="auto" onLoadedData={() => { if (isPending) reveal(slot, scene); }}
          onCanPlay={(event) => { if (isPending && event.currentTarget.readyState >= 2) reveal(slot, scene); }}
          onError={() => { if (isPending) setState((old) => {
            if (old.pending !== slot) return old;
            const slots = [...old.slots] as Layers;
            slots[slot] = null;
            return { ...old, slots, pending: null, revealed: false };
          }); }}
          className={mediaClass} style={motionStyle}
        />
      : <img
          key={scene.key}
          src={moment.url} alt="" decoding="async"
          onLoad={(event) => {
            if (!isPending) return;
            const element = event.currentTarget;
            if (typeof element.decode === "function") void element.decode().catch(() => undefined).finally(() => reveal(slot, scene));
            else reveal(slot, scene);
          }}
          onError={() => { if (isPending) setState((old) => {
            if (old.pending !== slot) return old;
            const slots = [...old.slots] as Layers;
            slots[slot] = null;
            return { ...old, slots, pending: null, revealed: false };
          }); }}
          className={mediaClass} style={motionStyle}
        />;
  };

  return <div className={`isolate overflow-hidden bg-[#171719] ${className}`}>
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
