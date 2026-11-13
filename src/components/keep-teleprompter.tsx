import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";

type Props = {
  text: string;
  label: string;
  speaker: string;
  isRecording: boolean;
  isPaused: boolean;
  elapsed: number;
};

/**
 * One premium reading surface shared by solo and multi-person recording.
 * Scroll only the script, not the record controls or status indicator.
 */
export function KeepTeleprompter({ text, label, speaker, isRecording, isPaused, elapsed }: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const previousRecording = useRef(false);
  const [speed, setSpeed] = useState(1);
  const [following, setFollowing] = useState(true);
  const [rehearsing, setRehearsing] = useState(false);
  const moving = (isRecording && !isPaused) || (!isRecording && rehearsing);

  useEffect(() => {
    if (isRecording && !previousRecording.current) {
      // A new take starts from the first line, including after rehearsing.
      if (viewport.current) viewport.current.scrollTop = 0;
      setFollowing(true);
      setRehearsing(false);
    }
    previousRecording.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    if (!moving || !following) return;
    let raf = 0;
    let last = 0;
    const wordCount = Math.max(1, (text.match(/\S+/gu) ?? []).length);
    // A natural speaking pace provides a useful starting speed. The creator
    // can slow down, speed up, pause following, or scroll with a finger.
    const suggestedSeconds = Math.max(8, wordCount / 165 * 60);
    const tick = (now: number) => {
      const element = viewport.current;
      if (element && last) {
        const seconds = Math.min(0.1, Math.max(0, (now - last) / 1000));
        const distance = Math.max(0, element.scrollHeight - element.clientHeight);
        const pixelsPerSecond = Math.max(9, Math.min(55, distance / suggestedSeconds));
        element.scrollTop = Math.min(distance, element.scrollTop + seconds * pixelsPerSecond * speed);
      }
      last = now;
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [moving, following, speed, text]);

  const restart = () => {
    if (viewport.current) viewport.current.scrollTop = 0;
    setFollowing(true);
  };
  const beginRehearsal = () => {
    if (rehearsing) {
      setRehearsing(false);
    } else {
      restart();
      setRehearsing(true);
    }
  };
  const timeLabel = String(Math.floor(elapsed / 60)).padStart(2, "0") + ":" + String(Math.floor(elapsed % 60)).padStart(2, "0");

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[24px] border border-[#D7C8B8] bg-[#FAF6EF] text-[#211D19] shadow-[0_8px_30px_rgba(64,46,25,.06)]" aria-label="Recording teleprompter">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[#E5D9CB] px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-[.13em] text-[#8A6D52]">{label}</span>
          <span className="max-w-[120px] truncate rounded-full bg-[#E8DAC8] px-2.5 py-1 text-[11px] font-medium text-[#33291F]">{speaker}</span>
        </div>
        {isRecording ? (
          <span className={isPaused ? "flex items-center gap-2 rounded-full bg-[#F2E5C8] px-3 py-2 text-[11px] font-bold tabular-nums text-[#7D5D1E]" : "flex items-center gap-2 rounded-full bg-[#FBE1DB] px-3 py-2 text-[11px] font-bold tabular-nums text-[#9C3027]"} aria-label={isPaused ? "Recording paused" : "Recording in progress"}>
            <span aria-hidden="true" className={isPaused ? "size-2 rounded-sm bg-[#B88B37]" : "size-2 animate-pulse rounded-full bg-[#B53A2E]"} />
            {isPaused ? "PAUSED" : "RECORDING"} <span>{timeLabel}</span>
          </span>
        ) : rehearsing ? (
          <span className="rounded-full bg-[#E8DAC8] px-3 py-2 text-[11px] font-semibold text-[#6A5849]">PRACTICE · NOT RECORDING</span>
        ) : (
          <span className="rounded-full border border-[#DED1C2] px-3 py-2 text-[11px] text-[#6D5B4A]">Ready to record</span>
        )}
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div ref={viewport} tabIndex={0} aria-label="Teleprompter script. Swipe to adjust your reading position." onTouchStart={() => { if (moving) setFollowing(false); }} onWheel={() => { if (moving) setFollowing(false); }} onKeyDown={event => { if (["ArrowUp", "ArrowDown", "PageUp", "PageDown"].includes(event.key) && moving) setFollowing(false); }}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-6 pb-20 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#B69B7B] sm:px-8 sm:pt-8">
          <p className="whitespace-pre-wrap font-display text-[clamp(25px,6.5vw,36px)] leading-[1.46] tracking-[-.018em]">{text}</p>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-[#FAF6EF] to-transparent" aria-hidden="true" />
      </div>

      <div className="shrink-0 border-t border-[#E5D9CB] bg-[#F5EEE4] px-3 py-2.5 sm:px-5">
        <div className="flex items-center justify-between gap-2">
          <button type="button" className="min-h-10 rounded-lg px-3 text-xs font-medium text-[#5D4C3A] disabled:opacity-35" disabled={speed <= 0.6} onClick={() => setSpeed(value => Math.max(0.6, Math.round((value - 0.2) * 10) / 10))}>Slower</button>
          <div className="text-center">
            <span className="block text-[9px] font-semibold uppercase tracking-[.15em] text-[#8C7965]">Teleprompter speed</span>
            <span className="text-sm font-semibold tabular-nums text-[#30251C]">{speed.toFixed(1)}×</span>
          </div>
          <button type="button" className="min-h-10 rounded-lg px-3 text-xs font-medium text-[#5D4C3A] disabled:opacity-35" disabled={speed >= 2.0} onClick={() => setSpeed(value => Math.min(2, Math.round((value + 0.2) * 10) / 10))}>Faster</button>
        </div>
        {isRecording ? (
          <button type="button" onClick={() => setFollowing(value => !value)} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#DED0BE] bg-[#FFF9F2] px-4 text-xs font-medium text-[#4C3A2B]">
            {following ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            {following ? "Pause auto-scroll" : "Resume auto-scroll"}
          </button>
        ) : (
          <div className="flex gap-2">
            <button type="button" onClick={beginRehearsal} className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-[#DED0BE] bg-[#FFF9F2] px-3 text-xs font-medium text-[#4C3A2B]">
              {rehearsing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              {rehearsing ? "Pause practice" : "Practice scrolling"}
            </button>
            <button type="button" onClick={restart} aria-label="Back to beginning of script" className="flex min-h-10 items-center justify-center gap-1 rounded-lg border border-[#DED0BE] px-3 text-xs text-[#4C3A2B]"><RotateCcw className="size-3.5" /> Start over</button>
          </div>
        )}
      </div>
    </section>
  );
}
