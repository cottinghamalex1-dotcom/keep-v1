import { useRef, useState } from "react";
import { ArrowLeft, Maximize, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { enterKeepFullscreen, leaveKeepFullscreen } from "@/lib/keep-fullscreen";

/** Format real media timestamps for the accessible film scrubber. */
export function formatKeepPlaybackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const remaining = String(whole % 60).padStart(2, "0");
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${remaining}` : `${minutes}:${remaining}`;
}

/**
 * Shotstack MP4 contains the entire intro, dedication, story, narration,
 * captions, music, and outro. All seek points refer to this single MP4;
 * do not layer separate browser-timed tracks over a rendered film.
 */
export function KeepRenderedPlayer({
  videoUrl, onExit, onFinish, onOpeningFrameReady, onPlaybackError,
}: {
  videoUrl: string;
  onExit: () => void;
  onFinish: () => void;
  onOpeningFrameReady: () => void;
  onPlaybackError: () => void;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const scrubbing = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [scrubTime, setScrubTime] = useState(0);

  const start = () => {
    const element = video.current;
    if (!element) return;
    void element.play().then(() => {
      setBlocked(false);
      setPlaying(true);
    }).catch(() => {
      setBlocked(true);
      setPlaying(false);
    });
  };
  const togglePlay = () => {
    const element = video.current;
    if (!element) return;
    if (element.paused) start();
    else element.pause();
  };
  const syncDuration = (element: HTMLVideoElement) => {
    if (Number.isFinite(element.duration) && element.duration > 0)
      setDuration(element.duration);
  };
  const syncTime = (element: HTMLVideoElement) => {
    if (!scrubbing.current && Number.isFinite(element.currentTime)) {
      setCurrentTime(element.currentTime);
      setScrubTime(element.currentTime);
    }
  };
  const seekTo = (time: number) => {
    const element = video.current;
    if (!element || !Number.isFinite(duration) || duration <= 0) return;
    const next = Math.max(0, Math.min(duration, time));
    if (!Number.isFinite(next)) return;
    element.currentTime = next;
    setCurrentTime(next);
    setScrubTime(next);
  };
  const toggleMute = () => {
    const element = video.current;
    if (!element) return;
    const next = !element.muted;
    element.muted = next;
    setMuted(next);
  };
  const activeTime = scrubbing.current ? scrubTime : currentTime;
  const progress = duration > 0 ? Math.min(100, Math.max(0, activeTime / duration * 100)) : 0;

  return <div className="relative keep-h-screen w-full overflow-hidden bg-[#171311] text-[#F5EDE5]">
    <video
      ref={video} src={videoUrl} playsInline autoPlay preload="auto"
      className="absolute inset-0 size-full bg-[#171311] object-contain"
      aria-label="Your finished Keep film"
      onLoadedMetadata={(event) => syncDuration(event.currentTarget)}
      onDurationChange={(event) => syncDuration(event.currentTarget)}
      onLoadedData={onOpeningFrameReady}
      onTimeUpdate={(event) => syncTime(event.currentTarget)}
      onSeeked={(event) => syncTime(event.currentTarget)}
      onPlay={() => { setPlaying(true); setBlocked(false); }}
      onPause={() => setPlaying(false)}
      onEnded={onFinish}
      onError={onPlaybackError}
    />
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-start justify-between bg-gradient-to-b from-black/65 to-transparent px-5 pb-16 pt-[max(22px,env(safe-area-inset-top))]">
      <button type="button" onClick={() => { leaveKeepFullscreen(); onExit(); }}
        className="pointer-events-auto flex size-11 items-center justify-center rounded-full border border-white/20 bg-black/45"
        aria-label="Back to experiences"><ArrowLeft size={20}/></button>
      <span className="pt-1 text-lg font-display">Keep</span>
      <button type="button" onClick={() => enterKeepFullscreen()}
        className="pointer-events-auto flex size-11 items-center justify-center rounded-full border border-white/20 bg-black/45"
        aria-label="Enter fullscreen"><Maximize size={20}/></button>
    </div>
    {blocked && <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
      <button type="button" className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/40 bg-black/70 px-6 py-4 text-sm"
        onClick={start} aria-label="Tap to play your Keep">
        <Play size={20} fill="currentColor" /> Tap to start your Keep
      </button>
    </div>}
    <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/90 via-black/55 to-transparent px-5 pb-[max(16px,env(safe-area-inset-bottom))] pt-16 sm:px-7"
      aria-label="Keep playback controls">
      <div className="flex min-h-11 items-center gap-3">
        <span className="w-11 shrink-0 text-right text-xs tabular-nums text-white/90" aria-label="Elapsed playback time">{formatKeepPlaybackTime(activeTime)}</span>
        <label className="flex min-h-11 min-w-0 flex-1 items-center" aria-label="Seek through your Keep">
          <input type="range" min="0" max={duration || 0} step="0.1"
            value={Math.min(scrubTime, duration || 0)} disabled={!duration}
            aria-label="Seek through your Keep"
            aria-valuetext={`${formatKeepPlaybackTime(activeTime)} of ${formatKeepPlaybackTime(duration)}`}
            onPointerDown={() => { scrubbing.current = true; }}
            onPointerUp={(event) => {
              scrubbing.current = false;
              seekTo(Number(event.currentTarget.value));
            }}
            onPointerCancel={() => { scrubbing.current = false; setScrubTime(currentTime); }}
            onTouchEnd={(event) => {
              if (scrubbing.current) {
                scrubbing.current = false;
                seekTo(Number(event.currentTarget.value));
              }
            }}
            onChange={(event) => {
              const next = Number(event.currentTarget.value);
              if (!Number.isFinite(next)) return;
              setScrubTime(next);
              if (!scrubbing.current) seekTo(next);
            }}
            className="h-11 w-full cursor-pointer appearance-none bg-transparent accent-[#F5EDE5] touch-none disabled:opacity-40
              [&::-webkit-slider-runnable-track]:h-[5px] [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-transparent
              [&::-webkit-slider-thumb]:-mt-[8px] [&::-webkit-slider-thumb]:size-[21px]
              [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white
              [&::-webkit-slider-thumb]:bg-[#F5EDE5] [&::-webkit-slider-thumb]:shadow-lg
              [&::-moz-range-track]:h-[5px] [&::-moz-range-track]:bg-transparent
              [&::-moz-range-thumb]:size-[21px] [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white
              [&::-moz-range-thumb]:bg-[#F5EDE5]"
            style={{ background: `linear-gradient(to right, #F5EDE5 ${progress}%, #FFFFFF55 ${progress}%) center / 100% 5px no-repeat` }}
          />
        </label>
        <span className="w-11 shrink-0 text-left text-xs tabular-nums text-white/90" aria-label="Total film duration">{formatKeepPlaybackTime(duration)}</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <button type="button" onClick={togglePlay}
          className="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full border border-white/25 bg-black/40 px-4 text-sm"
          aria-label={playing ? "Pause your Keep" : "Play your Keep"}>
          {playing ? <Pause size={19} fill="currentColor" /> : <Play size={19} fill="currentColor" />}
          <span>{playing ? "Pause" : "Play"}</span>
        </button>
        <button type="button" onClick={toggleMute}
          className="flex size-11 items-center justify-center rounded-full border border-white/25 bg-black/40"
          aria-label={muted ? "Unmute Keep" : "Mute Keep"}>
          {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
        </button>
      </div>
    </div>
  </div>;
}
