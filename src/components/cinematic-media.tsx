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
  sceneKey?: string | number | undefined;
  motionIndex?: number | undefined;
  playing?: boolean;
  duration?: number;
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
  item, nextItem, sceneKey, motionIndex = 0, playing = true, duration = 7, className = "", imageClassName = "",
}: Props) {
  const key = String(sceneKey ?? item.url);
  const [state, setState] = useState<State>(() => ({
    slots: [{ key, item, duration, imageClassName, index: motionIndex }, null], active: 0, pending: null, revealed: false,
  }));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videos = useRef<[HTMLVideoElement | null, HTMLVideoElement | null]>([null, null]);
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

  // Warm the browser cache for the following image, without creating a flash.
  useEffect(() => {
    if (nextItem?.kind !== "image" || !nextItem.url || nextItem.url === item.url) return;
    const image = new Image();
    image.src = nextItem.url;
    if (typeof image.decode === "function") void image.decode().catch(() => undefined);
  }, [nextItem?.url, nextItem?.kind, item.url]);

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
    const from = motion === "out" ? zoom * 1.065 : zoom;
    const to = motion === "out" ? zoom : zoom * 1.065;
    const shift = motion === "left" ? [2.4, -2.4] : motion === "right" ? [-2.4, 2.4] : [0, 0];
    const motionStyle = {
      objectPosition: `${x}% ${y}%`,
      transformOrigin: `${x}% ${y}%`,
      animation: `keep-cinematic-move ${Math.max(1, scene.duration)}s linear both`,
      animationPlayState: playing ? "running" as const : "paused" as const,
      ["--keep-from" as string]: `translateX(${shift[0]}%) scale(${from})`,
      ["--keep-to" as string]: `translateX(${shift[1]}%) scale(${to})`,
    };
    const mediaClass = `absolute inset-0 block h-full w-full object-cover ${scene.imageClassName}`;
    const isPending = state.pending === slot;
    return moment.kind === "video"
      ? <video
          key={scene.key}
          ref={(node) => { videos.current[slot] = node; }}
          src={moment.url} muted playsInline loop autoPlay={playing}
          preload="auto" onLoadedData={() => { if (isPending) reveal(slot, scene); }}
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
    {state.slots.map((scene, slot) => scene && <div key={slot} className="absolute inset-0"
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
