import { useEffect, useLayoutEffect, useRef, useState } from "react";

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
  playing?: boolean;
  duration?: number;
  className?: string;
  imageClassName?: string;
};

type Scene = { item: CinematicMoment; duration: number; imageClassName: string };

/**
 * Keeps the last fully visible frame on screen until the next photo/video
 * has loaded. The new frame fades ON TOP of the old frame, never through black.
 * The outgoing clip's transition setting controls how it leaves the screen.
 */
export function CinematicMedia({ item, playing = true, duration = 7, className = "", imageClassName = "" }: Props) {
  const currentVideo = useRef<HTMLVideoElement>(null);
  const [front, setFront] = useState<Scene>(() => ({ item, duration, imageClassName }));
  const [outgoing, setOutgoing] = useState<Scene | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const lastUrl = useRef(item.url);
  const fadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transition: NonNullable<CinematicMoment["transition"]> = outgoing?.item.transition ?? front.item.transition ?? "dissolve";
  const fadeMs = transition === "cut" ? 0 : transition === "fade" ? 440 : 760;

  // useLayoutEffect preserves the previous image during a route/player update
  // before the browser paints the first frame of the incoming clip.
  useLayoutEffect(() => {
    const next: Scene = { item, duration, imageClassName };
    if (item.url !== lastUrl.current) {
      if (fadeTimer.current) clearTimeout(fadeTimer.current);
      setOutgoing(front);
      setFront(next);
      setReady(false);
      setFailed(false);
      lastUrl.current = item.url;
    } else if (front.item !== item || front.duration !== duration || front.imageClassName !== imageClassName) {
      setFront(next);
    }
  }, [item, duration, imageClassName]);

  useEffect(() => {
    if (!ready || !outgoing) return;
    if (fadeTimer.current) clearTimeout(fadeTimer.current);
    fadeTimer.current = setTimeout(() => {
      setOutgoing(null);
      fadeTimer.current = null;
    }, fadeMs + 65);
    return () => { if (fadeTimer.current) clearTimeout(fadeTimer.current); };
  }, [ready, outgoing?.item.url, fadeMs]);

  useEffect(() => () => { if (fadeTimer.current) clearTimeout(fadeTimer.current); }, []);

  useEffect(() => {
    const video = currentVideo.current;
    if (!video) return;
    if (playing) void video.play().catch(() => {});
    else video.pause();
  }, [playing, front.item.url, front.item.kind]);

  const mediaElement = (scene: Scene, isFront: boolean) => {
    const moment = scene.item;
    const x = Math.max(0, Math.min(100, moment.focusX ?? 50));
    const y = Math.max(0, Math.min(100, moment.focusY ?? 50));
    const zoom = Math.max(1, Math.min(1.5, moment.zoom ?? 1.08));
    const pan = moment.motion === "left" ? -2 : moment.motion === "right" ? 2 : 0;
    const from = moment.motion === "out" ? zoom * 1.08 : zoom;
    const to = moment.motion === "out" ? zoom : zoom * 1.08;
    const motionStyle = {
      objectPosition: `${x}% ${y}%`,
      transformOrigin: `${x}% ${y}%`,
      animation: playing && isFront ? `keep-cinematic-move ${Math.max(3, scene.duration)}s ease-in-out both` : undefined,
      transform: playing && isFront ? undefined : `scale(${zoom})`,
      ["--keep-from" as string]: `translateX(${-pan}%) scale(${from})`,
      ["--keep-to" as string]: `translateX(${pan}%) scale(${to})`,
    };
    const className = `absolute inset-0 block h-full w-full object-cover ${scene.imageClassName}`;
    return moment.kind === "video"
      ? <video
          key={moment.url}
          ref={isFront ? currentVideo : undefined}
          src={moment.url} muted playsInline loop autoPlay={isFront && playing}
          preload="auto"
          onLoadedData={isFront ? () => setReady(true) : undefined}
          onError={isFront ? () => { setFailed(true); setReady(true); } : undefined}
          className={className} style={motionStyle}
        />
      : <img
          key={moment.url}
          src={moment.url} alt="Memory" decoding="async"
          onLoad={isFront ? () => setReady(true) : undefined}
          onError={isFront ? () => { setFailed(true); setReady(true); } : undefined}
          className={className} style={motionStyle}
        />;
  };

  // There is always a frame behind the incoming one during loading and fading.
  const showIncoming = !outgoing || ready;
  return <div className={`isolate overflow-hidden bg-[#171719] ${className}`}>
    <style>{`@keyframes keep-cinematic-move {from {transform:var(--keep-from)} to {transform:var(--keep-to)}} @media (prefers-reduced-motion:reduce) {[style*="keep-cinematic-move"] {animation:none!important}}`}</style>
    {outgoing?.item.url && <div className="absolute inset-0">{mediaElement(outgoing, false)}</div>}
    <div
      className="absolute inset-0"
      style={{
        opacity: showIncoming ? 1 : 0,
        transition: outgoing && fadeMs > 0 ? `opacity ${fadeMs}ms ease-in-out` : "none",
        willChange: outgoing && fadeMs > 0 ? "opacity" : "auto",
      }}
    >
      {front.item.url && !failed ? mediaElement(front, true) :
        <div className="absolute inset-0 flex items-center justify-center px-5 text-center text-sm text-white/65">
          {failed ? "This memory couldn't load. Try replacing it." : "Add a photo to preview your Keep."}
        </div>}
    </div>
  </div>;
}
