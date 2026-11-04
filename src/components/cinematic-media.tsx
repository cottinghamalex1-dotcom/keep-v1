import { useEffect, useState } from "react";
export type CinematicMoment = { url: string; kind: "image" | "video"; focusX?: number; focusY?: number; zoom?: number; motion?: "in" | "out" | "left" | "right" };
export function CinematicMedia({ item, playing = true, duration = 7, className = "", imageClassName = "" }: { item: CinematicMoment; playing?: boolean; duration?: number; className?: string; imageClassName?: string }) {
  const [previous, setPrevious] = useState<CinematicMoment | null>(null);
  const [current, setCurrent] = useState(item);
  useEffect(() => {
    if (item.url === current.url && item.focusX === current.focusX && item.focusY === current.focusY && item.zoom === current.zoom && item.motion === current.motion) return;
    setPrevious(current);
    setCurrent(item);
    const timer = window.setTimeout(() => setPrevious(null), 1250);
    return () => window.clearTimeout(timer);
  }, [item.url, item.focusX, item.focusY, item.zoom, item.motion]);
  const render = (m: CinematicMoment, entering: boolean) => {
    const x = Math.max(0, Math.min(100, m.focusX ?? 50));
    const y = Math.max(0, Math.min(100, m.focusY ?? 50));
    const z = Math.max(1, Math.min(1.5, m.zoom ?? 1.08));
    const pan = m.motion === "left" ? -2 : m.motion === "right" ? 2 : 0;
    const from = m.motion === "out" ? z * 1.08 : z;
    const to = m.motion === "out" ? z : z * 1.08;
    return <div key={m.url + (entering ? "-new" : "-old")} className={`absolute inset-0 ${entering ? "keep-cinematic-fade" : ""}`} style={{ zIndex: entering ? 2 : 1 }}>
      {m.kind === "video" ? <video src={m.url} autoPlay={playing} muted loop playsInline className={`h-full w-full object-cover ${imageClassName}`} style={{ objectPosition: `${x}% ${y}%`, transform: `scale(${z})` }} /> : <img src={m.url} alt="Memory" className={`h-full w-full object-cover ${imageClassName}`} style={{ objectPosition: `${x}% ${y}%`, transformOrigin: `${x}% ${y}%`, animation: playing ? `keep-cinematic-move ${Math.max(3, duration)}s ease-in-out both` : undefined, ["--keep-from" as string]: `translateX(${-pan}%) scale(${from})`, ["--keep-to" as string]: `translateX(${pan}%) scale(${to})` }} />}
    </div>;
  };
  return <div className={`relative overflow-hidden ${className}`}>
    <style>{`@keyframes keep-cinematic-move {from {transform:var(--keep-from)} to {transform:var(--keep-to)}} @keyframes keep-cinematic-fade {from {opacity:0} to {opacity:1}} .keep-cinematic-fade {animation:keep-cinematic-fade 1.25s ease-in-out both} @media (prefers-reduced-motion:reduce) {.keep-cinematic-fade {animation-duration:.15s!important} [style*="keep-cinematic-move"] {animation:none!important}}`}</style>
    {previous && render(previous, false)}
    {render(current, true)}
  </div>;
}