import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Music2, Pause, Play, X } from "lucide-react";
import type { PlayerMedia } from "@/components/keep-player";
import { MUSIC_FILES } from "@/lib/keep-audio";

type Props = {
  media: PlayerMedia[];
  musicMood: string;
  onClose: () => void;
};

/** A quiet, stay-as-long-as-you-like gallery over the existing recipient page. */
export function KeepMemoryGallery({ media, musicMood, onClose }: Props) {
  const [index, setIndex] = useState(0);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicError, setMusicError] = useState(false);
  const soundtrack = useRef<HTMLAudioElement>(null);
  const touchStart = useRef<number | null>(null);
  const track = MUSIC_FILES[musicMood === "Worth Keeping" ? "Intentional" : musicMood] ?? MUSIC_FILES["Warm + Nostalgic"];
  const selected = media[index];

  useEffect(() => { if (soundtrack.current) soundtrack.current.volume = 0.4; }, []);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") setIndex(current => Math.min(media.length - 1, current + 1));
      if (event.key === "ArrowLeft") setIndex(current => Math.max(0, current - 1));
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      soundtrack.current?.pause();
    };
  }, [media.length, onClose]);

  const toggleMusic = async () => {
    const player = soundtrack.current;
    if (!player) return;
    if (!player.paused) { player.pause(); setMusicPlaying(false); return; }
    try { await player.play(); setMusicPlaying(true); setMusicError(false); }
    catch { setMusicPlaying(false); setMusicError(true); }
  };

  if (!selected) return null;
  return <div role="presentation" className="fixed inset-0 z-[100] flex items-end justify-center bg-black/75 p-0 backdrop-blur-sm sm:items-center sm:p-5" onClick={onClose}>
    <section role="dialog" aria-modal="true" aria-label="Look through your memories" className="flex h-[min(94dvh,920px)] w-full max-w-[650px] flex-col overflow-hidden rounded-t-[26px] bg-[#F7F5F2] text-[#25201D] shadow-2xl sm:rounded-[26px]" onClick={event => event.stopPropagation()}>
      <header className="flex shrink-0 items-start justify-between gap-4 px-5 pb-4 pt-6 sm:px-7">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#8B7461]">THE MOMENTS</p>
          <h2 className="mt-1 font-display text-[clamp(26px,6vw,36px)] leading-tight">Stay a little longer.</h2>
          <p className="mt-1 text-xs text-[#847669]">Take your time with every photo and video.</p>
        </div>
        <button type="button" aria-label="Close photo gallery" onClick={onClose} className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[#D9D1C8]"><X className="size-5" /></button>
      </header>

      <div className="relative mx-3 flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-2xl bg-[#1C1A18] sm:mx-5"
        onTouchStart={event => { touchStart.current = event.touches[0]?.clientX ?? null; }}
        onTouchEnd={event => {
          const start = touchStart.current;
          const finish = event.changedTouches[0]?.clientX;
          touchStart.current = null;
          if (start === null || finish === undefined || Math.abs(start - finish) < 55) return;
          setIndex(current => Math.max(0, Math.min(media.length - 1, current + (start > finish ? 1 : -1))));
        }}>
        {selected.kind === "video"
          ? <video key={index} src={selected.url} controls playsInline muted preload="metadata" className="h-full max-h-full w-full object-contain" aria-label={"Video memory " + (index + 1)} onLoadedMetadata={event => {
            const clip = event.currentTarget;
            if (selected.videoStartSec) clip.currentTime = Math.min(selected.videoStartSec, Math.max(0, clip.duration - 0.1));
          }} />
          : <img key={index} src={selected.url} alt={"Memory " + (index + 1) + " of " + media.length} className="h-full max-h-full w-full object-contain" />}
        {media.length > 1 && <>
          <button type="button" aria-label="Previous memory" disabled={index === 0} onClick={() => setIndex(i => Math.max(0, i - 1))} className="absolute left-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white disabled:opacity-25"><ChevronLeft className="size-5" /></button>
          <button type="button" aria-label="Next memory" disabled={index === media.length - 1} onClick={() => setIndex(i => Math.min(media.length - 1, i + 1))} className="absolute right-2 top-1/2 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white disabled:opacity-25"><ChevronRight className="size-5" /></button>
        </>}
      </div>

      <div className="shrink-0 px-4 pb-[max(18px,env(safe-area-inset-bottom))] pt-3 sm:px-6">
        <p className="mb-3 text-center text-xs tabular-nums text-[#7D6C5E]" aria-live="polite">Moment {index + 1} of {media.length}</p>
        {media.length > 1 && <div className="thin-scroll mb-4 flex gap-2 overflow-x-auto pb-1" aria-label="Browse the memories">
          {media.map((item, i) => <button key={i} type="button" aria-label={"Go to memory " + (i + 1)} aria-current={i === index ? "true" : undefined}
            onClick={() => setIndex(i)} className={"relative h-14 w-12 shrink-0 overflow-hidden rounded-md border-2 " + (i === index ? "border-[#927961]" : "border-transparent opacity-60")}>
            {item.kind === "image"
              ? <img src={item.url} loading="lazy" alt="" className="h-full w-full object-cover" />
              : <span className="flex h-full w-full items-center justify-center bg-[#292622] text-white"><Play className="size-4" /></span>}
          </button>)}
        </div>}
        <audio ref={soundtrack} src={track} loop preload="none" onPause={() => setMusicPlaying(false)} onPlay={() => setMusicPlaying(true)} />
        <button type="button" disabled={!track} onClick={() => void toggleMusic()} aria-pressed={musicPlaying} className="mx-auto flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#D6CABF] bg-white px-5 py-2.5 text-sm text-[#463A30] disabled:opacity-50">
          {musicPlaying ? <Pause className="size-4" /> : <Music2 className="size-4" />}
          {musicPlaying ? "Pause background music" : "Play background music"}
        </button>
        {musicError && <p role="status" className="mt-2 text-center text-xs text-[#8A4638]">Music couldn’t play. You can still enjoy the memories.</p>}
      </div>
    </section>
  </div>;
}
