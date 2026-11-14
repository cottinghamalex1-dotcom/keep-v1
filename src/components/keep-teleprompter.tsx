import { useEffect, useRef, useState } from "react";
import { Minus, Plus, Pause, Play, RotateCcw } from "lucide-react";

type Props = {
  text: string;
  label: string;
  speaker: string;
  isRecording: boolean;
  isPaused: boolean;
  elapsed: number;
  cameraStream?: MediaStream | null;
};

/**
 * One premium reading surface shared by solo and multi-person recording.
 * Scroll only the script, not the record controls or status indicator.
 */
export function KeepTeleprompter({ text, label, speaker, isRecording, isPaused, elapsed, cameraStream }: Props) {
  const camera=useRef<HTMLVideoElement>(null);
  useEffect(()=>{
    const node=camera.current;
    if(!node)return;
    node.srcObject=cameraStream??null;
    if(cameraStream)void node.play().catch(()=>undefined);
    return ()=>{if(node.srcObject===cameraStream)node.srcObject=null;};
  },[cameraStream]);
  const filming=!!cameraStream;
  const viewport = useRef<HTMLDivElement>(null);
  const previousRecording = useRef(false);
  // Keep fractional scroll progress: mobile Safari rounds scrollTop to whole pixels,
  // so reading it back every animation frame can leave auto-scroll stuck at zero.
  const scrollTarget = useRef(0);
  const lastAppliedScroll = useRef(0);
  const resetScroll = () => {
    scrollTarget.current = 0;
    lastAppliedScroll.current = 0;
    if (viewport.current) viewport.current.scrollTop = 0;
  };
  const [speed, setSpeed] = useState(1);
  const [following, setFollowing] = useState(true);
  const [rehearsing, setRehearsing] = useState(false);
  const moving = (isRecording && !isPaused) || (!isRecording && rehearsing);

  useEffect(() => {
    if (isRecording && !previousRecording.current) {
      // A new take starts from the first line, including after rehearsing.
      resetScroll();
      setFollowing(true);
      setRehearsing(false);
    }
    previousRecording.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    if (!moving || !following) return;
    let raf = 0;
    let last = 0;
    scrollTarget.current = viewport.current?.scrollTop ?? 0;
    lastAppliedScroll.current = scrollTarget.current;
    const wordCount = Math.max(1, (text.match(/\S+/gu) ?? []).length);
    // A natural speaking pace provides a useful starting speed. The creator
    // can slow down, speed up, pause following, or scroll with a finger.
    const suggestedSeconds = Math.max(8, wordCount / 175 * 60);
    const tick = (now: number) => {
      const element = viewport.current;
      if (element) {
        // If the creator scrolls with a finger, follow from their new position.
        if (Math.abs(element.scrollTop - lastAppliedScroll.current) > 2) {
          scrollTarget.current = element.scrollTop;
        }
        if (last) {
          const seconds = Math.min(0.1, Math.max(0, (now - last) / 1000));
          const distance = Math.max(0, element.scrollHeight - element.clientHeight);
          const pixelsPerSecond = distance / suggestedSeconds;
          // Accumulate subpixel progress instead of repeatedly adding less than
          // one pixel to Safari's rounded scrollTop (which otherwise never moves).
          scrollTarget.current = Math.min(distance, scrollTarget.current + seconds * pixelsPerSecond * speed);
          element.scrollTop = scrollTarget.current;
          lastAppliedScroll.current = element.scrollTop;
        }
      }
      last = now;
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [moving, following, speed, text]);

  const restart = () => {
    resetScroll();
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
    <section className={`grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-[24px] border shadow-[0_8px_30px_rgba(64,46,25,.06)] ${filming?"border-[#75675B] bg-[#151311] text-white":"border-[#D7C8B8] bg-[#FAF6EF] text-[#211D19]"}`} aria-label={filming?"Selfie video recording teleprompter":"Recording teleprompter"}>
      <div className={`relative z-20 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-6 ${filming?"border-white/20 bg-[#211D19]":"border-[#E5D9CB]"}`}>
        <div className="flex min-w-0 items-center gap-2">
          <span className={`text-[10px] font-semibold uppercase tracking-[.13em] ${filming?"text-[#E3CEB0]":"text-[#8A6D52]"}`}>{label}</span>
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

      <div className="relative isolate min-h-0 overflow-hidden">
        {filming && <>
          <video ref={camera} muted playsInline autoPlay aria-label="Live front camera preview"
            className="pointer-events-none absolute inset-0 h-full w-full scale-x-[-1] object-cover" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/30 via-black/35 to-black/75" />
          <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex justify-center">
            <span className="rounded-full border border-white/25 bg-black/40 px-3 py-1.5 text-[10px] font-semibold tracking-[.06em] text-white backdrop-blur-md">FRONT CAMERA · LOOK INTO THE LENS</span>
          </div>
        </>}
        <div ref={viewport} tabIndex={0} aria-label="Auto-scrolling teleprompter script"
          className="relative z-10 h-full min-h-0 overflow-y-auto overscroll-contain px-5 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#B69B7B] sm:px-8"
          style={{ WebkitOverflowScrolling: "touch", paddingTop: filming ? "clamp(72px, 13dvh, 110px)" : "clamp(44px, 9dvh, 84px)", paddingBottom: "clamp(90px, 18dvh, 160px)" }}>
          <p className={`whitespace-pre-wrap font-display tracking-[-.018em] ${filming?"text-[clamp(22px,5.2vw,29px)] leading-[1.42] text-white [text-shadow:0_2px_12px_rgba(0,0,0,.9)]":"text-[clamp(24px,5.8vw,33px)] leading-[1.45]"}`}>{text}</p>
        </div>
        <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t to-transparent ${filming?"from-[#151311]":"from-[#FAF6EF]"}`} aria-hidden="true" />
      </div>

      <div className="relative z-20 shrink-0 border-t border-[#E5D9CB] bg-[#F5EEE4] px-3 py-2.5 sm:px-5">
        <p role="status" className="mb-2 text-center text-[10px] font-semibold tracking-[.07em] text-[#6A5849]">
          {isRecording ? (isPaused ? "Recording paused · Auto-scroll will resume with recording" : following ? "● AUTO-SCROLLING" : "Auto-scroll paused") :
            rehearsing ? "● PRACTICE AUTO-SCROLLING" : "Words scroll automatically when recording starts"}
        </p>
        <div className="mb-2 flex items-center justify-between gap-2">
          <button type="button" aria-label="Slower teleprompter scrolling" className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#BCA88F] bg-[#FFFDF8] px-3 text-[12px] font-semibold text-[#48382A] shadow-[0_2px_5px_rgba(43,30,18,.08)] transition-colors hover:bg-[#ECE1D2] active:bg-[#E8D9C7] disabled:cursor-not-allowed disabled:opacity-35" disabled={speed <= 0.6} onClick={() => setSpeed(value => Math.max(0.6, Math.round((value - 0.2) * 10) / 10))}><Minus className="size-4" /> Slower</button>
          <div className="min-w-[66px] text-center">
            <span className="block text-[9px] font-semibold uppercase tracking-[.11em] text-[#8C7965]">Speed</span>
            <span className="text-sm font-semibold tabular-nums text-[#30251C]">{speed.toFixed(1)}×</span>
          </div>
          <button type="button" aria-label="Faster teleprompter scrolling" className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#BCA88F] bg-[#FFFDF8] px-3 text-[12px] font-semibold text-[#48382A] shadow-[0_2px_5px_rgba(43,30,18,.08)] transition-colors hover:bg-[#ECE1D2] active:bg-[#E8D9C7] disabled:cursor-not-allowed disabled:opacity-35" disabled={speed >= 2.0} onClick={() => setSpeed(value => Math.min(2, Math.round((value + 0.2) * 10) / 10))}>Faster <Plus className="size-4" /></button>
        </div>
        {isRecording ? (
          <button type="button" disabled={isPaused} onClick={() => setFollowing(value => !value)} className="flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-[#DED0BE] bg-[#FFF9F2] px-4 text-xs font-medium text-[#4C3A2B] disabled:cursor-not-allowed disabled:opacity-55">
            {following ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            {isPaused ? "Scrolling paused with recording" : following ? "Pause auto-scroll" : "Resume auto-scroll"}
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
