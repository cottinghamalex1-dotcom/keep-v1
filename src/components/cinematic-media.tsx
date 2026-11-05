import { useEffect, useState } from "react";

export type CinematicMoment = {
  url: string;
  kind: "image" | "video";
  focusX?: number;
  focusY?: number;
  zoom?: number;
  motion?: "in" | "out" | "left" | "right";
  transition?: "fade" | "dissolve" | "cut";
};

export function CinematicMedia({ item, playing = true, duration = 7, className = "", imageClassName = "" }: {
  item: CinematicMoment;
  playing?: boolean;
  duration?: number;
  className?: string;
  imageClassName?: string;
}) {
  const [previous, setPrevious] = useState<CinematicMoment | null>(null);
  const [lastUrl, setLastUrl] = useState(item.url);
  const [failed, setFailed] = useState(false);

  // Always render the latest item immediately. Previously, the player rendered
  // a stale state snapshot until an effect ran, leaving an empty preview when
  // switching/uploading moments. A previous frame is only an optional overlay.
  useEffect(() => {
    setFailed(false);
    if (item.url === lastUrl) return;
    setPrevious(null);
    setLastUrl(item.url);
  }, [item.url, lastUrl]);

  const render = (moment: CinematicMoment) => {
    const x = Math.max(0, Math.min(100, moment.focusX ?? 50));
    const y = Math.max(0, Math.min(100, moment.focusY ?? 50));
    const zoom = Math.max(1, Math.min(1.5, moment.zoom ?? 1.08));
    const pan = moment.motion === "left" ? -2 : moment.motion === "right" ? 2 : 0;
    const from = moment.motion === "out" ? zoom * 1.08 : zoom;
    const to = moment.motion === "out" ? zoom : zoom * 1.08;
    const imageStyle = {
      objectPosition: `${x}% ${y}%`,
      transformOrigin: `${x}% ${y}%`,
      animation: playing ? `keep-cinematic-move ${Math.max(3, duration)}s ease-in-out both` : undefined,
      transform: playing ? undefined : `scale(${zoom})`,
      ["--keep-from" as string]: `translateX(${-pan}%) scale(${from})`,
      ["--keep-to" as string]: `translateX(${pan}%) scale(${to})`,
    };
    return moment.kind === "video"
      ? <video key={moment.url} src={moment.url} autoPlay={playing} muted loop playsInline preload="metadata" onError={() => setFailed(true)} className={`absolute inset-0 block h-full w-full object-cover ${imageClassName}`} style={imageStyle} />
      : <img key={moment.url} src={moment.url} alt="Memory" onLoad={() => setFailed(false)} onError={() => setFailed(true)} className={`absolute inset-0 block h-full w-full object-cover ${imageClassName}`} style={imageStyle} />;
  };

  return <div className={`isolate overflow-hidden bg-[#171719] ${className}`}>
    <style>{`@keyframes keep-cinematic-move {from {transform:var(--keep-from)} to {transform:var(--keep-to)}} @media (prefers-reduced-motion:reduce) {[style*="keep-cinematic-move"] {animation:none!important}}`}</style>
    {item.url && !failed ? render(item) : <div className="absolute inset-0 flex items-center justify-center px-5 text-center text-sm text-white/65">{failed ? "This photo couldn't be displayed. Try replacing it with a JPEG or PNG." : "Add a photo to preview your Keep."}</div>}
  </div>;
}
