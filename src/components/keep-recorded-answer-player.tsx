import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";

type Props = { src: string; durationSec?: number };
const validDuration = (value?: number) => Number.isFinite(value) && (value ?? 0) > 0 ? value! : 0;

function timeLabel(seconds: number) {
  const total = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

/** A compact, native-media-backed player for the guided interview. */
export function KeepRecordedAnswerPlayer({ src, durationSec }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [measuredDuration, setMeasuredDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState(false);
  const duration = measuredDuration || validDuration(durationSec);
  const elapsed = duration ? Math.min(position, duration) : position;
  const progress = duration ? Math.min(100, elapsed / duration * 100) : 0;

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      // Leaving the question or switching to typing must stop its playback.
      audio?.pause();
    };
  }, []);

  const syncPlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (validDuration(audio.duration)) setMeasuredDuration(audio.duration);
    if (Number.isFinite(audio.currentTime)) setPosition(audio.currentTime);
  };

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    setError(false);
    try {
      if (audio.ended || finished) {
        audio.currentTime = 0;
        setPosition(0);
        setFinished(false);
      }
      await audio.play();
    } catch {
      setPlaying(false);
      setError(true);
    }
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio || !duration || !Number.isFinite(value)) return;
    try {
      const next = Math.max(0, Math.min(duration, value));
      audio.currentTime = next;
      setPosition(next);
      setFinished(false);
    } catch { /* Some mobile recordings are not seekable until metadata loads. */ }
  };

  return <section className="keep-answer-player" aria-label="Your recorded answer">
    <audio ref={audioRef} src={src} preload="metadata" hidden
      onLoadedMetadata={syncPlayback} onDurationChange={syncPlayback}
      onTimeUpdate={syncPlayback} onSeeked={syncPlayback}
      onPlay={() => { setPlaying(true); setFinished(false); setError(false); }}
      onPause={() => setPlaying(false)}
      onEnded={() => { syncPlayback(); setPlaying(false); setFinished(true); }}
      onError={() => { setPlaying(false); setError(true); }} />
    <button type="button" className="keep-answer-player__play"
      aria-label={playing ? "Pause recorded answer" : finished ? "Replay recorded answer" : "Play recorded answer"}
      onClick={() => void toggle()}>
      {playing ? <Pause aria-hidden="true" fill="currentColor" strokeWidth={1.5} />
        : finished ? <RotateCcw aria-hidden="true" strokeWidth={1.8} />
        : <Play aria-hidden="true" fill="currentColor" strokeWidth={1.5} />}
    </button>
    <div className="keep-answer-player__content">
      <div className="keep-answer-player__heading">
        <span className="keep-answer-player__title">Your recorded answer</span>
        <span className="keep-answer-player__time" aria-hidden="true">{timeLabel(elapsed)} <span>/</span> {duration ? timeLabel(duration) : "—:—"}</span>
      </div>
      <input type="range" className="keep-answer-player__range"
        aria-label="Recorded answer playback position"
        aria-valuetext={`${timeLabel(elapsed)} of ${duration ? timeLabel(duration) : "unknown duration"}`}
        min={0} max={duration || 1} step={0.01} value={elapsed}
        disabled={!duration}
        style={{ "--keep-answer-progress": `${progress}%` } as CSSProperties}
        onChange={event => seek(Number(event.target.value))} />
      {error && <p role="status" className="keep-answer-player__error">Playback was unavailable. Tap play to try again.</p>}
    </div>
  </section>;
}
