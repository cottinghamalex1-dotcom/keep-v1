import { useRef, useState } from "react";
import { ArrowLeft, Maximize, Play, Volume2 } from "lucide-react";
import { enterKeepFullscreen, leaveKeepFullscreen } from "@/lib/keep-fullscreen";

/**
 * A completed Shotstack file has the opening dedication, transitions, music,
 * captions, narration and farewell already mixed in. Do not layer another
 * audio player or timed captions over the native video.
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
  const [playing, setPlaying] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const start = () => {
    const element = video.current;
    if (!element) return;
    void element.play().then(() => { setBlocked(false); setPlaying(true); })
      .catch(() => { setBlocked(true); setPlaying(false); });
  };
  return <div className="relative keep-h-screen w-full overflow-hidden bg-[#171311] text-[#F5EDE5]">
    <video
      ref={video} src={videoUrl} controls playsInline autoPlay preload="auto"
      className="absolute inset-0 size-full bg-[#171311] object-contain"
      aria-label="Your finished Keep film"
      onLoadedData={onOpeningFrameReady}
      onPlay={() => { setPlaying(true); setBlocked(false); }}
      onPause={() => setPlaying(false)}
      onEnded={onFinish}
      onError={onPlaybackError}
    />
    <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between bg-gradient-to-b from-black/65 to-transparent px-5 pb-16 pt-[max(22px,env(safe-area-inset-top))]">
      <button type="button" onClick={() => { leaveKeepFullscreen(); onExit(); }}
        className="pointer-events-auto flex size-11 items-center justify-center rounded-full border border-white/20 bg-black/45"
        aria-label="Back to experiences"><ArrowLeft size={20}/></button>
      <span className="pt-1 text-lg font-display">Keep</span>
      <button type="button" onClick={() => enterKeepFullscreen()}
        className="pointer-events-auto flex size-11 items-center justify-center rounded-full border border-white/20 bg-black/45"
        aria-label="Enter fullscreen"><Maximize size={20}/></button>
    </div>
    {!playing && <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <button type="button" className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/40 bg-black/70 px-6 py-4 text-sm"
        onClick={start} aria-label="Play your Keep"><Play size={20} fill="currentColor" />
        {blocked ? "Tap to start your Keep" : "Play your Keep"}
        {blocked && <Volume2 size={16}/>}
      </button>
    </div>}
  </div>;
}
